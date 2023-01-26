/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ExportJobStatus, InitiateExportRequest } from '@aws/fhir-works-on-aws-interface';
import { QueryInput } from 'aws-sdk/clients/dynamodb';
import { BulkExportJob } from '../bulkExport/types';
import DOCUMENT_STATUS from './documentStatus';
import {
  DynamoDBConverter,
  EXPORT_REQUEST_TABLE,
  EXPORT_REQUEST_TABLE_JOB_STATUS_INDEX,
  RESOURCE_TABLE
} from './dynamoDb';
import {
  buildHashKey,
  DOCUMENT_STATUS_FIELD,
  DynamoDbUtil,
  LOCK_END_TS_FIELD,
  SUBSCRIPTION_FIELD
} from './dynamoDbUtil';

const EXPORT_INTERNAL_ID_FIELD = '_jobId';

export default class DynamoDbParamBuilder {
  static LOCK_DURATION_IN_MS = 35 * 1000;

  static buildUpdateDocumentStatusParam(
    oldStatus: DOCUMENT_STATUS | null,
    newStatus: DOCUMENT_STATUS,
    id: string,
    vid: number,
    resourceType: string,
    tenantId?: string
  ) {
    const currentTs = Date.now();
    let futureEndTs = currentTs;
    if (newStatus === DOCUMENT_STATUS.LOCKED) {
      futureEndTs = currentTs + this.LOCK_DURATION_IN_MS;
    }
    let updateExpression = `set ${DOCUMENT_STATUS_FIELD} = :newStatus, ${LOCK_END_TS_FIELD} = :futureEndTs`;
    let conditionExpression = `resourceType = :resourceType`;
    let expressionAttributeNames;
    let expressionAttributeValues: Record<string, any> = {
      ':newStatus': newStatus,
      ':futureEndTs': futureEndTs,
      ':resourceType': resourceType
    };
    if (oldStatus) {
      conditionExpression = `resourceType = :resourceType AND (${DOCUMENT_STATUS_FIELD} = :oldStatus OR (${LOCK_END_TS_FIELD} < :currentTs AND (${DOCUMENT_STATUS_FIELD} = :lockStatus OR ${DOCUMENT_STATUS_FIELD} = :pendingStatus OR ${DOCUMENT_STATUS_FIELD} = :pendingDeleteStatus)))`;
      expressionAttributeValues = {
        ':newStatus': newStatus,
        ':oldStatus': oldStatus,
        ':lockStatus': DOCUMENT_STATUS.LOCKED,
        ':pendingStatus': DOCUMENT_STATUS.PENDING,
        ':pendingDeleteStatus': DOCUMENT_STATUS.PENDING_DELETE,
        ':currentTs': currentTs,
        ':futureEndTs': futureEndTs,
        ':resourceType': resourceType
      };
    }
    if (resourceType === 'Subscription') {
      if (newStatus === DOCUMENT_STATUS.PENDING_DELETE || newStatus === DOCUMENT_STATUS.DELETED) {
        updateExpression = `${updateExpression} REMOVE #subscriptionStatus`;
      } else {
        updateExpression = `${updateExpression}, #subscriptionStatus = :subscriptionStatus`;
        expressionAttributeValues[':subscriptionStatus'] = 'active';
      }
      expressionAttributeNames = { '#subscriptionStatus': `${SUBSCRIPTION_FIELD}` };
    }

    const params: any = {
      Update: {
        TableName: RESOURCE_TABLE,
        Key: DynamoDBConverter.marshall({
          id: buildHashKey(id, tenantId),
          vid
        }),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: DynamoDBConverter.marshall(expressionAttributeValues),
        ConditionExpression: conditionExpression
      }
    };

    if (expressionAttributeNames) {
      params.Update.ExpressionAttributeNames = expressionAttributeNames;
    }

    return params;
  }

  static buildGetResourcesQueryParam(
    id: string,
    resourceType: string,
    maxNumberOfVersions: number,
    projectionExpression?: string,
    tenantId?: string
  ) {
    const params: any = {
      TableName: RESOURCE_TABLE,
      ScanIndexForward: false,
      Limit: maxNumberOfVersions,
      FilterExpression: '#r = :resourceType',
      KeyConditionExpression: 'id = :hkey',
      ExpressionAttributeNames: { '#r': 'resourceType' },
      ExpressionAttributeValues: DynamoDBConverter.marshall({
        ':hkey': buildHashKey(id, tenantId),
        ':resourceType': resourceType
      })
    };

    if (projectionExpression) {
      // @ts-ignore
      params.ProjectionExpression = projectionExpression;
    }
    return params;
  }

