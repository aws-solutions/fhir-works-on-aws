/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InitiateExportRequest } from '@aws/fhir-works-on-aws-interface';
import { cloneDeep } from 'lodash';
import { BulkExportJob } from '../bulkExport/types';
import { timeFromEpochInMsRegExp, utcTimeRegExp } from '../testUtilities/regExpressions';
import DOCUMENT_STATUS from './documentStatus';
import DynamoDbParamBuilder from './dynamoDbParamBuilder';

describe('buildUpdateDocumentStatusParam', () => {
  const resourceType = 'Patient';
  test('Update status correctly when there is a requirement for what the old status needs to be', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = 1;

    // Check that the old status is AVAILABLE before changing it to LOCK
    const actualParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      DOCUMENT_STATUS.AVAILABLE,
      DOCUMENT_STATUS.LOCKED,
      id,
      vid,
      resourceType
    );

    const expectedParam = {
      Update: {
        TableName: '',
        Key: {
          id: {
            S: id
          },
          vid: {
            N: vid.toString()
          }
        },
        UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
        ExpressionAttributeValues: {
          ':newStatus': {
            S: 'LOCKED'
          },
          ':oldStatus': {
            S: 'AVAILABLE'
          },
          ':pendingDeleteStatus': {
            S: 'PENDING_DELETE'
          },
          ':pendingStatus': {
            S: 'PENDING'
          },
          ':resourceType': {
            S: 'Patient'
          },
          ':lockStatus': {
            S: 'LOCKED'
          },
          ':currentTs': {
            N: expect.stringMatching(timeFromEpochInMsRegExp)
          },
          ':futureEndTs': {
            N: expect.stringMatching(timeFromEpochInMsRegExp)
          }
        },
        ConditionExpression:
          'resourceType = :resourceType AND (documentStatus = :oldStatus OR (lockEndTs < :currentTs AND (documentStatus = :lockStatus OR documentStatus = :pendingStatus OR documentStatus = :pendingDeleteStatus)))'
      }
    };

    const futureTs = Number(actualParam.Update.ExpressionAttributeValues[':futureEndTs'].N);
    const currentTs = Number(actualParam.Update.ExpressionAttributeValues[':currentTs'].N);

    expect(futureTs).toEqual(currentTs + DynamoDbParamBuilder.LOCK_DURATION_IN_MS);
    expect(actualParam).toEqual(expectedParam);
  });

  const getExpectedParamForUpdateWithoutOldStatus = (
    documentStatus: DOCUMENT_STATUS,
    id: string,
    vid: number
  ) => {
    return {
      Update: {
        TableName: '',
        Key: {
          id: {
            S: id
          },
          vid: {
            N: vid.toString()
          }
        },
        UpdateExpression: 'set documentStatus = :newStatus, lockEndTs = :futureEndTs',
        ConditionExpression: 'resourceType = :resourceType',
        ExpressionAttributeValues: {
          ':newStatus': {
            S: documentStatus
          },
          ':futureEndTs': {
            N: expect.stringMatching(timeFromEpochInMsRegExp)
          },
          ':resourceType': {
            S: 'Patient'
          }
        }
      }
    };
  };
  const wiggleRoomInMs = 1 * 300;

  test('When a document is being locked, lockEndTs should have a timestamp that expires in the future', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = 1;
    const actualParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      null,
      DOCUMENT_STATUS.LOCKED,
      id,
      vid,
      resourceType
    );

    const futureTs = Number(actualParam.Update.ExpressionAttributeValues[':futureEndTs'].N);
    // We have to generate the current time, because when there is no requirement for an oldStatus, the expected param doesn't
    // have a currentTs value as part of the query
    const currentTs = Date.now();

    // Future timeStamp should be approximately DynamoDbParamBuilder.LOCK_DURATION_IN_MS time from now
    expect(futureTs).toBeLessThanOrEqual(
      currentTs + DynamoDbParamBuilder.LOCK_DURATION_IN_MS + wiggleRoomInMs
    );
    expect(futureTs).toBeGreaterThanOrEqual(
      currentTs + DynamoDbParamBuilder.LOCK_DURATION_IN_MS - wiggleRoomInMs
    );

    expect(actualParam).toEqual(getExpectedParamForUpdateWithoutOldStatus(DOCUMENT_STATUS.LOCKED, id, vid));
  });

  test('Update Subscription', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = 1;
    const actualParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      null,
      DOCUMENT_STATUS.AVAILABLE,
      id,
      vid,
      'Subscription'
    );

    expect(actualParam).toMatchInlineSnapshot(
      {
        Update: {
          ExpressionAttributeValues: {
            ':futureEndTs': {
              N: expect.stringMatching(timeFromEpochInMsRegExp)
            }
          }
        }
      },
      `
            Object {
              "Update": Object {
                "ConditionExpression": "resourceType = :resourceType",
                "ExpressionAttributeNames": Object {
                  "#subscriptionStatus": "_subscriptionStatus",
                },
                "ExpressionAttributeValues": Object {
                  ":futureEndTs": Object {
                    "N": StringMatching /\\\\d\\{13\\}/,
                  },
                  ":newStatus": Object {
                    "S": "AVAILABLE",
                  },
                  ":resourceType": Object {
                    "S": "Subscription",
                  },
                  ":subscriptionStatus": Object {
                    "S": "active",
                  },
                },
                "Key": Object {
                  "id": Object {
                    "S": "8cafa46d-08b4-4ee4-b51b-803e20ae8126",
                  },
                  "vid": Object {
                    "N": "1",
                  },
                },
                "TableName": "",
                "UpdateExpression": "set documentStatus = :newStatus, lockEndTs = :futureEndTs, #subscriptionStatus = :subscriptionStatus",
              },
            }
        `
    );
  });

  test('Update status correctly when there is NO requirement for what the old status needs to be', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = 1;
    // Check the status to be AVAILABLE no matter what the previous status was
    const actualParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      null,
      DOCUMENT_STATUS.AVAILABLE,
      id,
      vid,
      resourceType
    );

    const futureTs = Number(actualParam.Update.ExpressionAttributeValues[':futureEndTs'].N);
    // We have to generate the current time, because when there is no requirement for an oldStatus, the expected param doesn't
    // have a currentTs value as part of the query
    const currentTs = Date.now();
    // FutureTs should be approximately now
    expect(futureTs).toBeLessThanOrEqual(currentTs + wiggleRoomInMs);
    expect(futureTs).toBeGreaterThanOrEqual(currentTs - wiggleRoomInMs);
    expect(actualParam).toEqual(
      getExpectedParamForUpdateWithoutOldStatus(DOCUMENT_STATUS.AVAILABLE, id, vid)
    );
  });

  test('tenantId present', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const vid = 1;
    const actualParam = DynamoDbParamBuilder.buildUpdateDocumentStatusParam(
      null,
      DOCUMENT_STATUS.AVAILABLE,
      id,
      vid,
      resourceType,
      'tenant1'
    );
    const expected = getExpectedParamForUpdateWithoutOldStatus(DOCUMENT_STATUS.AVAILABLE, id, vid);
    expected.Update.Key = {
      ...expected.Update.Key,
      id: {
        S: 'tenant1|8cafa46d-08b4-4ee4-b51b-803e20ae8126'
      }
    };

    expect(actualParam).toEqual(expected);
  });
});

