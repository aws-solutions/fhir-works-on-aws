/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import * as AWSMock from 'aws-sdk-mock';
import AWS from '../AWS';
import { getBulkExportResults, startJobExecution } from './bulkExport';
import { BulkExportS3PresignedUrlGenerator } from './bulkExportS3PresignedUrlGenerator';
import { BulkExportJob } from './types';

AWSMock.setSDKInstance(AWS);

describe('getBulkExportResults', () => {
  let bulkExportS3PresignedUrlGenerator: BulkExportS3PresignedUrlGenerator;
  beforeEach(() => {
    process.env.GLUE_JOB_NAME = 'jobName';
    AWSMock.restore();

    AWSMock.mock('STS', 'assumeRole', (params: any, callback: Function) => {
      callback(null, {
        Credentials: { AccessKeyId: 'xxx', SecretAccessKey: 'xxx', SessionToken: 'xxx' }
      });
    });

    AWSMock.mock('S3', 'getSignedUrl', (apiCallToSign: any, params: any, callback: Function) => {
      callback(null, 'https://somePresignedUrl');
    });
    bulkExportS3PresignedUrlGenerator = new BulkExportS3PresignedUrlGenerator();
  });

  test('happy case', async () => {
    AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
      callback(null, {
        Contents: [{ Key: 'job-1/Patient-1.ndjson' }, { Key: 'job-1/Observation-1.ndjson' }]
      });
    });

    await expect(getBulkExportResults(bulkExportS3PresignedUrlGenerator, 'job-1')).resolves.toEqual({
      requiresAccessToken: false,
      exportedFileUrls: [
        { type: 'Patient', url: 'https://somePresignedUrl' },
        { type: 'Observation', url: 'https://somePresignedUrl' }
      ]
    });
  });

  test('happy case with tenantId', async () => {
    AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
      expect(params.Prefix).toEqual('tenant1/job-1');
      callback(null, {
        Contents: [{ Key: 'tenant1/job-1/Patient-1.ndjson' }, { Key: 'tenant1/job-1/Observation-1.ndjson' }]
      });
    });

    await expect(
      getBulkExportResults(bulkExportS3PresignedUrlGenerator, 'job-1', 'tenant1')
    ).resolves.toEqual({
      requiresAccessToken: false,
      exportedFileUrls: [
        { type: 'Patient', url: 'https://somePresignedUrl' },
        { type: 'Observation', url: 'https://somePresignedUrl' }
      ]
    });
  });

  test('no results', async () => {
    AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
      callback(null, {
        Contents: []
      });
    });

    await expect(getBulkExportResults(bulkExportS3PresignedUrlGenerator, 'job-1')).resolves.toEqual({
      exportedFileUrls: [],
      requiresAccessToken: false
    });
  });

  test('filenames with unknown format', async () => {
    AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
      callback(null, {
        Contents: [{ Key: 'job-1/BadFilenameFormat$$.exe' }, { Key: 'job-1/Observation-1.ndjson' }]
      });
    });

    await expect(getBulkExportResults(bulkExportS3PresignedUrlGenerator, 'job-1')).rejects.toThrowError(
      'Could not parse the name of bulk exports result file: job-1/BadFilenameFormat$$.exe'
    );
  });
});

describe('startJobExecution', () => {
  beforeEach(() => {
    AWSMock.restore();
  });

  const jobId = 'job-1';
  const jobOwnerId = 'owner-1';
  const exportType = 'system';
  const transactionTime = '2020-10-10T00:00:00.000Z';
  const since = '2020-10-09T00:00:00.000Z';
  const outputFormat = 'ndjson';

  test('starts step functions execution', async () => {
    const mockStartExecution = jest.fn((params: any, callback: Function) => {
      callback(null);
    });
    AWSMock.mock('StepFunctions', 'startExecution', mockStartExecution);

    const job: BulkExportJob = {
      jobId,
      jobStatus: 'in-progress',
      jobOwnerId,
      exportType,
      transactionTime,
      outputFormat,
      since
    };

    const expectedInput = {
      jobId,
      jobOwnerId,
      exportType,
      transactionTime,
      since,
      outputFormat
    };

    await startJobExecution(job);
    expect(mockStartExecution).toHaveBeenCalledWith(
      {
        input: JSON.stringify(expectedInput),
        name: 'job-1',
        stateMachineArn: ''
      },
      expect.anything() // we don't care about the callback function. It is managed by the sdk
    );
  });

  test('starts step functions execution in multi-tenancy mode', async () => {
    const mockStartExecution = jest.fn((params: any, callback: Function) => {
      callback(null);
    });
    AWSMock.mock('StepFunctions', 'startExecution', mockStartExecution);

    const tenantId = 'tenantId';
    const job: BulkExportJob = {
      jobId,
      jobStatus: 'in-progress',
      jobOwnerId,
      exportType,
      transactionTime,
      outputFormat,
      since,
      tenantId
    };

    const expectedInput = {
      jobId,
      jobOwnerId,
      exportType,
      transactionTime,
      since,
      outputFormat,
      tenantId
    };

    await startJobExecution(job);
    expect(mockStartExecution).toHaveBeenCalledWith(
      {
        input: JSON.stringify(expectedInput),
        name: 'job-1',
        stateMachineArn: ''
      },
      expect.anything() // we don't care about the callback function. It is managed by the sdk
    );
  });
});
