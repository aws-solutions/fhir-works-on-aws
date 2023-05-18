/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { writeFileSync } from 'fs';
import { S3 } from 'aws-sdk';
import { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import yargs from 'yargs';
import ExportHelper from './exportHelper';
import { ExportOutput, MS_TO_HOURS, getFhirClient, getFhirClientSMART } from './migrationUtils';

dotenv.config({ path: '.env' });
const MAX_CONCURRENT_REQUESTS: number = 100;
const EXPORT_OUTPUT_LOG_FILE_PREFIX: string = 'export_output_';
const bucketName: string | undefined = process.env.EXPORT_BUCKET_NAME;
if (!bucketName) {
  throw new Error('EXPORT_BUCKET_NAME environment variable is not defined');
}

const logs: string[] = [];

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
let output: ExportOutput = {
  jobId: '',
  folderNames: [],
  itemNames: {}
};

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
  const startTime = new Date();
  logs.push(`${startTime.toISOString()}: Started Export`);
  const response = await exportHelper.getExportStatus(exportJobUrl);
  const finishTime = new Date();
  logs.push(
    `${new Date().toISOString()}: Completed Export. Elapsed Time - ${
      Math.abs(startTime.getTime() - finishTime.getTime()) / MS_TO_HOURS
    } hours`
  );

  // return the last element of the split array, which is the jobId portion of the url
  const jobId = exportJobUrl.split('/').pop();
  logs.push(`${new Date().toISOString()}: Export JobId - ${jobId}`);
  output.jobId = jobId!;

  return { jobId: jobId!, exportResponse: response };
}

async function sortExportIntoFolders(bucket: string, prefix: string): Promise<ExportOutput> {
  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });

  // to copy the s3 files to a different bucket, you can replace the
  // third parameter with a different bucket
  return await exportHelper.copyAll(s3Client, bucket, bucket, prefix, MAX_CONCURRENT_REQUESTS, logs);
}

async function checkConfiguration(): Promise<void> {
  fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  console.log('Successfully authenticated to FHIR Server...');

  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });
  await s3Client.listObjectsV2({ Bucket: bucketName! }).promise();
  console.log('Sucessfully authenticated with S3');
}

if (!dryRun) {
  startExport()
    .then(async (response) => {
      console.log('successfully completed export.');
      if (response.exportResponse.output.length === 0) {
        return;
      }
      const names = await sortExportIntoFolders(bucketName, `${response.jobId}/`);
      output = {
        jobId: output.jobId,
        folderNames: names.folderNames,
        itemNames: names.itemNames
      };
      logs.push(`${new Date().toISOString()}: Finished sorting export objects into folders.`);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      writeFileSync(`${EXPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`, logs.join('\n'));
      writeFileSync('./migrationExport_Output.txt', JSON.stringify(output));
    })
    .catch((error) => {
      console.error('Error:', error);
      logs.push(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      writeFileSync(`${EXPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`, logs.join('\n'));
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