describe('buildPutAvailableItemParam', () => {
  const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
  const vid = 1;
  const item = {
    resourceType: 'Patient',
    id,
    name: [
      {
        family: 'Jameson',
        given: ['Matt']
      }
    ],
    gender: 'male',
    meta: {
      lastUpdated: '2020-03-26T15:46:55.848Z',
      versionId: vid.toString()
    }
  };
  const expectedParams: any = {
    TableName: '',
    Item: {
      _references: {
        L: []
      },
      resourceType: {
        S: 'Patient'
      },
      id: {
        S: id
      },
      vid: {
        N: vid.toString()
      },
      name: {
        L: [
          {
            M: {
              family: {
                S: 'Jameson'
              },
              given: {
                L: [
                  {
                    S: 'Matt'
                  }
                ]
              }
            }
          }
        ]
      },
      gender: {
        S: 'male'
      },
      meta: {
        M: {
          lastUpdated: {
            S: expect.stringMatching(utcTimeRegExp)
          },
          versionId: {
            S: '1'
          }
        }
      },
      documentStatus: {
        S: 'AVAILABLE'
      },
      lockEndTs: {
        N: expect.stringMatching(timeFromEpochInMsRegExp)
      }
    },
    ConditionExpression: 'attribute_not_exists(id)'
  };

  test('Param has the fields documentStatus, lockEndTs, and references', () => {
    const actualParams = DynamoDbParamBuilder.buildPutAvailableItemParam(item, id, vid);
    expect(actualParams).toEqual(expectedParams);
  });

  test('Allow overwriting a resource', () => {
    const actualParams = DynamoDbParamBuilder.buildPutAvailableItemParam(item, id, vid, true);
    const clonedExpectedParams = cloneDeep(expectedParams);
    delete clonedExpectedParams.ConditionExpression;

    expect(actualParams).toEqual(clonedExpectedParams);
  });

  test('tenantId present', () => {
    const actualParams = DynamoDbParamBuilder.buildPutAvailableItemParam(item, id, vid, false, 'tenant1');

    const clonedExpectedParams = cloneDeep(expectedParams);
    clonedExpectedParams.Item = {
      ...clonedExpectedParams.Item,
      _tenantId: {
        S: 'tenant1'
      },
      _id: {
        S: '8cafa46d-08b4-4ee4-b51b-803e20ae8126'
      },
      id: {
        S: 'tenant1|8cafa46d-08b4-4ee4-b51b-803e20ae8126'
      }
    };

    expect(actualParams).toEqual(clonedExpectedParams);
  });
});

