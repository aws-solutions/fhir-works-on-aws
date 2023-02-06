/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { GenericResponse, ResourceNotFoundError } from '@aws/fhir-works-on-aws-interface';
import DynamoDB, { ItemList } from 'aws-sdk/clients/dynamodb';
import DOCUMENT_STATUS from './documentStatus';
import { DynamoDBConverter } from './dynamoDb';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';
import { DOCUMENT_STATUS_FIELD, DynamoDbUtil } from './dynamoDbUtil';

export default class DynamoDbHelper {
  private dynamoDb: DynamoDB;

  constructor(dynamoDb: DynamoDB) {
    this.dynamoDb = dynamoDb;
  }

  private async getMostRecentResources(
    resourceType: string,
    id: string,
    maxNumberOfVersionsToGet: number,
    projectionExpression?: string,
    tenantId?: string
  ): Promise<ItemList> {
    const params = DynamoDbParamBuilder.buildGetResourcesQueryParam(
      id,
      resourceType,
      maxNumberOfVersionsToGet,
      projectionExpression,
      tenantId
    );
    let result: any = {};
    try {
      result = await this.dynamoDb.query(params).promise();
    } catch (e) {
      if ((e as any).code === 'ConditionalCheckFailedException') {
        throw new ResourceNotFoundError(resourceType, id);
      }
      throw e;
    }

    const items = result.Items
      ? result.Items.map((ddbJsonItem: any) => DynamoDBConverter.unmarshall(ddbJsonItem))
      : [];
    if (items.length === 0) {
      throw new ResourceNotFoundError(resourceType, id);
    }
    return items;
  }

  async getMostRecentResource(
    resourceType: string,
    id: string,
    projectionExpression?: string,
    tenantId?: string
  ): Promise<GenericResponse> {
    let item = (await this.getMostRecentResources(resourceType, id, 1, projectionExpression, tenantId))[0];
    item = DynamoDbUtil.cleanItem(item);

    return {
      message: 'Resource found',
      resource: item
    };
  }

  /**
   * @return The most recent resource that has not been deleted and has been committed to the database (i.e. The resource is not in a transitional state)
   */
  async getMostRecentUserReadableResource(
    resourceType: string,
    id: string,
    tenantId?: string
  ): Promise<GenericResponse> {
    const items = await this.getMostRecentResources(resourceType, id, 2, undefined, tenantId);

    // TODO: review type conversion
    const latestItemDocStatus: DOCUMENT_STATUS = <DOCUMENT_STATUS>(<unknown>items[0][DOCUMENT_STATUS_FIELD]);
    if (latestItemDocStatus === DOCUMENT_STATUS.DELETED) {
      throw new ResourceNotFoundError(resourceType, id);
    }
    let item: any = {};
    // Latest version that are in LOCKED/PENDING_DELETE/AVAILABLE are valid to be read from
    if (
      [DOCUMENT_STATUS.AVAILABLE, DOCUMENT_STATUS.PENDING_DELETE, DOCUMENT_STATUS.LOCKED].includes(
        latestItemDocStatus
      )
    ) {
      // eslint-disable-next-line prefer-destructuring
      item = items[0];
    } else if (latestItemDocStatus === DOCUMENT_STATUS.PENDING && items.length > 1) {
      // If the latest version of the resource is in PENDING, grab the previous version
      // eslint-disable-next-line prefer-destructuring
      item = items[1];
    } else {
      throw new ResourceNotFoundError(resourceType, id);
    }
    item = DynamoDbUtil.cleanItem(item);
    return {
      message: 'Resource found',
      resource: item
    };
  }
}
