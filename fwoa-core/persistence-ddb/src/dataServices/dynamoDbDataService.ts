/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */

import {
  BatchReadWriteRequest,
  BulkDataAccess,
  BundleResponse,
  clone,
  ConditionalDeleteResourceRequest,
  CreateResourceRequest,
  DeleteResourceRequest,
  ExportJobStatus,
  GenericResponse,
  GetExportStatusResponse,
  InitiateExportRequest,
  InvalidResourceError,
  isResourceNotFoundError,
  PatchResourceRequest,
  Persistence,
  ReadResourceRequest,
  ResourceNotFoundError,
  ResourceVersionNotFoundError,
  TooManyConcurrentExportRequestsError,
  UnauthorizedError,
  UpdateResourceRequest,
  vReadResourceRequest
} from '@aws/fhir-works-on-aws-interface';
import DynamoDB, { ItemList } from 'aws-sdk/clients/dynamodb';
import { difference } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { getBulkExportResults, startJobExecution } from '../bulkExport/bulkExport';
import { BulkExportResultsUrlGenerator } from '../bulkExport/bulkExportResultsUrlGenerator';
import { BulkExportS3PresignedUrlGenerator } from '../bulkExport/bulkExportS3PresignedUrlGenerator';
import { BulkExportJob } from '../bulkExport/types';
import DOCUMENT_STATUS from './documentStatus';
import { DynamoDBConverter } from './dynamoDb';
import { DynamoDbBundleService } from './dynamoDbBundleService';
import DynamoDbHelper from './dynamoDbHelper';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { DynamoDbUtil } from './dynamoDbUtil';

export class DynamoDbDataService implements Persistence, BulkDataAccess {
  private readonly MAXIMUM_SYSTEM_LEVEL_CONCURRENT_REQUESTS = 2;

  private readonly MAXIMUM_CONCURRENT_REQUEST_PER_USER = 1;

  readonly updateCreateSupported: boolean;

  readonly enableMultiTenancy: boolean;

  private readonly transactionService: DynamoDbBundleService;

  private readonly dynamoDbHelper: DynamoDbHelper;

  private readonly dynamoDb: DynamoDB;

  private readonly bulkExportResultsUrlGenerator: BulkExportResultsUrlGenerator;

  /**
   * @param dynamoDb - instance of the aws-sdk DynamoDB client
   * @param supportUpdateCreate - Enables update as create. See https://www.hl7.org/fhir/http.html#upsert
   * @param options
   * @param options.enableMultiTenancy - whether or not to enable multi-tenancy. When enabled a tenantId is required for all requests.
   * @param options.bulkExportResultsUrlGenerator - optionally provide an implementation of bulkExportResultsUrlGenerator to override how the bulk export results URLs are generated.
   * This can be useful if you want to serve export results from a file server instead of directly from s3.
   */
  constructor(
    dynamoDb: DynamoDB,
    supportUpdateCreate: boolean = false,
    {
      enableMultiTenancy = false,
      bulkExportResultsUrlGenerator = new BulkExportS3PresignedUrlGenerator()
    }: { enableMultiTenancy?: boolean; bulkExportResultsUrlGenerator?: BulkExportResultsUrlGenerator } = {}
  ) {
    this.dynamoDbHelper = new DynamoDbHelper(dynamoDb);
    this.transactionService = new DynamoDbBundleService(dynamoDb, supportUpdateCreate, undefined, {
      enableMultiTenancy
    });
    this.dynamoDb = dynamoDb;
    this.updateCreateSupported = supportUpdateCreate;
    this.enableMultiTenancy = enableMultiTenancy;
    this.bulkExportResultsUrlGenerator = bulkExportResultsUrlGenerator;
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

  async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
    this.assertValidTenancyMode(request.tenantId);
    return this.dynamoDbHelper.getMostRecentUserReadableResource(
      request.resourceType,
      request.id,
      request.tenantId
    );
  }

