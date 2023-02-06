/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
import {
  BatchRequest,
  TransactionRequest,
  BundleResponse,
  BatchReadWriteRequest,
  BatchReadWriteResponse,
  BatchReadWriteErrorType,
  Bundle,
  chunkArray,
  ResourceNotFoundError,
  GenericResponse
} from '@aws/fhir-works-on-aws-interface';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import flatten from 'flat';
import { chunk, set } from 'lodash';
import mapValues from 'lodash/mapValues';

import getComponentLogger from '../loggerBuilder';
import { captureFullUrlParts } from '../regExpressions';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbBundleServiceHelper, { ItemRequest } from './dynamoDbBundleServiceHelper';
import DynamoDbHelper from './dynamoDbHelper';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';

const logger = getComponentLogger();

export class DynamoDbBundleService implements Bundle {
  private readonly MAX_TRANSACTION_SIZE: number = 25;

  private readonly ELAPSED_TIME_WARNING_MESSAGE =
    'Transaction time is greater than max allowed code execution time. Please reduce your bundle size by sending fewer Bundle entries.';

  readonly updateCreateSupported: boolean;

  private dynamoDbHelper: DynamoDbHelper;

  private dynamoDb: DynamoDB;

  private readonly maxExecutionTimeMs: number;

  readonly enableMultiTenancy: boolean;

  private static readonly dynamoDbMaxTransactionBundleSize = 100;

  private readonly maxBatchSize: number;

  private readonly versionedLinks: Record<string, Set<string>> | undefined;

  /**
   *
   * @param dynamoDb
   * @param supportUpdateCreate - support upsert
   * @param maxExecutionTimeMs
   * @param options.enableMultiTenancy - whether or not to enable multi-tenancy. When enabled a tenantId is required for all requests.
   * @param options.versionedLinks Data structure to control for which resourceTypes (key) which references (array of paths) should be modified,
   * so that they point to the current (point in time) version of the referenced resource.
   * For example:
   *  {
   *      "ExplanationOfBenefit": [ "careTeam.reference" ]
   *  }
   * says: for resource type ExplanationOfBenefit, make sure the careTeam.reference url points to the current
   * version of the practitioner resource.
   * For example, that would mean the reference would be corrected to: `{fhirURl}/Practitioner/1234/_history/<vid>`; instead of the default: `{fhirURl}/Practitioner/1234`
   * @param options.maxBatchSize This is to allow for customization of the default max size of a Batch Bundle. By default, this is 750.
   * */
  // Allow Mocking DDB
  constructor(
    dynamoDb: DynamoDB,
    supportUpdateCreate: boolean = false,
    maxExecutionTimeMs?: number,
    {
      enableMultiTenancy = false,
      versionedLinks,
      maxBatchSize = 750
    }: { enableMultiTenancy?: boolean; versionedLinks?: Record<string, string[]>; maxBatchSize?: number } = {}
  ) {
    this.dynamoDbHelper = new DynamoDbHelper(dynamoDb);
    this.dynamoDb = dynamoDb;
    this.updateCreateSupported = supportUpdateCreate;
    this.maxExecutionTimeMs = maxExecutionTimeMs || 26 * 1000;
    this.enableMultiTenancy = enableMultiTenancy;
    this.versionedLinks = mapValues(versionedLinks, (value) => new Set(value));
    this.maxBatchSize = maxBatchSize;
  }

  private assertValidTenancyMode(tenantId?: string) {
    if (this.enableMultiTenancy && tenantId === undefined) {
      throw new Error(
        'This instance has multi-tenancy enabled, but the incoming request is missing tenantId'
      );
    }
    if (!this.enableMultiTenancy && tenantId !== undefined) {
      throw new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId');
    }
  }