describe('buildGetResourcesQueryParam', () => {
  const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
  const expectedParam = {
    TableName: '',
    ScanIndexForward: false,
    Limit: 2,
    FilterExpression: '#r = :resourceType',
    KeyConditionExpression: 'id = :hkey',
    ExpressionAttributeNames: { '#r': 'resourceType' },
    ExpressionAttributeValues: {
      ':hkey': { S: '8cafa46d-08b4-4ee4-b51b-803e20ae8126' },
      ':resourceType': { S: 'Patient' }
    }
  };
  test('Param without projection expression', () => {
    const actualParam = DynamoDbParamBuilder.buildGetResourcesQueryParam(id, 'Patient', 2);
    expect(actualParam).toEqual(expectedParam);
  });

  test('Param with projection expression', () => {
    const projectionExpression = 'id, resourceType, name';
    const actualParam = DynamoDbParamBuilder.buildGetResourcesQueryParam(
      id,
      'Patient',
      2,
      projectionExpression
    );

    const clonedExpectedParam: any = cloneDeep(expectedParam);
    clonedExpectedParam.ProjectionExpression = projectionExpression;

    expect(actualParam).toEqual(clonedExpectedParam);
  });

  test('tenantId present', () => {
    const actualParam = DynamoDbParamBuilder.buildGetResourcesQueryParam(
      id,
      'Patient',
      2,
      undefined,
      'tenant1'
    );

    const clonedExpectedParam: any = cloneDeep(expectedParam);
    clonedExpectedParam.ExpressionAttributeValues = {
      ...clonedExpectedParam.ExpressionAttributeValues,
      ':hkey': {
        S: 'tenant1|8cafa46d-08b4-4ee4-b51b-803e20ae8126'
      }
    };

    expect(actualParam).toEqual(clonedExpectedParam);
  });
});

