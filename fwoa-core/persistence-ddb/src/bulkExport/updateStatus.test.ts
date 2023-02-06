/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import each from 'jest-each';
import sinon from 'sinon';
import DynamoDbParamBuilder from '../dataServices/dynamoDbParamBuilder';
import { BulkExportStateMachineGlobalParameters } from './types';
import { updateStatusStatusHandler } from './updateStatus';

AWSMock.setSDKInstance(AWS);

const jobOwnerId = 'owner-1';

describe('updateStatus', () => {
  const event: BulkExportStateMachineGlobalParameters = {
    jobId: '1',
    jobOwnerId,
    exportType: 'system',
    transactionTime: '',
    executionParameters: {
      glueJobRunId: 'jr_1'
    }
  };

  beforeEach(() => {
    process.env.GLUE_JOB_NAME = 'jobName';
    AWSMock.restore();
  });

  test('valid status', async () => {
    AWSMock.mock('DynamoDB', 'updateItem', (params: any, callback: Function) => {
      callback(null);
    });
    await expect(
      updateStatusStatusHandler({ globalParams: event, status: 'completed' }, null as any, null as any)
    ).resolves.toBeUndefined();
  });

  test('valid status in multi-tenancy mode', async () => {
    const updateSpy = sinon.spy();
    AWSMock.mock('DynamoDB', 'updateItem', (params: any, callback: Function) => {
      updateSpy(params);
      callback(null);
    });
    await expect(
      updateStatusStatusHandler(
        { globalParams: { ...event, tenantId: 'tenant1' }, status: 'completed' },
        null as any,
        null as any
      )
    ).resolves.toBeUndefined();
    expect(updateSpy.getCall(0).args[0]).toMatchObject(
      DynamoDbParamBuilder.buildUpdateExportRequestJobStatus('1', 'completed', 'tenant1')
    );
  });

  describe('Invalid status', () => {
    each([null, undefined, 'not-a-valid-status']).test('%j', async (status: any) => {
      await expect(
        updateStatusStatusHandler({ globalParams: event, status }, null as any, null as any)
      ).rejects.toThrowError(`Invalid status "${status}"`);
    });
  });
});