  async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
    this.assertValidTenancyMode(request.tenantId);
    const { resourceType, id, vid, tenantId } = request;
    const params = DynamoDbParamBuilder.buildGetItemParam(id, parseInt(vid, 10), tenantId);
    const result = await this.dynamoDb.getItem(params).promise();
    if (result.Item === undefined) {
      throw new ResourceVersionNotFoundError(resourceType, id, vid);
    }
    let item = DynamoDBConverter.unmarshall(result.Item);
    if (item.resourceType !== resourceType) {
      throw new ResourceVersionNotFoundError(resourceType, id, vid);
    }
    item = DynamoDbUtil.cleanItem(item);
    return {
      message: 'Resource found',
      resource: item
    };
  }

  async createResource(request: CreateResourceRequest) {
    this.assertValidTenancyMode(request.tenantId);
    const { resourceType, resource, tenantId } = request;
    return this.createResourceWithId(resourceType, resource, uuidv4(), tenantId);
  }

  private async createResourceWithId(
    resourceType: string,
    resource: any,
    resourceId: string,
    tenantId?: string
  ) {
    const regex = new RegExp('^[a-zA-Z0-9-.]{1,64}$');
    if (!regex.test(resourceId)) {
      throw new InvalidResourceError('Resource creation failed, id is not valid');
    }

    const vid = 1;
    let resourceClone = clone(resource);
    resourceClone.resourceType = resourceType;

    const param = DynamoDbParamBuilder.buildPutAvailableItemParam(
      resourceClone,
      resourceId,
      vid,
      false,
      tenantId
    );
    try {
      await this.dynamoDb.putItem(param).promise();
    } catch (e) {
      if ((e as any).code === 'ConditionalCheckFailedException') {
        // It is highly unlikely that an autogenerated id will collide with a preexisting id.
        throw new Error('Resource creation failed, id matches an existing resource');
      }
      throw e;
    }
    const item = DynamoDBConverter.unmarshall(param.Item);
    resourceClone = DynamoDbUtil.cleanItem(item);
    return {
      success: true,
      message: 'Resource created',
      resource: resourceClone
    };
  }

  async deleteResource(request: DeleteResourceRequest) {
    this.assertValidTenancyMode(request.tenantId);
    const { resourceType, id, tenantId } = request;
    const itemServiceResponse = await this.readResource({ resourceType, id, tenantId });

    const { versionId } = itemServiceResponse.resource.meta;

    return this.deleteVersionedResource(resourceType, id, parseInt(versionId, 10), tenantId);
  }

  async deleteVersionedResource(resourceType: string, id: string, vid: number, tenantId?: string) {
    const updateStatusToDeletedParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      DOCUMENT_STATUS.AVAILABLE,
      DOCUMENT_STATUS.DELETED,
      id,
      vid,
      resourceType,
      tenantId
    ).Update;
    await this.dynamoDb.updateItem(updateStatusToDeletedParam).promise();
    return {
      success: true,
      message: `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${vid}`
    };
  }

  async updateResource(request: UpdateResourceRequest) {
    this.assertValidTenancyMode(request.tenantId);
    const { resource, resourceType, id, tenantId } = request;
    try {
      // Will throw ResourceNotFoundError if resource can't be found
      await this.readResource({ resourceType, id, tenantId });
    } catch (e) {
      if (this.updateCreateSupported && isResourceNotFoundError(e)) {
        return this.createResourceWithId(resourceType, resource, id, tenantId);
      }
      throw e;
    }
    const resourceClone = clone(resource);
    const batchRequest: BatchReadWriteRequest = {
      operation: 'update',
      resourceType,
      id,
      resource: resourceClone
    };

    // Sending the request to `atomicallyReadWriteResources` to take advantage of LOCKING management handled by
    // that method
    const response: BundleResponse = await this.transactionService.transaction({
      requests: [batchRequest],
      startTime: new Date(),
      tenantId
    });
    const batchReadWriteEntryResponse = response.batchReadWriteResponses[0];
    resourceClone.meta = batchReadWriteEntryResponse.resource.meta;
    return {
      success: true,
      message: 'Resource updated',
      resource: resourceClone
    };
  }

  async initiateExport(initiateExportRequest: InitiateExportRequest): Promise<string> {
    this.assertValidTenancyMode(initiateExportRequest.tenantId);
    await this.throttleExportRequestsIfNeeded(
      initiateExportRequest.requesterUserId,
      initiateExportRequest.tenantId
    );
    // Create new export job
    const exportJob: BulkExportJob = this.buildExportJob(initiateExportRequest);

    await startJobExecution(exportJob);

    const params = DynamoDbParamBuilder.buildPutCreateExportRequest(exportJob, initiateExportRequest);
    await this.dynamoDb.putItem(params).promise();
    return exportJob.jobId;
  }

  async throttleExportRequestsIfNeeded(requesterUserId: string, tenantId?: string) {
    const jobStatusesToThrottle: ExportJobStatus[] = ['canceling', 'in-progress'];
    const exportJobItems = await this.getJobsWithExportStatuses(jobStatusesToThrottle);

    if (exportJobItems) {
      const numberOfConcurrentUserRequest = exportJobItems.filter((item) => {
        return DynamoDBConverter.unmarshall(item).jobOwnerId === requesterUserId;
      }).length;
      let concurrentTenantRequest = exportJobItems;
      if (tenantId) {
        concurrentTenantRequest = exportJobItems.filter((item) => {
          return DynamoDBConverter.unmarshall(item).tenantId === tenantId;
        });
      }
      if (
        numberOfConcurrentUserRequest >= this.MAXIMUM_CONCURRENT_REQUEST_PER_USER ||
        concurrentTenantRequest.length >= this.MAXIMUM_SYSTEM_LEVEL_CONCURRENT_REQUESTS
      ) {
        throw new TooManyConcurrentExportRequestsError();
      }
    }
  }

  async getJobsWithExportStatuses(jobStatuses: ExportJobStatus[]): Promise<ItemList> {
    const jobStatusPromises = jobStatuses.map((jobStatus: ExportJobStatus) => {
      const projectionExpression = 'jobOwnerId, jobStatus';
      const queryJobStatusParam = DynamoDbParamBuilder.buildQueryExportRequestJobStatus(
        jobStatus,
        projectionExpression
      );
      return this.dynamoDb.query(queryJobStatusParam).promise();
    });

    const jobStatusResponses = await Promise.all(jobStatusPromises);
    let allJobStatusItems: ItemList = [];
    jobStatusResponses.forEach((jobStatusResponse: DynamoDB.QueryOutput) => {
      if (jobStatusResponse.Items) {
        allJobStatusItems = allJobStatusItems.concat(jobStatusResponse.Items);
      }
    });
    return allJobStatusItems;
  }

  async cancelExport(jobId: string, tenantId?: string): Promise<void> {
    this.assertValidTenancyMode(tenantId);
    const jobDetailsParam = DynamoDbParamBuilder.buildGetExportRequestJob(jobId, tenantId);
    const jobDetailsResponse = await this.dynamoDb.getItem(jobDetailsParam).promise();
    if (!jobDetailsResponse.Item) {
      throw new ResourceNotFoundError('$export', jobId);
    }
    const jobItem = DynamoDBConverter.unmarshall(jobDetailsResponse.Item);
    if (['completed', 'failed'].includes(jobItem.jobStatus)) {
      throw new Error(`Job cannot be canceled because job is already in ${jobItem.jobStatus} state`);
    }
    // A job in the canceled or canceling state doesn't need to be updated to 'canceling'
    if (['canceled', 'canceling'].includes(jobItem.jobStatus)) {
      return;
    }

    const params = DynamoDbParamBuilder.buildUpdateExportRequestJobStatus(jobId, 'canceling', tenantId);
    await this.dynamoDb.updateItem(params).promise();
  }

  async getExportStatus(jobId: string, tenantId?: string): Promise<GetExportStatusResponse> {
    this.assertValidTenancyMode(tenantId);
    const jobDetailsParam = DynamoDbParamBuilder.buildGetExportRequestJob(jobId, tenantId);
    const jobDetailsResponse = await this.dynamoDb.getItem(jobDetailsParam).promise();
    if (!jobDetailsResponse.Item) {
      throw new ResourceNotFoundError('$export', jobId);
    }

    const item = DynamoDBConverter.unmarshall(<DynamoDB.AttributeMap>jobDetailsResponse.Item);

    const {
      jobStatus,
      jobOwnerId,
      transactionTime,
      exportType,
      outputFormat,
      since,
      type,
      groupId,
      errorArray = [],
      errorMessage = ''
    } = item;

    const results: { requiresAccessToken?: boolean; exportedFileUrls: { type: string; url: string }[] } =
      jobStatus === 'completed'
        ? await getBulkExportResults(this.bulkExportResultsUrlGenerator, jobId, tenantId)
        : { requiresAccessToken: undefined, exportedFileUrls: [] };

    const getExportStatusResponse: GetExportStatusResponse = {
      jobOwnerId,
      jobStatus,
      requiresAccessToken: results.requiresAccessToken,
      exportedFileUrls: results.exportedFileUrls,
      transactionTime,
      exportType,
      outputFormat,
      since,
      type,
      groupId,
      errorArray,
      errorMessage
    };

    return getExportStatusResponse;
  }

  buildExportJob(initiateExportRequest: InitiateExportRequest): BulkExportJob {
    const initialStatus: ExportJobStatus = 'in-progress';
    const uuid = uuidv4();
    // Combine allowedResourceTypes and user input parameter type before pass to Glue job
    let type = initiateExportRequest.allowedResourceTypes.join(',');
    if (initiateExportRequest.type) {
      // If the types user requested are not a subset of allowed types, reject
      if (
        difference(initiateExportRequest.type.split(','), initiateExportRequest.allowedResourceTypes)
          .length !== 0
      ) {
        throw new UnauthorizedError('User does not have permission for requested resource type.');
      }
      type = initiateExportRequest.type;
    }
    const exportJob: BulkExportJob = {
      jobId: uuid,
      jobOwnerId: initiateExportRequest.requesterUserId,
      exportType: initiateExportRequest.exportType,
      groupId: initiateExportRequest.groupId ?? '',
      serverUrl: initiateExportRequest.serverUrl ?? '',
      outputFormat: initiateExportRequest.outputFormat ?? 'ndjson',
      since: initiateExportRequest.since ?? '1800-01-01T00:00:00.000Z', // Default to a long time ago in the past
      type,
      transactionTime: initiateExportRequest.transactionTime,
      jobStatus: initialStatus,
      jobFailedMessage: ''
    };
    if (this.enableMultiTenancy) {
      exportJob.tenantId = initiateExportRequest.tenantId;
    }
    if (initiateExportRequest.groupId) {
      exportJob.compartmentSearchParamFile =
        initiateExportRequest.fhirVersion === '4.0.1'
          ? process.env.PATIENT_COMPARTMENT_V4
          : process.env.PATIENT_COMPARTMENT_V3;
    }
    return exportJob;
  }

  async getActiveSubscriptions(params: { tenantId?: string }): Promise<Record<string, any>[]> {
    this.assertValidTenancyMode(params.tenantId);
    const subscriptionQuery = DynamoDbParamBuilder.buildGetActiveSubscriptions(params.tenantId);
    let queryResponse;
    const subscriptions: Record<string, any>[] = [];
    do {
      // eslint-disable-next-line no-await-in-loop
      queryResponse = await this.dynamoDb.query(subscriptionQuery).promise();
      queryResponse.Items?.forEach((response) => {
        const item = DynamoDBConverter.unmarshall(response);
        subscriptions.push(item);
      });
      if (queryResponse.LastEvaluatedKey) {
        subscriptionQuery.ExclusiveStartKey = queryResponse.LastEvaluatedKey;
      }
    } while (queryResponse.LastEvaluatedKey);
    return subscriptions;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalDeleteResource(
    request: ConditionalDeleteResourceRequest,
    queryParams: any
  ): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }
}