describe('buildPutCreateExportRequest', () => {
  const jobId = 'job-1';
  const exportType = 'system';
  const transactionTime = '2020-10-10T00:00:00.000Z';
  const since = '2020-10-09T00:00:00.000Z';
  const outputFormat = 'ndjson';

  const job: BulkExportJob = {
    jobId,
    jobStatus: 'in-progress',
    jobOwnerId: 'owner-1',
    exportType,
    transactionTime,
    outputFormat,
    since,
    type: 'Patient,DocumentReference'
  };

  const initiateExportRequest: InitiateExportRequest = {
    allowedResourceTypes: ['Patient'],
    exportType: 'system',
    requesterUserId: 'fakeUserId',
    transactionTime,
    type: 'Patient'
  };

  const jobWithTenantId: BulkExportJob = {
    ...job,
    tenantId: 'tenant1'
  };

  const expectedParam = {
    TableName: '',
    Item: {
      exportType: {
        S: 'system'
      },
      jobId: {
        S: 'job-1'
      },
      jobOwnerId: {
        S: 'owner-1'
      },
      jobStatus: {
        S: 'in-progress'
      },
      outputFormat: {
        S: 'ndjson'
      },
      since: {
        S: '2020-10-09T00:00:00.000Z'
      },
      transactionTime: {
        S: '2020-10-10T00:00:00.000Z'
      },
      type: {
        S: 'Patient'
      }
    }
  };
  test('Job without tenantId', () => {
    const actualParam = DynamoDbParamBuilder.buildPutCreateExportRequest(job, initiateExportRequest);
    console.log(actualParam);
    expect(actualParam).toEqual(expectedParam);
  });

  test('tenantId present', () => {
    const actualParam = DynamoDbParamBuilder.buildPutCreateExportRequest(
      jobWithTenantId,
      initiateExportRequest
    );

    const clonedExpectedParam: any = cloneDeep(expectedParam);
    clonedExpectedParam.Item = {
      ...clonedExpectedParam.Item,
      jobId: {
        S: 'tenant1|job-1'
      },
      _jobId: {
        S: 'job-1'
      },
      tenantId: {
        S: 'tenant1'
      }
    };

    expect(actualParam).toEqual(clonedExpectedParam);
  });
});

describe('buildUpdateExportRequestJobStatus', () => {
  const jobId = 'job-1';
  const jobStatus = 'completed';

  const expectedParam = {
    TableName: '',
    Key: { jobId: { S: jobId } },
    UpdateExpression: 'set jobStatus = :newStatus',
    ConditionExpression: 'jobId = :jobIdVal',
    ExpressionAttributeValues: {
      ':newStatus': { S: jobStatus },
      ':jobIdVal': { S: jobId }
    }
  };

  test('Job without tenantId', () => {
    const actualParam = DynamoDbParamBuilder.buildUpdateExportRequestJobStatus(jobId, jobStatus);
    console.log(actualParam);
    expect(actualParam).toEqual(expectedParam);
  });

  test('tenantId present', () => {
    const tenantId = 'tenant1';
    const hashKey = `${tenantId}|${jobId}`;
    const actualParam = DynamoDbParamBuilder.buildUpdateExportRequestJobStatus(jobId, jobStatus, tenantId);

    const clonedExpectedParam: any = cloneDeep(expectedParam);
    clonedExpectedParam.Key.jobId.S = hashKey;
    clonedExpectedParam.ExpressionAttributeValues[':jobIdVal'].S = hashKey;

    expect(actualParam).toEqual(clonedExpectedParam);
  });
});

describe('buildGetActiveSubscriptions', () => {
  const expectedParam = {
    TableName: '',
    IndexName: 'activeSubscriptions',
    KeyConditionExpression: '#subscriptionStatus = :active',
    ExpressionAttributeValues: {
      ':active': { S: 'active' }
    },
    ExpressionAttributeNames: {
      '#subscriptionStatus': '_subscriptionStatus'
    }
  };
  test('Param without tenantId', () => {
    const actualParam = DynamoDbParamBuilder.buildGetActiveSubscriptions();
    expect(actualParam).toEqual(expectedParam);
  });

  test('tenantId present', () => {
    const actualParam = DynamoDbParamBuilder.buildGetActiveSubscriptions('tenant1');
    expect(actualParam).toMatchInlineSnapshot(`
            Object {
              "ExpressionAttributeNames": Object {
                "#subscriptionStatus": "_subscriptionStatus",
              },
              "ExpressionAttributeValues": Object {
                ":active": Object {
                  "S": "active",
                },
                ":tenantId": Object {
                  "S": "tenant1",
                },
              },
              "IndexName": "activeSubscriptions",
              "KeyConditionExpression": "#subscriptionStatus = :active AND begins_with(id,:tenantId)",
              "TableName": "",
            }
        `);
  });
});
