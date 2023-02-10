/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  BatchReadWriteRequest,
  BatchReadWriteResponse,
  TypeOperation,
  SystemOperation,
  isResourceNotFoundError
} from '@aws/fhir-works-on-aws-interface';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATCH_WRITE_ITEMS } from '../constants';
import DOCUMENT_STATUS from './documentStatus';
import { DynamoDBConverter, RESOURCE_TABLE } from './dynamoDb';
import DynamoDbHelper from './dynamoDbHelper';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { buildHashKey, DOCUMENT_STATUS_FIELD, DynamoDbUtil } from './dynamoDbUtil';

export interface ItemRequest {
  id: string;
  vid?: number;
  resourceType: string;
  operation: TypeOperation | SystemOperation;
  isOriginalUpdateItem?: boolean;
}

export default class DynamoDbBundleServiceHelper {
  static generateStagingRequests(
    requests: BatchReadWriteRequest[],
    idToVersionId: Record<string, number>,
    tenantId?: string
  ) {
    const deleteRequests: any = [];
    const createRequests: any = [];
    const updateRequests: any = [];
    const readRequests: any = [];

    let newLocks: ItemRequest[] = [];
    let newBundleEntryResponses: BatchReadWriteResponse[] = [];

    requests.forEach((request) => {
      switch (request.operation) {
        case 'create': {
          // Add create request, put it in PENDING
          let id = uuidv4();
          if (request.id) {
            id = request.id;
          }
          const vid = 1;
          const Item = DynamoDbUtil.prepItemForDdbInsert(
            request.resource,
            id,
            vid,
            DOCUMENT_STATUS.PENDING,
            tenantId
          );

          createRequests.push({
            Put: {
              TableName: RESOURCE_TABLE,
              Item: DynamoDBConverter.marshall(Item)
            }
          });
          const { stagingResponse, itemLocked } = this.addStagingResponseAndItemsLocked(request.operation, {
            ...request.resource,
            meta: { ...Item.meta },
            id
          });
          newBundleEntryResponses = newBundleEntryResponses.concat(stagingResponse);
          newLocks = newLocks.concat(itemLocked);
          break;
        }
        case 'update': {
          // Create new entry with status = PENDING
          // When updating a resource, create a new Document for that resource
          const { id } = request.resource;
          const vid = (idToVersionId[id] || 0) + 1;
          const Item = DynamoDbUtil.prepItemForDdbInsert(
            request.resource,
            id,
            vid,
            DOCUMENT_STATUS.PENDING,
            tenantId
          );

          updateRequests.push({
            Put: {
              TableName: RESOURCE_TABLE,
              Item: DynamoDBConverter.marshall(Item)
            }
          });

          const { stagingResponse, itemLocked } = this.addStagingResponseAndItemsLocked(request.operation, {
            ...request.resource,
            meta: { ...Item.meta }
          });
          newBundleEntryResponses = newBundleEntryResponses.concat(stagingResponse);
          newLocks = newLocks.concat(itemLocked);
          break;
        }
        case 'delete': {
          // Mark documentStatus as PENDING_DELETE
          const { id, resourceType } = request;
          const vid = idToVersionId[id];
          deleteRequests.push(
            DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
              DOCUMENT_STATUS.LOCKED,
              DOCUMENT_STATUS.PENDING_DELETE,
              id,
              vid,
              resourceType,
              tenantId
            )
          );
          newBundleEntryResponses.push({
            id,
            vid: vid.toString(),
            operation: request.operation,
            lastModified: new Date().toISOString(),
            resource: {},
            resourceType: request.resourceType
          });
          break;
        }
        case 'read': {
          // Read the latest version with documentStatus = "LOCKED"
          const { id } = request;
          const vid = idToVersionId[id];
          readRequests.push({
            Get: {
              TableName: RESOURCE_TABLE,
              Key: DynamoDBConverter.marshall({
                id: buildHashKey(id, tenantId),
                vid
              })
            }
          });
          newBundleEntryResponses.push({
            id,
            vid: vid.toString(),
            operation: request.operation,
            lastModified: '',
            resource: {},
            resourceType: request.resourceType
          });
          break;
        }
        default: {
          break;
        }
      }
    });

