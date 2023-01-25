'use strict';
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const dynamoDb_1 = require('../src/dataServices/dynamoDb');
const dynamoDbUtil_1 = require('../src/dataServices/dynamoDbUtil');
const regExpressions_1 = require('./regExpressions');
const dynamoDbParamBuilder_1 = __importDefault(require('../src/dataServices/dynamoDbParamBuilder'));
class GenerateStagingRequestsFactory {
  static getCreate() {
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
    const expectedCreateItem = { ...createResource };
    expectedCreateItem[dynamoDbUtil_1.DOCUMENT_STATUS_FIELD] = 'PENDING' /* DOCUMENT_STATUS.PENDING */;
    const expectedRequest = {
      Put: {
        TableName: '',
        Item: dynamoDb_1.DynamoDBConverter.marshall(expectedCreateItem)
      }
    };
    const expectedLock = {
      id: expect.stringMatching(regExpressions_1.uuidRegExp),
      vid: 1,
      resourceType: 'Patient',
      operation: 'create'
    };
    const expectedStagingResponse = {
      id: expect.stringMatching(regExpressions_1.uuidRegExp),
      vid: '1',
      operation: 'create',
      resourceType: 'Patient',
      resource: {
        ...createResource,
        id: expect.stringMatching(regExpressions_1.uuidRegExp),
        meta: { versionId: '1', lastUpdated: expect.stringMatching(regExpressions_1.utcTimeRegExp) }
      },
      lastModified: expect.stringMatching(regExpressions_1.utcTimeRegExp)
    };
    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId: {}
    };
  }
  static getRead() {
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
    const expectedLock = [];
    const expectedStagingResponse = {
      id,
      vid: vid.toString(),
      operation: 'read',
      lastModified: '',
      resource: {},
      resourceType: 'Patient'
    };
    const idToVersionId = {};
    idToVersionId[id] = vid;
    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId
    };
  }
  static getUpdate() {
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
    const request = {
      operation: 'update',
      resourceType: 'Patient',
      id,
      resource,
      fullUrl: `urn:uuid:${id}`
    };
    const expectedUpdateItem = { ...resource, meta: { ...existingMeta, versionId: nextVid.toString() } };
    expectedUpdateItem[dynamoDbUtil_1.DOCUMENT_STATUS_FIELD] = 'PENDING' /* DOCUMENT_STATUS.PENDING */;
    expectedUpdateItem.id = id;
    expectedUpdateItem.vid = nextVid;
    const expectedRequest = {
      Put: {
        TableName: '',
        Item: dynamoDb_1.DynamoDBConverter.marshall(expectedUpdateItem)
      }
    };
    const expectedLock = {
      id,
      vid: nextVid,
      resourceType: 'Patient',
      operation: 'update',
      isOriginalUpdateItem: false
    };
    const expectedStagingResponse = {
      id,
      vid: nextVid.toString(),
      operation: 'update',
      resourceType: 'Patient',
      resource: {
        ...resource,
        meta: {
          ...existingMeta,
          versionId: nextVid.toString(),
          lastUpdated: expect.stringMatching(regExpressions_1.utcTimeRegExp)
        }
      },
      lastModified: expect.stringMatching(regExpressions_1.utcTimeRegExp)
    };
    const idToVersionId = {};
    idToVersionId[id] = vid;
    return {
      request,
      expectedRequest,
      expectedLock,
      expectedStagingResponse,
      idToVersionId
    };
  }
  static getDelete() {
    const id = 'bce8411e-c15e-448c-95dd-69155a837405';
    const resourceType = 'Patient';
    const request = {
      operation: 'delete',
      resource: `Patient/${id}`,
      fullUrl: '',
      resourceType,
      id
    };
    const vid = 1;
    const expectedRequest = dynamoDbParamBuilder_1.default.buildUpdateDocumentStatusParam(
      'LOCKED' /* DOCUMENT_STATUS.LOCKED */,
      'PENDING_DELETE' /* DOCUMENT_STATUS.PENDING_DELETE */,
      id,
      vid,
      resourceType
    );
    expectedRequest.Update.ExpressionAttributeValues[':currentTs'].N = expect.stringMatching(
      regExpressions_1.timeFromEpochInMsRegExp
    );
    expectedRequest.Update.ExpressionAttributeValues[':futureEndTs'].N = expect.stringMatching(
      regExpressions_1.timeFromEpochInMsRegExp
    );
    const expectedLock = [];
    const expectedStagingResponse = {
      id,
      vid: vid.toString(),
      operation: 'delete',
      lastModified: expect.stringMatching(regExpressions_1.utcTimeRegExp),
      resource: {},
      resourceType: 'Patient'
    };
    const idToVersionId = {};
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
exports.default = GenerateStagingRequestsFactory;
//# sourceMappingURL=GenerateStagingRequestsFactory.js.map
