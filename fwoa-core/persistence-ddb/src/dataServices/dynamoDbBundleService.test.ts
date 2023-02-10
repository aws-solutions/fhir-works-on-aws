/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  BundleResponse,
  BatchReadWriteRequest,
  TypeOperation,
  ResourceNotFoundError
} from '@aws/fhir-works-on-aws-interface';
import AWS from 'aws-sdk';
import { QueryInput, TransactWriteItemsInput, TransactWriteItem } from 'aws-sdk/clients/dynamodb';
import * as AWSMock from 'aws-sdk-mock';

// @ts-ignore
import { range } from 'lodash';
import { timeFromEpochInMsRegExp, utcTimeRegExp, uuidRegExp } from '../testUtilities/regExpressions';
import { DynamoDBConverter } from './dynamoDb';
import { DynamoDbBundleService } from './dynamoDbBundleService';
import DynamoDbHelper from './dynamoDbHelper';
import { DOCUMENT_STATUS_FIELD, LOCK_END_TS_FIELD, REFERENCES_FIELD, VID_FIELD } from './dynamoDbUtil';
// eslint-disable-next-line import/order
import sinon = require('sinon');

AWSMock.setSDKInstance(AWS);

describe('atomicallyReadWriteResources', () => {
  afterEach(() => {
    AWSMock.restore();
    sinon.restore();
  });

  const id = 'bce8411e-c15e-448c-95dd-69155a837405';
  describe('ERROR Cases', () => {
    const runTest = async (expectedResponse: BundleResponse) => {
      const dynamoDb = new AWS.DynamoDB();
      const bundleService = new DynamoDbBundleService(dynamoDb);

      const deleteRequest: BatchReadWriteRequest = {
        operation: 'delete',
        resourceType: 'Patient',
        id,
        resource: 'Patient/bce8411e-c15e-448c-95dd-69155a837405'
      };
      const actualResponse = await bundleService.transaction({
        requests: [deleteRequest],
        startTime: new Date()
      });

      expect(actualResponse).toStrictEqual(expectedResponse);
    };

    test('LOCK: Delete item that does not exist', async () => {
      // READ items (Failure)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        callback(null, { Items: [] });
      });

      const expectedResponse: BundleResponse = {
        success: false,
        message: 'Failed to find resources: Patient/bce8411e-c15e-448c-95dd-69155a837405',
        batchReadWriteResponses: [],
        errorType: 'USER_ERROR'
      };

      await runTest(expectedResponse);
    });

    test('LOCK: Try to delete item that exist, but system cannot obtain the lock', async () => {
      // READ items (Success)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        callback(null, {
          Items: [
            DynamoDBConverter.marshall({
              id,
              vid: '1',
              resourceType: 'Patient',
              meta: { versionId: '1', lastUpdated: new Date().toISOString() }
            })
          ]
        });
      });

      // LOCK items (Failure)
      AWSMock.mock(
        'DynamoDB',
        'transactWriteItems',
        (params: TransactWriteItemsInput, callback: Function) => {
          callback('ConditionalCheckFailed', {});
        }
      );

      const expectedResponse: BundleResponse = {
        success: false,
        message: 'Failed to lock resources for transaction. Please try again after 35 seconds.',
        batchReadWriteResponses: [],
        errorType: 'SYSTEM_ERROR'
      };

      await runTest(expectedResponse);
    });

    test('LOCK: One of the DynamoDB transaction fails', async () => {
      // BUILD

      // READ items (Success)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        const queryId = params.ExpressionAttributeValues![':hkey'].S;
        callback(null, {
          Items: [
            DynamoDBConverter.marshall({
              id: queryId,
              vid: '1',
              resourceType: 'Patient',
              meta: { versionId: '1', lastUpdated: new Date().toISOString() }
            })
          ]
        });
      });

      // transactWriteItems 1/2 calls succeed
      const transactWriteItemsStub = sinon.stub();
      transactWriteItemsStub.onCall(0).yields(null, {}); // lock call 1/2
      transactWriteItemsStub.onCall(1).yields('ConditionalCheckFailed', {}); // lock call 2/2
      transactWriteItemsStub.onCall(2).yields(null, {}); // unlock call 1/2
      transactWriteItemsStub.onCall(3).yields(null, {}); // unlock call 2/2
      AWSMock.mock('DynamoDB', 'transactWriteItems', transactWriteItemsStub);

      // OPERATE
      const dynamoDb = new AWS.DynamoDB();
      const bundleService = new DynamoDbBundleService(dynamoDb);
      const actualResponse = await bundleService.transaction({
        requests: range(0, 26).map((i) => {
          return {
            operation: 'delete',
            resourceType: 'Patient',
            id: `${id}-${i}`,
            resource: `Patient/bce8411e-c15e-448c-95dd-69155a837405-${i}`
          };
        }),
        startTime: new Date()
      });

      // CHECK
      expect(actualResponse).toStrictEqual({
        success: false,
        message: 'Failed to lock resources for transaction. Please try again after 35 seconds.',
        batchReadWriteResponses: [],
        errorType: 'SYSTEM_ERROR'
      });
    });

    test('STAGING: Item exist and lock obtained, but failed to stage', async () => {
      // READ items (Success)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        callback(null, {
          Items: [
            DynamoDBConverter.marshall({
              id,
              vid: '1',
              resourceType: 'Patient',
              meta: { versionId: '1', lastUpdated: new Date().toISOString() }
            })
          ]
        });
      });

      const transactWriteItemStub = sinon.stub();
      // LOCK Items (Success)
      transactWriteItemStub.onFirstCall().returns({ error: null, value: {} });

      // STAGE Items (Failure)
      transactWriteItemStub.onSecondCall().returns({ error: 'ConditionalCheckFailed', value: {} });

      // Rollback Items (Success)
      transactWriteItemStub.onThirdCall().returns({ error: null, value: {} });
      AWSMock.mock(
        'DynamoDB',
        'transactWriteItems',
        (params: TransactWriteItemsInput, callback: Function) => {
          const result = transactWriteItemStub();
          callback(result?.error || null, result?.value || {});
        }
      );

      const expectedResponse: BundleResponse = {
        success: false,
        message: 'Failed to stage resources for transaction',
        batchReadWriteResponses: [],
        errorType: 'SYSTEM_ERROR'
      };

      await runTest(expectedResponse);
    });

    test('STAGING: One of the DynamoDB transaction fails', async () => {
      // BUILD

      // READ items (Success)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        const queryId = params.ExpressionAttributeValues![':hkey'].S;
        callback(null, {
          Items: [
            DynamoDBConverter.marshall({
              id: queryId,
              vid: '1',
              resourceType: 'Patient',
              meta: { versionId: '1', lastUpdated: new Date().toISOString() }
            })
          ]
        });
      });

      // transactWriteItems 1/2 calls succeed
      const transactWriteItemsStub = sinon.stub();
      transactWriteItemsStub.onCall(0).yields(null, {}); // 1/2 lock calls
      transactWriteItemsStub.onCall(1).yields(null, {}); // 2/2 lock calls
      transactWriteItemsStub.onCall(2).yields(null, {}); // 1/2 staging calls
      transactWriteItemsStub.onCall(2).yields('ConditionalCheckFailed', {}); // 2/2 staging calls
      transactWriteItemsStub.onCall(3).yields(null, {}); // rollback call 1/2
      transactWriteItemsStub.onCall(4).yields(null, {}); // rollback call 2/2
      transactWriteItemsStub.onCall(5).yields(null, {}); // unlock call 1/2
      transactWriteItemsStub.onCall(6).yields(null, {}); // unlock call 2/2
      AWSMock.mock('DynamoDB', 'transactWriteItems', transactWriteItemsStub);

      // OPERATE
      const dynamoDb = new AWS.DynamoDB();
      const bundleService = new DynamoDbBundleService(dynamoDb);
      const actualResponse = await bundleService.transaction({
        requests: range(0, 26).map((i) => {
          return {
            operation: 'delete',
            resourceType: 'Patient',
            id: `${id}-${i}`,
            vid: '1',
            resource: `Patient/bce8411e-c15e-448c-95dd-69155a837405-${i}`
          };
        }),
        startTime: new Date()
      });

      // CHECK
      expect(actualResponse).toStrictEqual({
        success: false,
        message: 'Failed to stage resources for transaction',
        batchReadWriteResponses: [],
        errorType: 'SYSTEM_ERROR'
      });
    });
  });

  describe('SUCCESS Cases', () => {
    // When creating a resource, no locks is needed because no items in DDB to put a lock on yet
    async function runCreateTest(shouldReqHasReferences: boolean, useVersionedReferences: boolean = false) {
      // BUILD
      const transactWriteItemSpy = sinon.spy();
      AWSMock.mock(
        'DynamoDB',
        'transactWriteItems',
        (params: TransactWriteItemsInput, callback: Function) => {
          transactWriteItemSpy(params);
          callback(null, {});
        }
      );
      const dynamoDb = new AWS.DynamoDB();
      let versionedLinks;
      if (useVersionedReferences) {
        versionedLinks = {
          Patient: ['managingOrganization.reference']
        };
        const organizationResource: any = {
          resourceType: 'Organization',
          name: 'ACME .Inc',
          active: true,
          meta: { versionId: 3 }
        };

        sinon
          .stub(DynamoDbHelper.prototype, 'getMostRecentResource')
          .withArgs('Organization', '1', 'meta')
          .returns(Promise.resolve({ message: 'Resource found', resource: organizationResource }));
      }
      const transactionService = new DynamoDbBundleService(dynamoDb, false, undefined, { versionedLinks });

      const resourceType = 'Patient';
      const resource: any = {
        resourceType,
        name: [
          {
            family: 'Smith',
            given: ['John']
          }
        ],
        gender: 'male',
        meta: { security: 'gondor' }
      };

      const organization = 'Organization/1';
      if (shouldReqHasReferences) {
        resource.managingOrganization = {
          reference: organization
        };
      }

      const createRequest: BatchReadWriteRequest = {
        operation: 'create',
        resourceType,
        id,
        resource
      };

      // OPERATE
      const actualResponse = await transactionService.transaction({
        requests: [createRequest],
        startTime: new Date()
      });

      // CHECK
      // transactWriteItem requests is called twice
      expect(transactWriteItemSpy.calledTwice).toBeTruthy();

      const insertedResourceJson: any = {
        ...resource,
        id: 'holder',
        meta: {
          lastUpdated: 'holder',
          versionId: '1',
          security: 'gondor'
        }
      };
      insertedResourceJson[DOCUMENT_STATUS_FIELD] = 'PENDING';
      insertedResourceJson[VID_FIELD] = 1;
      if (shouldReqHasReferences) {
        if (useVersionedReferences) {
          insertedResourceJson[REFERENCES_FIELD] = [`${organization}/_history/3`];
        } else {
          insertedResourceJson[REFERENCES_FIELD] = [organization];
        }
      } else {
        insertedResourceJson[REFERENCES_FIELD] = [];
      }
      insertedResourceJson[LOCK_END_TS_FIELD] = Date.now();

      const insertedResource = DynamoDBConverter.marshall(insertedResourceJson);

      // Setting up test assertions
      insertedResource.id.S = expect.stringMatching(uuidRegExp);
      insertedResource[LOCK_END_TS_FIELD].N = expect.stringMatching(timeFromEpochInMsRegExp);
      insertedResource.meta!.M!.lastUpdated.S = expect.stringMatching(utcTimeRegExp);

      // 1. create new Patient record with documentStatus of 'PENDING'
      expect(transactWriteItemSpy.getCall(0).args[0]).toStrictEqual({
        TransactItems: [
          {
            Put: {
              TableName: '',
              Item: insertedResource
            }
          }
        ]
      });

      // 2. change Patient record's documentStatus to be 'AVAILABLE'
      expect(transactWriteItemSpy.getCall(1).args[0]).toStrictEqual({
        TransactItems: [
          {
            Update: {
              TableName: '',
              Key: {
                id: { S: id },
                vid: { N: '1' }
              },
              UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
              ConditionExpression: 'resourceType = :resourceType',
              ExpressionAttributeValues: {
                ':newStatus': { S: 'AVAILABLE' },
                ':futureEndTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':resourceType': { S: 'Patient' }
              }
            }
          }
        ]
      });
      expect(actualResponse).toStrictEqual({
        message: 'Successfully committed requests to DB',
        batchReadWriteResponses: [
          {
            id,
            vid: '1',
            operation: 'create',
            lastModified: expect.stringMatching(utcTimeRegExp),
            resourceType: 'Patient',
            resource: {
              ...resource,
              id,
              meta: {
                lastUpdated: expect.stringMatching(utcTimeRegExp),
                versionId: '1',
                security: 'gondor'
              }
            }
          }
        ],
        success: true
      });
    }
    test('CREATING a resource with no references', async () => {
      await runCreateTest(false);
    });

    test('CREATING a resource with references', async () => {
      await runCreateTest(true);
    });

    test('CREATING a resource with references and versioned reference links', async () => {
      await runCreateTest(true, true);
    });

    test('CREATING more than 25 resources', async () => {
      // BUILD

      // READ items (Success)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        const queryId = params.ExpressionAttributeValues![':hkey'].S;
        callback(null, {
          Items: [
            DynamoDBConverter.marshall({
              id: queryId,
              vid: '1',
              resourceType: 'Patient',
              meta: { versionId: '1', lastUpdated: new Date().toISOString() }
            })
          ]
        });
      });

      // transactWriteItems all calls succeed
      const transactWriteItemsStub = sinon.stub();
      transactWriteItemsStub.yields(null, {});
      AWSMock.mock('DynamoDB', 'transactWriteItems', transactWriteItemsStub);

      // OPERATE
      const dynamoDb = new AWS.DynamoDB();
      const bundleService = new DynamoDbBundleService(dynamoDb);
      const actualResponse = await bundleService.transaction({
        requests: range(0, 26).map((i) => {
          return {
            operation: 'create',
            resourceType: 'Patient',
            id: `${id}-${i}`,
            vid: '1',
            resource: {
              resourceType: 'Patient',
              name: [
                {
                  family: `${i}`,
                  given: [`${i}`]
                }
              ]
            }
          };
        }),
        startTime: new Date()
      });

      // CHECK
      expect(transactWriteItemsStub.callCount).toBe(4);

      // make sure item was staged, unlocked and returned in the response
      const stageRequestItems = transactWriteItemsStub
        .getCall(0)
        .args[0].TransactItems.concat(transactWriteItemsStub.getCall(1).args[0].TransactItems);
      const unlockRequestItems = transactWriteItemsStub
        .getCall(2)
        .args[0].TransactItems.concat(transactWriteItemsStub.getCall(3).args[0].TransactItems);

      range(0, 26).forEach((i) => {
        expect(
          stageRequestItems.some((item: TransactWriteItem) => {
            return item.Put!.Item.id.S === `${id}-${i}`;
          })
        ).toBeTruthy();
        expect(
          unlockRequestItems.some((item: TransactWriteItem) => {
            return item.Update!.Key.id.S === `${id}-${i}`;
          })
        ).toBeTruthy();

        // make sure we include the item in the response
        expect(
          actualResponse.batchReadWriteResponses.some((item) => {
            return item.id === `${id}-${i}`;
          })
        ).toBeTruthy();
      });

      // check the response adds up
      expect(actualResponse.success).toBeTruthy();
    });

    async function runUpdateTest(shouldReqHasReferences: boolean, useVersionedReferences: boolean = false) {
      // BUILD
      const transactWriteItemSpy = sinon.spy();
      AWSMock.mock(
        'DynamoDB',
        'transactWriteItems',
        (params: TransactWriteItemsInput, callback: Function) => {
          transactWriteItemSpy(params);
          callback(null, {});
        }
      );
      const resourceType = 'Patient';
      const oldVid = 1;
      const newVid = oldVid + 1;
      const organization = 'Organization/1';
      const oldResource: any = {
        id,
        resourceType,
        name: [
          {
            family: 'Jameson',
            given: ['Matt']
          }
        ],
        meta: { versionId: oldVid.toString(), lastUpdated: new Date().toISOString() }
      };

      if (shouldReqHasReferences) {
        oldResource.managingOrganization = {
          reference: organization
        };
      }

      const newResource = {
        ...oldResource,
        test: 'test',
        meta: { versionId: newVid.toString(), lastUpdated: new Date().toISOString(), security: 'skynet' }
      };

      const getMostRecentResourceStub = sinon.stub(DynamoDbHelper.prototype, 'getMostRecentResource');
      getMostRecentResourceStub
        .withArgs(resourceType, id, 'id, resourceType, meta')
        .returns(Promise.resolve({ message: 'Resource found', resource: oldResource }));

      const dynamoDb = new AWS.DynamoDB();
      let versionedLinks;
      if (useVersionedReferences) {
        versionedLinks = {
          Patient: ['managingOrganization.reference']
        };
        const organizationResource: any = {
          resourceType: 'Organization',
          name: 'ACME .Inc',
          active: true,
          meta: { versionId: 3 }
        };

        getMostRecentResourceStub
          .withArgs('Organization', '1', 'meta')
          .returns(Promise.resolve({ message: 'Resource found', resource: organizationResource }));
      }
      const transactionService = new DynamoDbBundleService(dynamoDb, false, undefined, { versionedLinks });

      const updateRequest: BatchReadWriteRequest = {
        operation: 'update',
        resourceType,
        id,
        resource: newResource
      };

      // OPERATE
      const actualResponse = await transactionService.transaction({
        requests: [updateRequest],
        startTime: new Date()
      });

      // CHECK
      // transactWriteItem requests is called thrice
      expect(transactWriteItemSpy.calledThrice).toBeTruthy();

      // 0. change Patient record's documentStatus to be 'LOCKED'
      expect(transactWriteItemSpy.getCall(0).args[0]).toStrictEqual({
        TransactItems: [
          {
            Update: {
              TableName: '',
              Key: {
                id: { S: id },
                vid: { N: oldVid.toString() }
              },
              ConditionExpression:
                'resourceType = :resourceType AND (documentStatus = :oldStatus OR (lockEndTs < :currentTs AND (documentStatus = :lockStatus OR documentStatus = :pendingStatus OR documentStatus = :pendingDeleteStatus)))',
              UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
              ExpressionAttributeValues: {
                ':newStatus': { S: 'LOCKED' },
                ':lockStatus': { S: 'LOCKED' },
                ':oldStatus': { S: 'AVAILABLE' },
                ':pendingDeleteStatus': { S: 'PENDING_DELETE' },
                ':pendingStatus': { S: 'PENDING' },
                ':currentTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':futureEndTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':resourceType': { S: 'Patient' }
              }
            }
          }
        ]
      });

      const insertedResourceJson: any = {
        ...newResource
      };
      insertedResourceJson[DOCUMENT_STATUS_FIELD] = 'PENDING';
      insertedResourceJson[VID_FIELD] = newVid;
      if (shouldReqHasReferences) {
        if (useVersionedReferences) {
          insertedResourceJson[REFERENCES_FIELD] = [`${organization}/_history/3`];
        } else {
          insertedResourceJson[REFERENCES_FIELD] = [organization];
        }
      } else {
        insertedResourceJson[REFERENCES_FIELD] = [];
      }
      insertedResourceJson[LOCK_END_TS_FIELD] = Date.now();

      const insertedResource = DynamoDBConverter.marshall(insertedResourceJson);
      insertedResource.lockEndTs.N = expect.stringMatching(timeFromEpochInMsRegExp);
      insertedResource.meta!.M!.lastUpdated.S = expect.stringMatching(utcTimeRegExp);
      insertedResource.meta!.M!.versionId.S = newVid.toString();

      // 1. create new Patient record with documentStatus of 'PENDING'
      expect(transactWriteItemSpy.getCall(1).args[0]).toStrictEqual({
        TransactItems: [
          {
            Put: {
              TableName: '',
              Item: insertedResource
            }
          }
        ]
      });

      // 2. change Patient record's documentStatus to be 'AVAILABLE'
      expect(transactWriteItemSpy.getCall(2).args[0]).toStrictEqual({
        TransactItems: [
          {
            Update: {
              TableName: '',
              Key: {
                id: { S: id },
                vid: { N: oldVid.toString() }
              },
              ConditionExpression: 'resourceType = :resourceType',
              UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
              ExpressionAttributeValues: {
                ':newStatus': { S: 'DELETED' },
                ':futureEndTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':resourceType': {
                  S: 'Patient'
                }
              }
            }
          },
          {
            Update: {
              TableName: '',
              Key: {
                id: { S: id },
                vid: { N: newVid.toString() }
              },
              ConditionExpression: 'resourceType = :resourceType',
              UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
              ExpressionAttributeValues: {
                ':newStatus': { S: 'AVAILABLE' },
                ':futureEndTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':resourceType': {
                  S: 'Patient'
                }
              }
            }
          }
        ]
      });

      expect(actualResponse).toStrictEqual({
        message: 'Successfully committed requests to DB',
        batchReadWriteResponses: [
          {
            id,
            vid: newVid.toString(),
            operation: 'update',
            lastModified: expect.stringMatching(utcTimeRegExp),
            resourceType,
            resource: {
              ...newResource,
              meta: {
                versionId: newVid.toString(),
                lastUpdated: expect.stringMatching(utcTimeRegExp),
                security: 'skynet'
              }
            }
          }
        ],
        success: true
      });
    }

    test('UPDATING a resource with no references', async () => {
      await runUpdateTest(false);
    });

    test('UPDATING a resource with references', async () => {
      await runUpdateTest(true);
    });

    test('UPDATING a resource with references and versioned reference links', async () => {
      await runUpdateTest(true, true);
    });

    test('UPDATING more than 25 resources', async () => {
      // BUILD

      // READ items (Success)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        const queryId = params.ExpressionAttributeValues![':hkey'].S;
        callback(null, {
          Items: [
            DynamoDBConverter.marshall({
              id: queryId,
              vid: 1,
              resourceType: 'Patient',
              meta: { versionId: 1, lastUpdated: new Date().toISOString() }
            })
          ]
        });
      });

      // transactWriteItems all calls succeed
      const transactWriteItemsStub = sinon.stub();
      transactWriteItemsStub.yields(null, {}); // all calls succeed
      AWSMock.mock('DynamoDB', 'transactWriteItems', transactWriteItemsStub);

      // OPERATE
      const dynamoDb = new AWS.DynamoDB();
      const bundleService = new DynamoDbBundleService(dynamoDb);
      const actualResponse = await bundleService.transaction({
        requests: range(0, 26).map((i) => {
          return {
            operation: 'update',
            resourceType: 'Patient',
            id: `${id}-${i}`,
            resource: {
              id: `${id}-${i}`,
              resourceType: 'Patient',
              name: [
                {
                  family: `${i}`,
                  given: [`${i}`]
                }
              ],
              meta: { versionId: 2, lastUpdated: new Date().toISOString() }
            }
          };
        }),
        startTime: new Date()
      });

      // CHECK
      // [0,1] = lock
      // [2,3] = pending
      // [4,6] = DELETE vid 1 & AVAILABLE vid 2
      expect(transactWriteItemsStub.callCount).toBe(7);

      // there's no guarantee on which ddb transaction the BatchReadWriteRequest is processed in

      // check every item is locked, adds pending & delete/makes available new version
      const lockRequestItems = transactWriteItemsStub
        .getCall(0)
        .args[0].TransactItems.concat(transactWriteItemsStub.getCall(1).args[0].TransactItems);
      const stageRequestItems = transactWriteItemsStub
        .getCall(2)
        .args[0].TransactItems.concat(transactWriteItemsStub.getCall(3).args[0].TransactItems);
      const unlockRequestItems = transactWriteItemsStub
        .getCall(4)
        .args[0].TransactItems.concat(transactWriteItemsStub.getCall(5).args[0].TransactItems)
        .concat(transactWriteItemsStub.getCall(6).args[0].TransactItems);
      range(0, 26).forEach((i) => {
        expect(
          lockRequestItems.some((item: TransactWriteItem) => {
            return item.Update!.Key.id.S === `${id}-${i}`;
          })
        ).toBeTruthy();
        expect(
          stageRequestItems.some((item: TransactWriteItem) => {
            return item.Put!.Item.id.S === `${id}-${i}`;
          })
        ).toBeTruthy();
        expect(
          unlockRequestItems.some((item: TransactWriteItem) => {
            return item.Update!.Key.id.S === `${id}-${i}`;
          })
        ).toBeTruthy();

        // make sure we include the item in the response
        expect(
          actualResponse.batchReadWriteResponses.some((item) => {
            return item.id === `${id}-${i}`;
          })
        ).toBeTruthy();
      });

      // check the response adds up
      expect(actualResponse.success).toBeTruthy();
    });
  });

  describe('Update as Create Cases', () => {
    const runTest = async (
      supportUpdateCreate: boolean,
      operation: TypeOperation,
      isLockSuccessful: boolean
    ) => {
      // READ items (Failure)
      AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
        callback(null, { Items: [] });
      });

      const dynamoDb = new AWS.DynamoDB();
      const bundleService = new DynamoDbBundleService(dynamoDb, supportUpdateCreate);

      const batchRequest: BatchReadWriteRequest = {
        operation,
        resourceType: 'Patient',
        id,
        resource: `Patient/${id}`
      };
      // @ts-ignore
      const actualResponse = await bundleService.lockItems([batchRequest]);
      if (isLockSuccessful) {
        expect(actualResponse).toStrictEqual({
          lockedItems: [],
          successfulLock: true
        });
      } else {
        expect(actualResponse).toStrictEqual({
          errorMessage: `Failed to find resources: Patient/${id}`,
          errorType: 'USER_ERROR',
          lockedItems: [],
          successfulLock: false
        });
      }
    };

    const testCases = [
      // ['supportUpdateCreate', 'operation', 'isLockSuccessful'],
      [true, 'create', true],
      [true, 'update', true],
      [true, 'read', false],
      [false, 'create', true],
      [false, 'update', false],
      [false, 'read', false]
    ];

    // eslint-disable-next-line no-restricted-syntax
    for (const [supportUpdateCreate, operation, isLockSuccessful] of testCases) {
      test('lock update ', async () => {
        await runTest(
          supportUpdateCreate as boolean,
          operation as TypeOperation,
          isLockSuccessful as boolean
        );
      });
    }
  });

  const apiUrl = 'https://patient.ia/fhir';

  describe('Bundle transaction with multiple resources', () => {
    async function runTransaction(
      useVersionedReferences: boolean,
      supportUpdateCreate: boolean,
      errorFindingLatestVersion: boolean
    ) {
      // BUILD
      const transactWriteItemSpy = sinon.spy();
      AWSMock.mock(
        'DynamoDB',
        'transactWriteItems',
        (params: TransactWriteItemsInput, callback: Function) => {
          transactWriteItemSpy(params);
          callback(null, {});
        }
      );
      // new organization, create
      const managingOrgId = 'org1';
      const managingOrgResource = {
        id: managingOrgId,
        resourceType: 'Organization',
        name: 'New Org .Inc',
        meta: { lastUpdated: new Date().toISOString() }
      };
      // this org already exists, just referencing to it
      const contactOrgId = 'org2';
      const contactOrgResource = {
        id: contactOrgId,
        resourceType: 'Organization',
        name: 'Existing Ltd.',
        meta: { versionId: '7', lastUpdated: new Date().toISOString() }
      };
      // practitioner already exists but we also update it now
      const practitionerId = 'practitioner1';
      const oldPractitionerResource = {
        id: practitionerId,
        resourceType: 'Practitioner',
        name: 'James Brown',
        meta: { versionId: '2', lastUpdated: new Date().toISOString() }
      };
      // updated version included in the bundle
      const newPractitionerResource = {
        id: practitionerId,
        resourceType: 'Practitioner',
        name: 'James Dean',
        meta: { versionId: '3', lastUpdated: new Date().toISOString() }
      };
      // new patient resource with 3 references
      const patientResource = {
        id,
        resourceType: 'Patient',
        name: [
          {
            family: 'Jameson',
            given: ['Matt']
          }
        ],
        managingOrganization: {
          reference: `${apiUrl}/Organization/org1`
        },
        generalPractitioner: {
          reference: 'Practitioner/practitioner1'
        },
        contact: {
          organization: {
            reference: 'Organization/org2'
          }
        },
        meta: { versionId: '1', lastUpdated: new Date().toISOString() }
      };
      const getMostRecentResourceStub = sinon.stub(DynamoDbHelper.prototype, 'getMostRecentResource');
      if (supportUpdateCreate) {
        // in the update as create scenario the managing org looks like an update, so we try to get the most recent version
        getMostRecentResourceStub
          .withArgs('Organization', managingOrgId, 'id, resourceType, meta')
          .throws(new ResourceNotFoundError(managingOrgId, 'This organization does not exist yet'));
      }

      getMostRecentResourceStub
        .withArgs('Practitioner', practitionerId, 'id, resourceType, meta')
        .returns(Promise.resolve({ message: 'Resource found', resource: oldPractitionerResource }));

      const dynamoDb = new AWS.DynamoDB();
      let versionedLinks;
      if (useVersionedReferences) {
        versionedLinks = {
          Patient: [
            'managingOrganization.reference',
            'generalPractitioner.reference',
            'contact.organization.reference'
          ]
        };

        if (errorFindingLatestVersion) {
          getMostRecentResourceStub
            .withArgs('Organization', contactOrgId, 'meta')
            .throws(new Error('Error connecting to database'));
        } else {
          getMostRecentResourceStub
            .withArgs('Organization', contactOrgId, 'meta')
            .returns(Promise.resolve({ message: 'Resource found', resource: contactOrgResource }));
        }
      }
      const transactionService = new DynamoDbBundleService(dynamoDb, supportUpdateCreate, undefined, {
        versionedLinks
      });

      let updateOrCreateOperation = 'create';
      if (supportUpdateCreate) {
        updateOrCreateOperation = 'update';
      }
      const requestsList: BatchReadWriteRequest[] = [
        {
          operation: updateOrCreateOperation as TypeOperation,
          resourceType: 'Organization',
          id: managingOrgId,
          resource: managingOrgResource
        },
        {
          operation: 'update',
          resourceType: 'Practitioner',
          id: practitionerId,
          resource: newPractitionerResource
        },
        {
          operation: 'create',
          resourceType: 'Patient',
          id,
          resource: patientResource
        }
      ];

      // OPERATE
      const actualResponse = await transactionService.transaction({
        requests: requestsList,
        startTime: new Date()
      });

      if (errorFindingLatestVersion) {
        expect(actualResponse).toStrictEqual({
          success: false,
          message: 'Failed to find some resource versions for transaction',
          batchReadWriteResponses: [],
          errorType: 'USER_ERROR'
        });
        return;
      }

      // CHECK
      // transactWriteItem requests is called thrice
      expect(transactWriteItemSpy.calledThrice).toBeTruthy();

      // 0. change Practitioner record's documentStatus to be 'LOCKED'
      expect(transactWriteItemSpy.getCall(0).args[0]).toStrictEqual({
        TransactItems: [
          {
            Update: {
              TableName: '',
              Key: {
                id: { S: practitionerId },
                vid: { N: oldPractitionerResource.meta.versionId.toString() }
              },
              ConditionExpression:
                'resourceType = :resourceType AND (documentStatus = :oldStatus OR (lockEndTs < :currentTs AND (documentStatus = :lockStatus OR documentStatus = :pendingStatus OR documentStatus = :pendingDeleteStatus)))',
              UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
              ExpressionAttributeValues: {
                ':newStatus': { S: 'LOCKED' },
                ':lockStatus': { S: 'LOCKED' },
                ':oldStatus': { S: 'AVAILABLE' },
                ':pendingDeleteStatus': { S: 'PENDING_DELETE' },
                ':pendingStatus': { S: 'PENDING' },
                ':currentTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':futureEndTs': { N: expect.stringMatching(timeFromEpochInMsRegExp) },
                ':resourceType': { S: 'Practitioner' }
              }
            }
          }
        ]
      });

      // 1. create new records with documentStatus of 'PENDING'
      let txItems = transactWriteItemSpy.getCall(1).args[0].TransactItems;
      expect(txItems.length).toEqual(3);
      expect(txItems.map((item: any) => item.Put.Item.documentStatus.S)).toEqual([
        'PENDING',
        'PENDING',
        'PENDING'
      ]);

      // 2. change documentStatus of records
      txItems = transactWriteItemSpy.getCall(2).args[0].TransactItems;
      expect(
        txItems.map((item: any) => {
          return {
            status: item.Update.ExpressionAttributeValues[':newStatus'].S,
            resourceType: item.Update.ExpressionAttributeValues[':resourceType'].S,
            id: item.Update.Key.id.S,
            vid: item.Update.Key.vid.N
          };
        })
      ).toStrictEqual([
        {
          id: 'practitioner1',
          resourceType: 'Practitioner',
          status: 'DELETED',
          vid: '2'
        },
        {
          id: 'org1',
          resourceType: 'Organization',
          status: 'AVAILABLE',
          vid: '1'
        },
        {
          id: 'practitioner1',
          resourceType: 'Practitioner',
          status: 'AVAILABLE',
          vid: '3'
        },
        {
          id: 'bce8411e-c15e-448c-95dd-69155a837405',
          resourceType: 'Patient',
          status: 'AVAILABLE',
          vid: '1'
        }
      ]);

      expect(actualResponse.success).toEqual(true);
      expect(actualResponse.message).toEqual('Successfully committed requests to DB');
      expect(actualResponse.batchReadWriteResponses.length).toEqual(3);

      if (useVersionedReferences) {
        expect(patientResource.managingOrganization.reference).toEqual(
          `${apiUrl}/Organization/org1/_history/1`
        );
        expect(patientResource.generalPractitioner.reference).toEqual(
          'Practitioner/practitioner1/_history/3'
        );
        expect(patientResource.contact.organization.reference).toEqual('Organization/org2/_history/7');
      } else {
        expect(patientResource.managingOrganization.reference).toEqual(`${apiUrl}/Organization/org1`);
        expect(patientResource.generalPractitioner.reference).toEqual('Practitioner/practitioner1');
        expect(patientResource.contact.organization.reference).toEqual('Organization/org2');
      }
    }

    test('transaction without versioned references', async () => {
      await runTransaction(false, false, false);
    });

    test('transaction with versioned references', async () => {
      await runTransaction(true, false, false);
    });

    test('transaction with update as create and without versioned references', async () => {
      await runTransaction(false, true, false);
    });

    test('transaction with update as create and with versioned references', async () => {
      await runTransaction(true, true, false);
    });

    test('transaction with versioned references and error finding latest version', async () => {
      await runTransaction(true, false, true);
    });

    test('transaction with versioned references, update as create and error finding latest version', async () => {
      await runTransaction(true, false, true);
    });
  });
});
