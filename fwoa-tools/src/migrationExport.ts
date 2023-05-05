/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { S3 } from 'aws-sdk';
import { AxiosInstance } from 'axios';
import ExportHelper from './exportHelper';
import { getFhirClient, getFhirClientSMART } from './migrationUtils';

const MAX_CONCURRENT_REQUESTS: number = 100;

if (process.argv.length < 3) {
  throw new Error(
    'Invalid arguments. Usage: ts-node migrationExport.ts <smart-on-fhir: boolean> <since?: ISO timestamp>'
  );
}
// collect optional arguments
const smartClient: boolean = Boolean(process.argv[2]);
let since: string;
if (process.argv.length >= 4) {
  since = process.argv[3];
  try {
    since = new Date(since).toISOString();
  } catch (error) {
    throw new Error('Provided `since` parameter is not in correct format (ISO 8601)');
  }
}

const fhirClient: AxiosInstance = await (smartClient ? getFhirClientSMART() : getFhirClient());
const exportHelper: ExportHelper = new ExportHelper(fhirClient);

async function startExport(): Promise<{
  jobId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportResponse: any;
}> {
  const exportJobUrl: string = await exportHelper.startExportJob({ since });
  const response = await exportHelper.getExportStatus(exportJobUrl);

  // return the last element of the split array, which is the jobId portion of the url
  const jobId = exportJobUrl.split('/').pop();

  return { jobId: jobId!, exportResponse: response };
}

async function sortExportIntoFolders(bucket: string, prefix: string): Promise<void> {
  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });

  // to copy the s3 files to a different bucket, you can replace the
  // third parameter with a different bucket
  await exportHelper.copyAll(s3Client, bucket, bucket, prefix, MAX_CONCURRENT_REQUESTS);
}

startExport()
  .then(async (response) => {
    console.log('successfully completed export.');
    if (response.exportResponse.output.length === 0) {
      return;
    }
    const url: string = response.exportResponse.output[0].url;
    // url always starts with the following:
    // https://(smart-)fhir-service-dev-<bucketName>.s3.<region>.amazonaws.com/
    //                                              ^ split here first
    //           then here ^           ^ take last split
    const bucketName = url.split('.')[0].split('-').pop()!;
    await sortExportIntoFolders(bucketName, `${response.jobId}/`);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