  static buildDeleteParam(id: string, vid: number, tenantId?: string) {
    const params: any = {
      Delete: {
        TableName: RESOURCE_TABLE,
        Key: DynamoDBConverter.marshall({
          id: buildHashKey(id, tenantId),
          vid
        })
      }
    };

    return params;
  }

  static buildGetItemParam(id: string, vid: number, tenantId?: string) {
    return {
      TableName: RESOURCE_TABLE,
      Key: DynamoDBConverter.marshall({
        id: buildHashKey(id, tenantId),
        vid
      })
    };
  }

  /**
   * Build DDB PUT param to insert a new resource
   * @param item - The object to be created and stored in DDB
   * @param allowOverwriteId - Allow overwriting a resource with the same id
   * @return DDB params for PUT operation
   */
  static buildPutAvailableItemParam(
    item: any,
    id: string,
    vid: number,
    allowOverwriteId: boolean = false,
    tenantId?: string
  ) {
    const newItem = DynamoDbUtil.prepItemForDdbInsert(item, id, vid, DOCUMENT_STATUS.AVAILABLE, tenantId);
    const param: any = {
      TableName: RESOURCE_TABLE,
      Item: DynamoDBConverter.marshall(newItem)
    };

    if (!allowOverwriteId) {
      param.ConditionExpression = 'attribute_not_exists(id)';
    }
    return param;
  }

  static buildPutCreateExportRequest(
    bulkExportJob: BulkExportJob,
    initiateExportRequest: InitiateExportRequest
  ) {
    const newItem: any = { ...bulkExportJob };
    if (newItem.tenantId) {
      newItem[EXPORT_INTERNAL_ID_FIELD] = newItem.jobId;
      newItem.jobId = buildHashKey(newItem.jobId, newItem.tenantId);
    }
    // Remove fields not needed
    delete newItem.serverUrl;
    delete newItem.fhirVersion;
    delete newItem.allowedResourceTypes;
    // Set type back to user input value
    newItem.type = initiateExportRequest.type ?? '';
    return {
      TableName: EXPORT_REQUEST_TABLE,
      Item: DynamoDBConverter.marshall(newItem)
    };
  }

  static buildQueryExportRequestJobStatus(jobStatus: ExportJobStatus, projectionExpression?: string) {
    const params = {
      TableName: EXPORT_REQUEST_TABLE,
      KeyConditionExpression: 'jobStatus = :hkey',
      ExpressionAttributeValues: DynamoDBConverter.marshall({
        ':hkey': jobStatus
      }),
      IndexName: EXPORT_REQUEST_TABLE_JOB_STATUS_INDEX
    };

    if (projectionExpression) {
      // @ts-ignore
      params.ProjectionExpression = projectionExpression;
    }

    return params;
  }

  static buildUpdateExportRequestJobStatus(jobId: string, jobStatus: ExportJobStatus, tenantId?: string) {
    const hashKey = buildHashKey(jobId, tenantId);
    const params = {
      TableName: EXPORT_REQUEST_TABLE,
      Key: DynamoDBConverter.marshall({
        jobId: hashKey
      }),
      UpdateExpression: 'set jobStatus = :newStatus',
      ConditionExpression: 'jobId = :jobIdVal',
      ExpressionAttributeValues: DynamoDBConverter.marshall({
        ':newStatus': jobStatus,
        ':jobIdVal': hashKey
      })
    };

    return params;
  }

  static buildGetExportRequestJob(jobId: string, tenantId?: string) {
    const params = {
      TableName: EXPORT_REQUEST_TABLE,
      Key: DynamoDBConverter.marshall({
        jobId: buildHashKey(jobId, tenantId)
      })
    };

    return params;
  }

  static buildGetActiveSubscriptions(tenantId?: string): QueryInput {
    const params = {
      TableName: RESOURCE_TABLE,
      IndexName: 'activeSubscriptions',
      KeyConditionExpression: '#subscriptionStatus = :active',
      ExpressionAttributeValues: DynamoDBConverter.marshall({
        ':active': 'active'
      }),
      ExpressionAttributeNames: {
        '#subscriptionStatus': '_subscriptionStatus'
      }
    };
    if (tenantId) {
      params.KeyConditionExpression += ' AND begins_with(id,:tenantId)';
      params.ExpressionAttributeValues = DynamoDBConverter.marshall({
        ':active': 'active',
        ':tenantId': tenantId
      });
    }
    return params;
  }
}