  async batch(request: BatchRequest): Promise<BundleResponse> {
    this.assertValidTenancyMode(request.tenantId);
    const { requests, tenantId } = request;
    if (requests.length === 0) {
      return {
        success: true,
        message: 'No requests to process',
        batchReadWriteResponses: []
      };
    }
    if (requests.length > this.maxBatchSize) {
      return {
        success: false,
        errorType: 'USER_ERROR',
        message: `The number of requests exceeds the maximum allowed number of requests (${this.maxBatchSize}). This limit can be configured in the deployment package.`,
        batchReadWriteResponses: []
      };
    }
    const batchRequests = await DynamoDbBundleServiceHelper.sortBatchRequests(
      requests,
      new DynamoDbHelper(this.dynamoDb),
      tenantId,
      this.updateCreateSupported
    );
    try {
      // loop through all requests and send in batches of MAX allowed requests
      batchRequests.batchReadWriteResponses = await DynamoDbBundleServiceHelper.processBatchDeleteRequests(
        batchRequests.deleteRequests,
        batchRequests.batchReadWriteResponses,
        this.dynamoDb
      );

      batchRequests.batchReadWriteResponses = await DynamoDbBundleServiceHelper.processBatchEditRequests(
        batchRequests.writeRequests,
        batchRequests.batchReadWriteResponses,
        this.dynamoDb
      );

      logger.info('Successfully completed batch items');
      return {
        success: true,
        message: 'Successfully processed bundle',
        batchReadWriteResponses: batchRequests.batchReadWriteResponses
      };
    } catch (e) {
      logger.info('Failed to process batch items', e);
      return {
        success: false,
        message: `failed to process bundle ${e}`,
        errorType: 'SYSTEM_ERROR',
        batchReadWriteResponses: batchRequests.batchReadWriteResponses
      };
    }
  }

  async transaction(request: TransactionRequest): Promise<BundleResponse> {
    this.assertValidTenancyMode(request.tenantId);
    const { requests, startTime, tenantId } = request;
    if (requests.length === 0) {
      return {
        success: true,
        message: 'No requests to process',
        batchReadWriteResponses: []
      };
    }

    // 1. Put a lock on all requests
    const lockItemsResponse = await this.lockItems(requests, tenantId);
    const { successfulLock } = lockItemsResponse;
    let { lockedItems } = lockItemsResponse;

    let elapsedTimeInMs = this.getElapsedTime(startTime);
    if (elapsedTimeInMs > this.maxExecutionTimeMs || !successfulLock) {
      await this.unlockItems(lockedItems, true);
      if (elapsedTimeInMs > this.maxExecutionTimeMs) {
        logger.warn(
          'Locks were rolled back because elapsed time is longer than max code execution time. Elapsed time',
          elapsedTimeInMs
        );
        return {
          success: false,
          message: this.ELAPSED_TIME_WARNING_MESSAGE,
          batchReadWriteResponses: [],
          errorType: 'USER_ERROR'
        };
      }
      logger.error('Locks were rolled back because failed to lock resources');
      const { errorType, errorMessage } = lockItemsResponse;
      return {
        success: false,
        message: errorMessage || 'Failed to lock resources for transaction',
        batchReadWriteResponses: [],
        errorType
      };
    }
    if (this.versionedLinks) {
      const wasSuccessful = await this.updatedReferences(requests, lockedItems, tenantId);
      elapsedTimeInMs = this.getElapsedTime(startTime);
      if (elapsedTimeInMs > this.maxExecutionTimeMs || !wasSuccessful) {
        await this.unlockItems(lockedItems, true, tenantId);
        if (elapsedTimeInMs > this.maxExecutionTimeMs) {
          logger.warn(
            'Locks were rolled back because elapsed time is longer than max code execution time. Elapsed time',
            elapsedTimeInMs
          );
          return {
            success: false,
            message: this.ELAPSED_TIME_WARNING_MESSAGE,
            batchReadWriteResponses: [],
            errorType: 'USER_ERROR'
          };
        }
        logger.error('Locks were rolled back because failed to find versions of some resources');
        return {
          success: false,
          message: 'Failed to find some resource versions for transaction',
          batchReadWriteResponses: [],
          errorType: 'USER_ERROR'
        };
      }
    }

    // 2.  Stage resources
    const stageItemResponse = await this.stageItems(requests, lockedItems, tenantId);
    const { batchReadWriteResponses } = stageItemResponse;
    const successfullyStageItems = stageItemResponse.success;
    lockedItems = stageItemResponse.lockedItems;

    elapsedTimeInMs = this.getElapsedTime(startTime);
    if (elapsedTimeInMs > this.maxExecutionTimeMs || !successfullyStageItems) {
      lockedItems = await this.rollbackItems(batchReadWriteResponses, lockedItems, tenantId);
      await this.unlockItems(lockedItems, true, tenantId);

      if (elapsedTimeInMs > this.maxExecutionTimeMs) {
        logger.warn(
          'Rolled changes back because elapsed time is longer than max code execution time. Elapsed time',
          elapsedTimeInMs
        );
        return {
          success: false,
          message: this.ELAPSED_TIME_WARNING_MESSAGE,
          batchReadWriteResponses: [],
          errorType: 'USER_ERROR'
        };
      }
      logger.error('Rolled changes back because staging of items failed');
      return {
        success: false,
        message: 'Failed to stage resources for transaction',
        batchReadWriteResponses: [],
        errorType: 'SYSTEM_ERROR'
      };
    }

    // 3. unlockItems
    await this.unlockItems(lockedItems, false, tenantId);

    return {
      success: true,
      message: 'Successfully committed requests to DB',
      batchReadWriteResponses
    };
  }

