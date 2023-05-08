/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { S3 } from 'aws-sdk';
import { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import yargs from 'yargs';
import ExportHelper from './exportHelper';
import { getFhirClient, getFhirClientSMART } from './migrationUtils';

dotenv.config({ path: '.env' });
const MAX_CONCURRENT_REQUESTS: number = 100;
const bucketName: string | undefined = process.env.EXPORT_BUCKET_NAME;
if (!bucketName) {
  throw new Error('EXPORT_BUCKET_NAME environment variable is not defined');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCmdOptions(): any {
  return yargs(process.argv.slice(2))
    .usage('Usage: $0 [--smart, -s boolean] [--dryRun, -d boolean] [--since, -t timestamp ]')
    .describe('smart', 'Whether the FWoA deployment is SMART-on-FHIR or not')
    .boolean('smart')
    .default('smart', false)
    .alias('s', 'smart')
    .describe('dryRun', 'Check operations and authentication status')
    .boolean('dryRun')
    .default('dryRun', false)
    .alias('d', 'dryRun')
    .describe('since', 'Optional: timestamp from which to start export')
    .alias('t', 'since')
    .default('since', null).argv;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const argv: any = parseCmdOptions();

const smartClient: boolean = argv.smart;
const dryRun: boolean = argv.dryRun;
let since: string = argv.since;

if (since) {
  try {
    since = new Date(since).toISOString();
  } catch (e) {
    throw new Error('Provided since timestamp not in correct format (ISO 8601)');
  }
}

let fhirClient: AxiosInstance;
let exportHelper: ExportHelper;

async function startExport(): Promise<{
  jobId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportResponse: any;
}> {
  fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  exportHelper = new ExportHelper(fhirClient, smartClient);
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

async function checkConfiguration(): Promise<void> {
  fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  console.log('Successfully authenticated to FHIR Server...');

  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });
  s3Client
    .listObjectsV2({ Bucket: bucketName! })
    .promise()
    .then((value) => {
      console.log('Successfully authenticated S3 Client...');
    })
    .catch((error) => {
      console.log(error);
      console.log('Failed to authenticate to S3...');
    });
}

if (!dryRun) {
  startExport()
    .then(async (response) => {
      console.log('successfully completed export.');
      if (response.exportResponse.output.length === 0) {
        return;
      }
      await sortExportIntoFolders(bucketName, `${response.jobId}/`);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
} else {
  // check permissions and setup instead
  checkConfiguration()
    .then((value) => {
      console.log('All Checks successful!');
    })
    .catch((error) => {
      console.log('Some checks failed...');
      console.error(error);
    });
}
