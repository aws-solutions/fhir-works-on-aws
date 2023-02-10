/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
import { BatchReadWriteRequest, BatchReadWriteResponse } from '@aws/fhir-works-on-aws-interface';
import DOCUMENT_STATUS from '../dataServices/documentStatus';
import { DynamoDBConverter } from '../dataServices/dynamoDb';
import { ItemRequest } from '../dataServices/dynamoDbBundleServiceHelper';
import DynamoDbParamBuilder from '../dataServices/dynamoDbParamBuilder';
import { DOCUMENT_STATUS_FIELD } from '../dataServices/dynamoDbUtil';
import { timeFromEpochInMsRegExp, utcTimeRegExp, uuidRegExp } from './regExpressions';

interface RequestResult {
  request: any;
  expectedRequest: any;
  expectedLock: any;
  expectedStagingResponse: any;
  idToVersionId: Record<string, number>;
}

export default class GenerateStagingRequestsFactory {
  static getCreate(): RequestResult {
    const createResource = {
      resourceType: 'Patient',
      name: [
        {
          family: 'Jameson',
          given: ['Matt']
        }
      ],
      gender: 'male'
    };
    const request = {
      operation: 'create',
      resourceType: 'Patient',
      id: '',
      resource: createResource,
      fullUrl: ''
    };

    const expectedCreateItem: any = { ...createResource };
    expectedCreateItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;

    const expectedRequest = {
      Put: {
        TableName: '',
        Item: DynamoDBConverter.marshall(expectedCreateItem)
      }
    };

    const expectedLock = {
      id: expect.stringMatching(uuidRegExp),
      vid: 1,
      resourceType: 'Patient',
      operation: 'create'
    };

    const expectedStagingResponse: BatchReadWriteResponse = {
      id: expect.stringMatching(uuidRegExp),
      vid: '1',
      operation: 'create',
      resourceType: 'Patient',
      resource: {
        ...createResource,
        id: expect.stringMatching(uuidRegExp),
        meta: { versionId: '1', lastUpdated: expect.stringMatching(utcTimeRegExp) }
      },
      lastModified: expect.stringMatching(utcTimeRegExp)
    };
    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId: {}
    };
  }

  static getRead(): RequestResult {
    const id = '47135b80-b721-430b-9d4b-1557edc64947';
    const request = {
      operation: 'read',
      resource: `Patient/${id}`,
      fullUrl: '',
      resourceType: 'Patient',
      id
    };

    const vid = 1;

    const expectedRequest = {
      Get: {
        TableName: '',
        Key: {
          id: {
            S: id
          },
          vid: {
            N: vid.toString()
          }
        }
      }
    };

    const expectedLock: [] = [];
    const expectedStagingResponse: BatchReadWriteResponse = {
      id,
      vid: vid.toString(),
      operation: 'read',
      lastModified: '',
      resource: {},
      resourceType: 'Patient'
    };

    const idToVersionId: Record<string, number> = {};
    idToVersionId[id] = vid;

    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId
    };
  }

  static getUpdate(): RequestResult {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = 1;
    const nextVid = 2;
    const existingMeta = { security: [{ code: 'test' }], versionId: vid.toString() };
    const resource = {
      resourceType: 'Patient',
      id,
      name: [
        {
          family: 'Jameson',
          given: ['Matt']
        }
      ],
      gender: 'male',
      meta: existingMeta
    };
    const request: BatchReadWriteRequest = {
      operation: 'update',
      resourceType: 'Patient',
      id,
      resource,
      fullUrl: `urn:uuid:${id}`
    };

    const expectedUpdateItem: any = { ...resource, meta: { ...existingMeta, versionId: nextVid.toString() } };
    expectedUpdateItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;
    expectedUpdateItem.id = id;
    expectedUpdateItem.vid = nextVid;

    const expectedRequest = {
      Put: {
        TableName: '',
        Item: DynamoDBConverter.marshall(expectedUpdateItem)
      }
    };

    const expectedLock: ItemRequest = {
      id,
      vid: nextVid,
      resourceType: 'Patient',
      operation: 'update',
      isOriginalUpdateItem: false
    };

    const expectedStagingResponse: BatchReadWriteResponse = {
      id,
      vid: nextVid.toString(),
      operation: 'update',
      resourceType: 'Patient',
      resource: {
        ...resource,
        meta: {
          ...existingMeta,
          versionId: nextVid.toString(),
          lastUpdated: expect.stringMatching(utcTimeRegExp)
        }
      },
      lastModified: expect.stringMatching(utcTimeRegExp)
    };

    const idToVersionId: Record<string, number> = {};
    idToVersionId[id] = vid;

    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId
    };
  }

  static getDelete(): RequestResult {
    const id = 'bce8411e-c15e-448c-95dd-69155a837405';
    const resourceType = 'Patient';
    const request: BatchReadWriteRequest = {
      operation: 'delete',
      resource: `Patient/${id}`,
      fullUrl: '',
      resourceType,
      id
    };

    const vid = 1;
    const expectedRequest = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      DOCUMENT_STATUS.LOCKED,
      DOCUMENT_STATUS.PENDING_DELETE,
      id,
      vid,
      resourceType
    );

    expectedRequest.Update.ExpressionAttributeValues[':currentTs'].N =
      expect.stringMatching(timeFromEpochInMsRegExp);
    expectedRequest.Update.ExpressionAttributeValues[':futureEndTs'].N =
      expect.stringMatching(timeFromEpochInMsRegExp);

    const expectedLock: [] = [];

    const expectedStagingResponse: BatchReadWriteResponse = {
      id,
      vid: vid.toString(),
      operation: 'delete',
      lastModified: expect.stringMatching(utcTimeRegExp),
      resource: {},
      resourceType: 'Patient'
    };

    const idToVersionId: Record<string, number> = {};
    idToVersionId[id] = vid;

    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId
    };
  }
}
