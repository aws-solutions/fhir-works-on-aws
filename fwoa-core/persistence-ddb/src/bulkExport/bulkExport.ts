/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import AWS from '../AWS';
import { BulkExportResultsUrlGenerator } from './bulkExportResultsUrlGenerator';
import { BulkExportJob } from './types';

const EXPORT_RESULTS_BUCKET = process.env.EXPORT_RESULTS_BUCKET || ' ';
const EXPORT_STATE_MACHINE_ARN = process.env.EXPORT_STATE_MACHINE_ARN || '';

const getFiles = async (prefix: string): Promise<string[]> => {
  const s3 = new AWS.S3();

  const listObjectsResult = await s3
    .listObjectsV2({ Bucket: EXPORT_RESULTS_BUCKET, Prefix: prefix })
    .promise();
  return listObjectsResult.Contents!.map((x) => x.Key!);
};

const getResourceType = (key: string, prefix: string): string => {
  const regex = new RegExp(`^${prefix}/([A-Za-z]+)-\\d+.ndjson$`);
  const match = regex.exec(key);
  if (match === null) {
    throw new Error(`Could not parse the name of bulk exports result file: ${key}`);
  }
  return match[1];
};

export const getBulkExportResults = async (
  bulkExportResultsUrlGenerator: BulkExportResultsUrlGenerator,
  jobId: string,
  tenantId?: string
): Promise<{ requiresAccessToken: boolean; exportedFileUrls: { type: string; url: string }[] }> => {
  const prefix = tenantId ? `${tenantId}/${jobId}` : jobId;
  const keys = await getFiles(prefix);

  const resultUrls: { requiresAccessToken: boolean; urls: string[] } =
    await bulkExportResultsUrlGenerator.getUrls({
      exportBucket: EXPORT_RESULTS_BUCKET,
      s3Keys: keys
    });

  return {
    requiresAccessToken: resultUrls.requiresAccessToken,
    exportedFileUrls: resultUrls.urls.map((url, i) => ({
      url,
      type: getResourceType(keys[i], prefix)
    }))
  };
};

export const startJobExecution = async (bulkExportJob: BulkExportJob): Promise<void> => {
  const {
    jobId,
    jobOwnerId,
    exportType,
    groupId,
    type,
    transactionTime,
    outputFormat,
    since,
    tenantId,
    serverUrl,
    compartmentSearchParamFile
  } = bulkExportJob;
  const params: any = {
    jobId,
    jobOwnerId,
    exportType,
    transactionTime,
    since,
    outputFormat
  };
  if (groupId) {
    params.groupId = groupId;
    params.serverUrl = serverUrl;
    params.compartmentSearchParamFile = compartmentSearchParamFile;
  }
  if (type) {
    params.type = type;
  }
  if (tenantId) {
    params.tenantId = tenantId;
  }

  await new AWS.StepFunctions()
    .startExecution({
      stateMachineArn: EXPORT_STATE_MACHINE_ARN,
      name: jobId,
      input: JSON.stringify(params)
    })
    .promise();
};
