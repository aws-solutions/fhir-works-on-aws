/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';
import { QueryInput } from 'aws-sdk/clients/dynamodb';
import * as AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import { DynamoDBConverter } from '../dataServices/dynamoDb';
import DynamoDbParamBuilder from '../dataServices/dynamoDbParamBuilder';
import { getJobStatusHandler } from './getJobStatus';
import { BulkExportStateMachineGlobalParameters } from './types';

AWSMock.setSDKInstance(AWS);

const jobOwnerId = 'owner-1';

describe('getJobStatus', () => {
  beforeEach(() => {
    process.env.GLUE_JOB_NAME = 'jobName';
    AWSMock.restore();
  });

  test('completed job', async () => {
    const event: BulkExportStateMachineGlobalParameters = {
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1'
      }
    };
    process.env.GLUE_JOB_NAME = 'jobName';
    AWSMock.mock('Glue', 'getJobRun', (params: any, callback: Function) => {
      callback(null, {
        JobRun: {
          JobRunState: 'SUCCEEDED'
        }
      });
    });
    AWSMock.mock('DynamoDB', 'getItem', (params: QueryInput, callback: Function) => {
      callback(null, {
        Item: DynamoDBConverter.marshall({
          jobId: '2a937fe2-8bb1-442b-b9be-434c94f30e15',
          jobStatus: 'in-progress'
        })
      });
    });
    await expect(getJobStatusHandler(event, null as any, null as any)).resolves.toEqual({
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1',
        glueJobRunStatus: 'SUCCEEDED',
        isCanceled: false
      }
    });
  });

  test('completed job in multi-tenancy mode', async () => {
    const event: BulkExportStateMachineGlobalParameters = {
      jobId: '1',
      jobOwnerId,
      tenantId: 'tenant1',
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1'
      }
    };
    process.env.GLUE_JOB_NAME = 'jobName';
    AWSMock.mock('Glue', 'getJobRun', (params: any, callback: Function) => {
      callback(null, {
        JobRun: {
          JobRunState: 'SUCCEEDED'
        }
      });
    });
    const getItemSpy = sinon.spy();
    AWSMock.mock('DynamoDB', 'getItem', (params: QueryInput, callback: Function) => {
      getItemSpy(params);
      callback(null, {
        Item: DynamoDBConverter.marshall({
          jobId: 'tenan1|2a937fe2-8bb1-442b-b9be-434c94f30e15',
          jobStatus: 'in-progress'
        })
      });
    });
    await expect(getJobStatusHandler(event, null as any, null as any)).resolves.toEqual({
      jobId: '1',
      jobOwnerId,
      tenantId: 'tenant1',
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1',
        glueJobRunStatus: 'SUCCEEDED',
        isCanceled: false
      }
    });
    expect(getItemSpy.getCall(0).args[0]).toMatchObject(
      DynamoDbParamBuilder.buildGetExportRequestJob('tenant1|1')
    );
  });

  test('failed job', async () => {
    const event: BulkExportStateMachineGlobalParameters = {
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1'
      }
    };
    AWSMock.mock('Glue', 'getJobRun', (params: any, callback: Function) => {
      callback(null, {
        JobRun: {
          JobRunState: 'FAILED'
        }
      });
    });
    AWSMock.mock('DynamoDB', 'getItem', (params: QueryInput, callback: Function) => {
      callback(null, {
        Item: DynamoDBConverter.marshall({
          jobId: '2a937fe2-8bb1-442b-b9be-434c94f30e15',
          jobStatus: 'in-progress'
        })
      });
    });
    await expect(getJobStatusHandler(event, null as any, null as any)).resolves.toEqual({
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1',
        glueJobRunStatus: 'FAILED',
        isCanceled: false
      }
    });
  });

  test('canceled job', async () => {
    const event: BulkExportStateMachineGlobalParameters = {
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1'
      }
    };
    AWSMock.mock('Glue', 'getJobRun', (params: any, callback: Function) => {
      callback(null, {
        JobRun: {
          JobRunState: 'RUNNING'
        }
      });
    });
    AWSMock.mock('DynamoDB', 'getItem', (params: QueryInput, callback: Function) => {
      callback(null, {
        Item: DynamoDBConverter.marshall({
          jobId: '2a937fe2-8bb1-442b-b9be-434c94f30e15',
          jobStatus: 'canceling'
        })
      });
    });
    await expect(getJobStatusHandler(event, null as any, null as any)).resolves.toEqual({
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1',
        glueJobRunStatus: 'RUNNING',
        isCanceled: true
      }
    });
  });

  test('missing env variables ', async () => {
    delete process.env.GLUE_JOB_NAME;
    const event: BulkExportStateMachineGlobalParameters = {
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: '',
      executionParameters: {
        glueJobRunId: 'jr_1'
      }
    };
    await expect(getJobStatusHandler(event, null as any, null as any)).rejects.toThrow(
      'GLUE_JOB_NAME environment variable is not defined'
    );
  });

  test('missing glueJobRunId ', async () => {
    const event: BulkExportStateMachineGlobalParameters = {
      jobId: '1',
      jobOwnerId,
      exportType: 'system',
      transactionTime: ''
    };
    await expect(getJobStatusHandler(event, null as any, null as any)).rejects.toThrow(
      'executionParameters.glueJobRunId is missing in input event'
    );
  });
});