  private async lockItems(
    requests: BatchReadWriteRequest[],
    tenantId?: string
  ): Promise<{
    successfulLock: boolean;
    errorType?: BatchReadWriteErrorType;
    errorMessage?: string;
    lockedItems: ItemRequest[];
  }> {
    // We don't need to put a lock on CREATE requests because there are no Documents in the DB for the CREATE
    // request yet
    const allNonCreateRequests = requests.filter((request) => {
      return request.operation !== 'create';
    });

    const itemsToLock: ItemRequest[] = allNonCreateRequests.map((request) => {
      return {
        resourceType: request.resourceType,
        id: request.id,
        operation: request.operation
      };
    });

    if (itemsToLock.length > DynamoDbBundleService.dynamoDbMaxTransactionBundleSize) {
      const message = `Cannot lock more than ${DynamoDbBundleService.dynamoDbMaxTransactionBundleSize} items`;
      logger.error(message);
      return Promise.resolve({
        successfulLock: false,
        errorType: 'SYSTEM_ERROR',
        errorMessage: message,
        lockedItems: []
      });
    }

    logger.info('Locking begins');
    const lockedItems: ItemRequest[] = [];

    // We need to read the items so we can find the versionId of each item
    const itemReadPromises = itemsToLock.map(async (itemToLock) => {
      const projectionExpression = 'id, resourceType, meta';
      try {
        return await this.dynamoDbHelper.getMostRecentResource(
          itemToLock.resourceType,
          itemToLock.id,
          projectionExpression,
          tenantId
        );
      } catch (e) {
        if (e instanceof ResourceNotFoundError) {
          return e;
        }
        throw e;
      }
    });
    const itemResponses = await Promise.all(itemReadPromises);

    const idItemsFailedToRead: string[] = [];
    for (let i = 0; i < itemResponses.length; i += 1) {
      const itemResponse = itemResponses[i];
      // allow for update as create scenario
      if (
        itemResponse instanceof ResourceNotFoundError &&
        !(itemsToLock[i].operation === 'update' && this.updateCreateSupported)
      ) {
        idItemsFailedToRead.push(`${itemsToLock[i].resourceType}/${itemsToLock[i].id}`);
      }
    }
    if (idItemsFailedToRead.length > 0) {
      return Promise.resolve({
        successfulLock: false,
        errorType: 'USER_ERROR',
        errorMessage: `Failed to find resources: ${idItemsFailedToRead}`,
        lockedItems: []
      });
    }

    const addLockRequests = [];
    for (let i = 0; i < itemResponses.length; i += 1) {
      const itemResponse = itemResponses[i];
      if (itemResponse instanceof ResourceNotFoundError) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const { resourceType, id, meta } = itemResponse.resource;

      const vid = parseInt(meta.versionId, 10);

      const lockedItem: ItemRequest = {
        resourceType,
        id,
        vid,
        operation: allNonCreateRequests[i].operation
      };
      if (lockedItem.operation === 'update') {
        lockedItem.isOriginalUpdateItem = true;
      }
      lockedItems.push(lockedItem);

      addLockRequests.push(
        DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
          DOCUMENT_STATUS.AVAILABLE,
          DOCUMENT_STATUS.LOCKED,
          id,
          vid,
          resourceType,
          tenantId
        )
      );
    }