    return {
      deleteRequests,
      createRequests,
      updateRequests,
      readRequests,
      newLocks,
      newStagingResponses: newBundleEntryResponses
    };
  }

  static generateRollbackRequests(bundleEntryResponses: BatchReadWriteResponse[], tenantId?: string) {
    let itemsToRemoveFromLock: { id: string; vid: string; resourceType: string }[] = [];
    let transactionRequests: any = [];
    bundleEntryResponses.forEach((stagingResponse) => {
      switch (stagingResponse.operation) {
        case 'create':
        case 'update': {
          /*
                        DELETE latest record
                        and remove lock entry from lockedItems
                     */
          const { transactionRequest, itemToRemoveFromLock } =
            this.generateDeleteLatestRecordAndItemToRemoveFromLock(
              stagingResponse.resourceType,
              stagingResponse.id,
              stagingResponse.vid,
              tenantId
            );
          transactionRequests = transactionRequests.concat(transactionRequest);
          itemsToRemoveFromLock = itemsToRemoveFromLock.concat(itemToRemoveFromLock);
          break;
        }
        default: {
          // For READ and DELETE we don't need to delete anything, because no new records were made for those
          // requests
          break;
        }
      }
    });

    return { transactionRequests, itemsToRemoveFromLock };
  }

  private static generateDeleteLatestRecordAndItemToRemoveFromLock(
    resourceType: string,
    id: string,
    vid: string,
    tenantId?: string
  ) {
    const transactionRequest = DynamoDbParamBuilder.buildDeleteParam(id, parseInt(vid, 10), tenantId);
    const itemToRemoveFromLock = {
      id,
      vid,
      resourceType
    };

    return { transactionRequest, itemToRemoveFromLock };
  }

  static populateBundleEntryResponseWithReadResult(
    bundleEntryResponses: BatchReadWriteResponse[],
    readResult: any
  ) {
    let index = 0;
    const updatedStagingResponses = bundleEntryResponses;
    for (let i = 0; i < bundleEntryResponses.length; i += 1) {
      const stagingResponse = bundleEntryResponses[i];
      // The first readResult will be the response to the first READ stagingResponse
      if (stagingResponse.operation === 'read') {
        let item = readResult?.Responses[index]?.Item;
        if (item === undefined) {
          throw new Error('Failed to fulfill all READ requests');
        }
        item = DynamoDBConverter.unmarshall(item);
        item = DynamoDbUtil.cleanItem(item);

        stagingResponse.resource = item;
        stagingResponse.lastModified = item?.meta?.lastUpdated ? item.meta.lastUpdated : '';
        updatedStagingResponses[i] = stagingResponse;
        index += 1;
      }
    }
    return updatedStagingResponses;
  }

  private static addStagingResponseAndItemsLocked(operation: TypeOperation, resource: any) {
    const stagingResponse: BatchReadWriteResponse = {
      id: resource.id,
      vid: resource.meta.versionId,
      operation,
      lastModified: resource.meta.lastUpdated,
      resourceType: resource.resourceType,
      resource
    };
    const itemLocked: ItemRequest = {
      id: resource.id,
      vid: parseInt(resource.meta.versionId, 10),
      resourceType: resource.resourceType,
      operation
    };
    if (operation === 'update') {
      itemLocked.isOriginalUpdateItem = false;
    }

    return { stagingResponse, itemLocked };
  }

  private static createBatchResource(createObject: any) {
    const { request, id, vid, tenantId, originalRequestIndex, resourceType } = createObject;
    let { item } = createObject;
    item = DynamoDbUtil.prepItemForDdbInsert(request.resource, id, vid, DOCUMENT_STATUS.AVAILABLE, tenantId);

    const createItem = {
      PutRequest: {
        Item: DynamoDBConverter.marshall(item)
      },
      originalRequestIndex
    };
    const batchReadWriteItem = {
      id,
      vid: item.meta.versionId,
      operation: request.operation,
      lastModified: item.meta.lastUpdated,
      resourceType,
      resource: item
    };

    return { createItem, batchReadWriteItem };
  }

  static async sortBatchRequests(
    requests: BatchReadWriteRequest[],
    dynamoDbHelper: DynamoDbHelper,
    tenantId?: string,
    updateCreateSupported?: boolean
  ) {
    const deleteRequests: any[] = [];
    const createRequests: any[] = [];
    const updateRequests: any[] = [];

    const batchReadWriteResponses: BatchReadWriteResponse[] = [];
    let originalRequestIndex = -1;
    // eslint-disable-next-line no-restricted-syntax
    for (const request of requests) {
      originalRequestIndex += 1;
      let vid = 0;
      let { id } = request;
      const { resourceType, operation } = request;
      let item;
      // we need to query to get the VersionID of the resource for non-create operations

      if (operation === 'create') {
        vid = 1;
        id = request.id ? request.id : uuidv4();
      } else {
        try {
          // eslint-disable-next-line no-await-in-loop
          item = await dynamoDbHelper.getMostRecentUserReadableResource(resourceType, id, tenantId);
          vid = Number(item.resource?.meta.versionId);
        } catch (e: any) {
          // if upsert supported and update operation
          if (updateCreateSupported && operation === 'update' && isResourceNotFoundError(e)) {
            vid = 1;
            id = request.id ? request.id : uuidv4();
            const createObject = {
              item,
              request,
              id,
              vid,
              tenantId,
              originalRequestIndex,
              resourceType
            };
            const { createItem, batchReadWriteItem } = this.createBatchResource(createObject);
            createRequests.push(createItem);
            batchReadWriteResponses.push(batchReadWriteItem);
          } else {
            console.log(`Failed to find resource ${id}`);
            batchReadWriteResponses.push({
              id,
              vid: `${vid}`,
              operation,
              resourceType,
              resource: {},
              lastModified: '',
              error: '404 Not Found'
            });
          }
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      switch (operation) {
        case 'create': {
          const createObject = {
            item,
            request,
            id,
            vid,
            tenantId,
            originalRequestIndex,
            resourceType
          };
          const { createItem, batchReadWriteItem } = this.createBatchResource(createObject);
          createRequests.push(createItem);
          batchReadWriteResponses.push(batchReadWriteItem);
          break;
        }
        case 'update': {
          // increment the vid
          vid += 1;
          item = DynamoDbUtil.prepItemForDdbInsert(
            { ...item?.resource, ...request.resource },
            id,
            vid,
            DOCUMENT_STATUS.AVAILABLE,
            tenantId
          );
          // we create a new version of the resource with an incremented vid
          updateRequests.push({
            PutRequest: {
              Item: DynamoDBConverter.marshall(item)
            },
            originalRequestIndex
          });
          batchReadWriteResponses.push({
            id,
            vid: vid.toString(),
            operation: request.operation,
            lastModified: item.meta.lastUpdated,
            resourceType,
            resource: {}
          });
          break;
        }
        case 'delete': {
          deleteRequests.push({
            Statement: `
                            UPDATE "${RESOURCE_TABLE}"
                            SET "${DOCUMENT_STATUS_FIELD}" = '${DOCUMENT_STATUS.DELETED}'
                            WHERE "id" = '${buildHashKey(id, tenantId)}' AND "vid" = ${vid}
                        `,
            originalRequestIndex
          });
          batchReadWriteResponses.push({
            id,
            vid: vid.toString(),
            operation: request.operation,
            lastModified: new Date().toISOString(),
            resource: {},
            resourceType: request.resourceType
          });
          break;
        }
        case 'read': {
          batchReadWriteResponses.push({
            id,
            vid: vid.toString(),
            operation: request.operation,
            lastModified: '',
            resource: item?.resource,
            resourceType: request.resourceType
          });
          break;
        }
        default:
          break;
      }
    }
    // we cannot do deleteRequests nor updateRequests in a batchwriteitem call, since we use the update api instead of delete
    // hence, we will separate these requests and use batchexecuteStatement to update items in a batch (and
    // we know there are no conflicts since there will only be updates running)
    return {
      deleteRequests,
      writeRequests: [...createRequests, ...updateRequests],
      batchReadWriteResponses
    };
  }

  static async processBatchEditRequests(
    editRequests: any[],
    batchReadWriteResponses: BatchReadWriteResponse[],
    dynamoDb: DynamoDB
  ) {
    const updatedResponses = batchReadWriteResponses;
    for (let i = 0; i < editRequests.length; i += MAX_BATCH_WRITE_ITEMS) {
      const upperLimit = Math.min(i + MAX_BATCH_WRITE_ITEMS, editRequests.length);
      const batch = editRequests.slice(i, upperLimit);
      const statements = batch.map((x) => {
        return { PutRequest: x.PutRequest };
      });
      // eslint-disable-next-line no-await-in-loop
      const batchExecuteResponse = await dynamoDb
        .batchWriteItem({
          RequestItems: {
            [RESOURCE_TABLE]: [...statements]
          }
        })
        .promise();
      batchExecuteResponse.UnprocessedItems?.[RESOURCE_TABLE]?.forEach((item, unprocessedItemIndex) => {
        console.log('Unable to process request: ', item);
        // get the position of the batch element at index in the larger batchReadWriteResponses array
        updatedResponses[batch[unprocessedItemIndex].originalRequestIndex] = {
          ...batchReadWriteResponses[batch[unprocessedItemIndex].originalRequestIndex],
          error: `400 Bad Request` // indicate the request failed due to large size of request
        };
      });
    }
    return updatedResponses;
  }

  static async processBatchDeleteRequests(
    deleteRequests: any[],
    batchReadWriteResponses: BatchReadWriteResponse[],
    dynamoDb: DynamoDB
  ) {
    const updatedResponses = batchReadWriteResponses;
    for (let i = 0; i < deleteRequests.length; i += MAX_BATCH_WRITE_ITEMS) {
      const upperLimit = Math.min(i + MAX_BATCH_WRITE_ITEMS, deleteRequests.length);
      const batch = deleteRequests.slice(i, upperLimit);
      const statements = batch.map((x) => {
        return { Statement: x.Statement };
      });
      // eslint-disable-next-line no-await-in-loop
      const batchExecuteResponse = await dynamoDb
        .batchExecuteStatement({
          Statements: [...statements]
        })
        .promise();
      batchExecuteResponse.Responses?.forEach((response, index) => {
        if (response.Error) {
          console.log('Unable to process request: ', response.Error);
          // get the position of the batch element at index in the larger batchReadWriteResponses array
          updatedResponses[batch[index].originalRequestIndex] = {
            ...batchReadWriteResponses[batch[index].originalRequestIndex],
            error: `${response.Error.Code} ${response.Error.Message}` // indicate the request failed
          };
        }
      });
    }
    return updatedResponses;
  }
}