    const params = {
      TransactItems: addLockRequests
    };

    let itemsLockedSuccessfully: ItemRequest[] = [];
    try {
      if (params.TransactItems.length > 0) {
        const lockRequests = chunk(addLockRequests, this.MAX_TRANSACTION_SIZE).map((items) => {
          return this.dynamoDb
            .transactWriteItems({
              TransactItems: items
            })
            .promise();
        });
        await Promise.all(lockRequests);
        itemsLockedSuccessfully = itemsLockedSuccessfully.concat(lockedItems);
      }
      logger.info('Finished locking');
      return Promise.resolve({
        successfulLock: true,
        lockedItems: itemsLockedSuccessfully
      });
    } catch (e) {
      logger.error('Failed to lock', e);
      if ((e as any).code === 'TransactionCanceledException') {
        return Promise.resolve({
          successfulLock: false,
          errorType: 'CONFLICT_ERROR',
          errorMessage: `Failed to lock resources for transaction due to conflict. Please try again after ${
            DynamoDbParamBuilder.LOCK_DURATION_IN_MS / 1000
          } seconds.`,
          lockedItems: itemsLockedSuccessfully
        });
      }
      return Promise.resolve({
        successfulLock: false,
        errorType: 'SYSTEM_ERROR',
        errorMessage: `Failed to lock resources for transaction. Please try again after ${
          DynamoDbParamBuilder.LOCK_DURATION_IN_MS / 1000
        } seconds.`,
        lockedItems: itemsLockedSuccessfully
      });
    }
  }

  private async updatedReferences(
    requests: BatchReadWriteRequest[],
    lockedItems: ItemRequest[],
    tenantId?: string
  ): Promise<boolean> {
    const idToVersionId: Record<string, string> = {};
    lockedItems.forEach((itemRequest: ItemRequest) => {
      if (itemRequest.operation === 'update' && itemRequest.vid) {
        idToVersionId[`${itemRequest.resourceType}_${itemRequest.id}`] = `${itemRequest.vid + 1}`;
      }
    });

    const createOrUpdates = requests.filter((request: BatchReadWriteRequest) => {
      return request.operation === 'create' || request.operation === 'update';
    });

    requests.forEach((request: BatchReadWriteRequest) => {
      const key = `${request.resourceType}_${request.id}`;
      if (request.operation === 'create') {
        idToVersionId[key] = '1';
      }
      // Setting version id to '1' of resources in the bundle that have not been locked. because
      // if updateCreateSupported==true creates may come disguised as updates. During locking they obviously weren't found
      // now we don't want to search for them again and then fail because we can't find them.
      if (request.operation === 'update' && this.updateCreateSupported && !(key in idToVersionId)) {
        idToVersionId[key] = '1';
      }
    });

    const requestsWithReferencesThatMustBeLookedUp = createOrUpdates
      .filter((request: BatchReadWriteRequest) => {
        const versionedLinksArray = this.versionedLinks?.[request.resourceType];
        return !!versionedLinksArray;
      })
      .flatMap((request: BatchReadWriteRequest) => {
        const { resource } = request;
        const flattened: any = flatten(resource);
        return Object.entries(flattened).map((entry) => {
          return {
            resource: request.resource,
            resourceType: request.resourceType,
            path: entry[0],
            value: entry[1]
          };
        });
      })
      .filter(
        (item) => item.path.endsWith('.reference') && this.versionedLinks?.[item.resourceType].has(item.path)
      );

    const requestsForDDB: {
      resource: any;
      path: string;
      value: string;
      resourceType: string;
      id: string;
    }[] = [];
    requestsWithReferencesThatMustBeLookedUp.forEach((item: any) => {
      const fullUrlMatch = item.value.match(captureFullUrlParts);
      if (!fullUrlMatch) {
        return;
      }
      const resourceType = fullUrlMatch[2];
      const id = fullUrlMatch[3];
      let vid = fullUrlMatch[4];
      if (!vid) {
        const compoundId = `${resourceType}_${id}`;
        if (compoundId in idToVersionId) {
          vid = idToVersionId[compoundId];
          set(item.resource, item.path, `${item.value}/_history/${vid}`);
        } else {
          requestsForDDB.push({
            ...item,
            resourceType,
            id
          });
        }
      }
    });
    const responsesFromDDB: boolean[] = await Promise.all(
      requestsForDDB.map(async (item) => {
        try {
          const itemResponse: GenericResponse = await this.dynamoDbHelper.getMostRecentResource(
            item.resourceType,
            item.id,
            'meta',
            tenantId
          );
          const { meta } = itemResponse.resource;
          set(item.resource, item.path, `${item.value}/_history/${meta.versionId}`);
          return true;
        } catch (e) {
          const msg = `Failed to find most recent version of ${item.resourceType} resource with id=${item.id}`;
          logger.error(msg, e);
          return false;
        }
      })
    );
    return responsesFromDDB.every((item) => item);
  }

  /*
   * Change documentStatus for resources from LOCKED/PENDING to AVAILABLE
   * Change documentStatus for resources from PENDING_DELETE TO DELETED
   * Also change documentStatus for old resource to be DELETED
   *   After a resource has been updated, the original versioned resource should be marked as DELETED
   *   Exp. abcd_1 was updated, and we now have abcd_1 and abcd_2. abcd_1's documentStatus should be DELETED, and abcd_2's documentStatus should be AVAILABLE
   * If rollback === true, rollback PENDING_DELETE to AVAILABLE
   */
  private async unlockItems(
    lockedItems: ItemRequest[],
    rollBack: boolean,
    tenantId?: string
  ): Promise<{ successfulUnlock: boolean; locksFailedToRelease: ItemRequest[] }> {
    if (lockedItems.length === 0) {
      return { successfulUnlock: true, locksFailedToRelease: [] };
    }
    logger.info('Unlocking begins');

    const updateRequests: any[] = lockedItems.map((lockedItem) => {
      let newStatus = DOCUMENT_STATUS.AVAILABLE;
      // If the lockedItem was a result of a delete operation or if the lockedItem was the original version of an item that was UPDATED then
      // set the lockedItem's status to be "DELETED"
      if (
        (lockedItem.operation === 'delete' ||
          (lockedItem.operation === 'update' && lockedItem.isOriginalUpdateItem)) &&
        !rollBack
      ) {
        newStatus = DOCUMENT_STATUS.DELETED;
      }
      return DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
        null,
        newStatus,
        lockedItem.id,
        lockedItem.vid || 0,
        lockedItem.resourceType,
        tenantId
      );
    });

    const updateRequestChunks = chunkArray(updateRequests, this.MAX_TRANSACTION_SIZE);
    const lockedItemChunks = chunkArray(lockedItems, this.MAX_TRANSACTION_SIZE);
    const params = updateRequestChunks.map((requestChunk: any) => {
      return {
        TransactItems: requestChunk
      };
    });

    for (let i = 0; i < params.length; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.dynamoDb.transactWriteItems(params[i]).promise();
      } catch (e) {
        logger.error('Failed to unlock items', e);
        let locksFailedToRelease: ItemRequest[] = [];
        for (let j = i; j < lockedItemChunks.length; j += 1) {
          locksFailedToRelease = locksFailedToRelease.concat(lockedItemChunks[j]);
        }
        return Promise.resolve({ successfulUnlock: false, locksFailedToRelease });
      }
    }
    logger.info('Finished unlocking');
    return Promise.resolve({ successfulUnlock: true, locksFailedToRelease: [] });
  }

  private async rollbackItems(
    batchReadWriteEntryResponses: BatchReadWriteResponse[],
    lockedItems: ItemRequest[],
    tenantId?: string
  ): Promise<ItemRequest[]> {
    logger.info('Starting unstage items');

    const { transactionRequests, itemsToRemoveFromLock } =
      DynamoDbBundleServiceHelper.generateRollbackRequests(batchReadWriteEntryResponses, tenantId);

    const newLockedItems = this.removeLocksFromArray(lockedItems, itemsToRemoveFromLock);

    // if batchReadWriteEntryResponses is empty, don't throw error here, since there is nothing to rollback
    if (batchReadWriteEntryResponses.length === 0) {
      return newLockedItems;
    }
    try {
      const writeRequests = chunk(transactionRequests, this.MAX_TRANSACTION_SIZE).map((items) => {
        // @ts-ignore
        return this.dynamoDb
          .transactWriteItems({
            TransactItems: items
          })
          .promise();
      });
      await Promise.all(writeRequests);
      return newLockedItems;
    } catch (e) {
      logger.error('Failed to unstage items', e);
      return newLockedItems;
    }
  }

  private generateFullId(id: string, vid: string) {
    return `${id}_${vid}`;
  }

  private removeLocksFromArray(
    originalLocks: ItemRequest[],
    locksToRemove: { id: string; vid: string; resourceType: string }[]
  ) {
    const fullIdToLockedItem: Record<string, ItemRequest> = {};
    originalLocks.forEach((lockedItem) => {
      fullIdToLockedItem[this.generateFullId(lockedItem.id, lockedItem.vid?.toString() || '0')] = lockedItem;
    });

    locksToRemove.forEach((itemToRemove) => {
      const fullId = this.generateFullId(itemToRemove.id, itemToRemove.vid);
      if (fullIdToLockedItem[fullId]) {
        delete fullIdToLockedItem[fullId];
      }
    });

    return Object.values(fullIdToLockedItem);
  }

  private async stageItems(requests: BatchReadWriteRequest[], lockedItems: ItemRequest[], tenantId?: string) {
    logger.info('Start Staging of Items');

    const idToVersionId: Record<string, number> = {};
    lockedItems.forEach((idItemLocked: ItemRequest) => {
      idToVersionId[idItemLocked.id] = idItemLocked.vid || 0;
    });

    const { deleteRequests, createRequests, updateRequests, readRequests, newLocks, newStagingResponses } =
      DynamoDbBundleServiceHelper.generateStagingRequests(requests, idToVersionId, tenantId);

    // Order that Bundle specifies
    // https://www.hl7.org/fhir/http.html#trules
    const editRequests: any[] = [...deleteRequests, ...createRequests, ...updateRequests];
    let batchReadWriteResponses: BatchReadWriteResponse[] = [];
    let allLockedItems: ItemRequest[] = lockedItems;
    try {
      if (editRequests.length > 0) {
        const writeChunkRequests = chunk(editRequests, this.MAX_TRANSACTION_SIZE).map((items) => {
          return this.dynamoDb
            .transactWriteItems({
              TransactItems: items
            })
            .promise();
        });
        await Promise.all(writeChunkRequests);
      }

      // Keep track of items successfully staged
      allLockedItems = lockedItems.concat(newLocks);
      batchReadWriteResponses = batchReadWriteResponses.concat(newStagingResponses);

      if (readRequests.length > 0) {
        const readChunkRequests = chunk(readRequests, this.MAX_TRANSACTION_SIZE).map((items) => {
          // @ts-ignore
          return this.dynamoDb
            .transactGetItems({
              TransactItems: items
            })
            .promise();
        });
        const readResults = await Promise.all(readChunkRequests);
        readResults.forEach((readResult) => {
          batchReadWriteResponses = DynamoDbBundleServiceHelper.populateBundleEntryResponseWithReadResult(
            batchReadWriteResponses,
            readResult
          );
        });
      }

      logger.info('Successfully staged items');
      return Promise.resolve({ success: true, batchReadWriteResponses, lockedItems: allLockedItems });
    } catch (e) {
      logger.error('Failed to stage items', e);
      return Promise.resolve({ success: false, batchReadWriteResponses, lockedItems: allLockedItems });
    }
  }

  private getElapsedTime(startTime: Date) {
    return Date.now() - startTime.getTime();
  }
}
