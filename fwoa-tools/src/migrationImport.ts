/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { existsSync, readFileSync, WriteStream, createWriteStream, writeFileSync } from 'fs';
import { HealthLake, S3 } from 'aws-sdk';
import { StartFHIRImportJobRequest } from 'aws-sdk/clients/healthlake';
import { ListObjectsV2Output } from 'aws-sdk/clients/s3';
import { aws4Interceptor } from 'aws4-axios';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import yargs from 'yargs';
import {
  EXPORT_STATE_FILE_NAME,
  ExportOutput,
  MS_TO_HOURS,
  POLLING_TIME,
  sleep,
  checkConfiguration,
  HEALTHLAKE_BUNDLE_LIMIT,
  Bundle,
  getEmptyFHIRBundle,
  EXTENDED_POLLING_TIME
} from './migrationUtils';

dotenv.config({ path: '.env' });
const { API_AWS_REGION, HEALTHLAKE_CLIENT_TOKEN } = process.env;

const MAX_IMPORT_RUNTIME: number = 48 * 60 * 60 * 1000; // 48 hours
const BUNDLE_RETRY_SLEEP_TIME: number = 2000;
const IMPORT_RETRY_SLEEP_TIME: number = 60000;
const IMPORT_OUTPUT_LOG_FILE_PREFIX: string = 'import_output_';
const IMPORT_STATE_FILE_NAME: string = 'import_state.txt';
const successfullyCompletedFolders: string[] = [];

export const MAX_IMPORT_RETRIES: number = 3;

// eslint-disable-next-line security/detect-non-literal-fs-filename
export const logs: WriteStream = createWriteStream(
  `${IMPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`,
  {
    flags: 'a'
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCmdOptions(): any {
  return yargs(process.argv.slice(2))
    .usage('Usage: $0 [--dryRun, -d boolean] [--continueOnError, -c boolean]')
    .describe('dryRun', 'Check operations and authentication status')
    .boolean('dryRun')
    .default('dryRun', false)
    .alias('d', 'dryRun')
    .describe('continueOnError', 'Check operations and authentication status')
    .boolean('continueOnError')
    .default('continueOnError', false)
    .alias('c', 'continueOnError').argv;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const argv: any = parseCmdOptions();
const dryRun: boolean = argv.dryRun;
const continueOnError: boolean = argv.continueOnError;

const successfulJobStatuses: string[] = continueOnError
  ? ['COMPLETED', 'COMPLETED_WITH_ERRORS']
  : ['COMPLETED'];

export async function startImport(
  folderNames: string[],
  jobId: string,
  outputFile: ExportOutput
): Promise<void> {
  let i: number = 0;
  // To see if we have completed folders to skip importing
  if (existsSync(`${IMPORT_STATE_FILE_NAME}`)) {
    const folders = JSON.parse(readFileSync(`${IMPORT_STATE_FILE_NAME}`).toString());
    i = folders.length;
    // append previous successful imports
    successfullyCompletedFolders.push(...folders);
  }

  const healthLake: HealthLake = new HealthLake({
    region: API_AWS_REGION
  });

  let retryAttempts = 0;
  for (i; i < folderNames.length; i += 1) {
    // eslint-disable-next-line security/detect-object-injection
    const folderName = folderNames[i];
    console.log(`Starting import for folder ${folderName}`);
    const startTime = new Date();
    logs.write(`${startTime.toISOString()}: Start Import for folder ${folderName}...\n`);
    let tenantPrefix = '';
    if (process.env.MIGRATION_TENANT_ID) {
      tenantPrefix = `${process.env.MIGRATION_TENANT_ID}/`;
    }
    const params: StartFHIRImportJobRequest = {
      InputDataConfig: {
        S3Uri: `s3://${process.env.EXPORT_BUCKET_NAME}/${tenantPrefix}${jobId}/${folderName}`
      },
      // Job Names must be less than 64 characters in length
      JobName: `FWoAFolderMigration-${folderName}`.substring(0, 64),
      DatastoreId: process.env.DATASTORE_ID!,
      DataAccessRoleArn: process.env.DATA_ACCESS_ROLE_ARN!,
      JobOutputDataConfig: {
        S3Configuration: {
          S3Uri: process.env.IMPORT_OUTPUT_S3_URI!,
          KmsKeyId: process.env.IMPORT_KMS_KEY_ARN!
        }
      },
      ClientToken: HEALTHLAKE_CLIENT_TOKEN || uuidv4()
    };
    try {
      const importJob = await healthLake.startFHIRImportJob(params).promise();
      console.log(`successfully started import job, checking status at ${importJob.JobId}`);
      logs.write(`${new Date().toISOString()}: Started Import Job, JobId - ${importJob.JobId}\n`);
      const cutOffTime = new Date(new Date().getTime() + MAX_IMPORT_RUNTIME);
      while (new Date().getTime() < cutOffTime.getTime()) {
        try {
          const jobStatus = await healthLake
            .describeFHIRImportJob({
              DatastoreId: process.env.DATASTORE_ID!,
              JobId: importJob.JobId
            })
            .promise();
          if (successfulJobStatuses.includes(jobStatus.ImportJobProperties.JobStatus)) {
            const finishTime = new Date();
            console.log(`successfully imported folder ${folderName}`);
            logs.write(
              `${finishTime.toISOString()}: Import Job for folder ${folderName} succeeded! Elapsed Time: ${
                Math.abs(startTime.getTime() - finishTime.getTime()) / MS_TO_HOURS
              }\n`
            );

            await sleep(POLLING_TIME);
            await deleteFhirResourceFromHealthLakeIfNeeded(folderName, outputFile);
            logs.write(`${new Date().toISOString()}: Import of folder ${folderName} import succeeded!\n`);
            successfullyCompletedFolders.push(folderName);
            break;
          } else if (
            jobStatus.ImportJobProperties.JobStatus === 'FAILED' ||
            jobStatus.ImportJobProperties.JobStatus === 'COMPLETED_WITH_ERRORS'
          ) {
            throw new Error(
              `Import Job for folder ${folderName} failed! Job Id: ${importJob.JobId}. Error: ${jobStatus.$response.error}.`
            );
          }
          // eslint-disable-next-line no-await-in-loop
          await sleep(EXTENDED_POLLING_TIME);
        } catch (e) {
          console.error('Failed to check import status', e);
          throw e;
        }
      }

      if (new Date().getTime() >= cutOffTime.getTime()) {
        throw new Error(
          `Expected import status did not occur during polling time frame of ${
            MAX_IMPORT_RUNTIME / 1000
          } seconds`
        );
      }
    } catch (e) {
      if (e.message.includes('Rate exceeded') || e.message.includes('429')) {
        // Only 1 import job allowed per minute by default
        logs.write(`${new Date().toISOString()}: Failed Import Job for folder ${folderName}, retrying...\n`);
        retryAttempts += 1;
        if (retryAttempts > MAX_IMPORT_RETRIES) {
          throw new Error(`Exceeded Retry limit for folder ${folderName}`);
        }
        await sleep(IMPORT_RETRY_SLEEP_TIME * retryAttempts);
        i -= 1;
      } else {
        throw new Error(`Error trying to start import for ${folderName}`);
      }
    }
  }
}

export async function checkFolderSizeOfResource(resources: string[], jobId: string): Promise<void> {
  logs.write(`${new Date().toISOString()}: Start checkFolderSizeOfResource \n`);
  const s3Client = new S3({
    region: API_AWS_REGION!
  });
  for (let i = 0; i < resources.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const resource = resources[i];

    if (resource.startsWith('Binary')) {
      continue;
    }
    console.log(`Checking resource ${resource}`);
    const maximumFolderSize = 536870912000; // 500 GB in bytes

    let folderSize = 0;
    let continuationToken: string | undefined = undefined;
    const prefix = process.env.MIGRATION_TENANT_ID
      ? `${process.env.MIGRATION_TENANT_ID}/${jobId}/${resource}`
      : `${jobId}/${resource}`;
    do {
      const response: ListObjectsV2Output = await s3Client
        .listObjectsV2({
          Bucket: process.env.EXPORT_BUCKET_NAME!,
          Prefix: prefix,
          ContinuationToken: continuationToken
        })
        .promise();
      if (response.Contents) {
        response.Contents.forEach((item) => {
          if (item.Size) {
            folderSize += item.Size;
          }
        });
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    if (folderSize > maximumFolderSize) {
      throw new Error(
        `Resource ${resource} has a folder size of ${folderSize} bytes, which is larger than the maximum folder size of ${maximumFolderSize} bytes`
      );
    } else {
      console.log(
        `${resource} folder size is ${folderSize} bytes. This is within maximum folder size limit.`
      );
    }
    logs.write(`${new Date().toISOString()}: Finish checkFolderSizeOfResource \n`);
  }
}

export async function checkConvertedBinaryFileSize(jobId: string): Promise<void> {
  logs.write(`${new Date().toISOString()}: Start checkConvertedBinaryFileSize \n`);
  console.log('Checking Binary file size');
  const s3Client = new S3({
    region: API_AWS_REGION!
  });
  const maximumBinaryFileSize = 5368709120; // 5 GB in bytes
  const convertedBinaryFolderName = 'Binary';
  let continuationToken: string | undefined = undefined;
  const prefix = process.env.MIGRATION_TENANT_ID
    ? `${process.env.MIGRATION_TENANT_ID}/${jobId}/${convertedBinaryFolderName}`
    : `${jobId}/${convertedBinaryFolderName}`;
  do {
    const response: ListObjectsV2Output = await s3Client
      .listObjectsV2({
        Bucket: process.env.EXPORT_BUCKET_NAME!,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
      .promise();
    if (response.Contents) {
      response.Contents.forEach((item) => {
        if (item.Size && item.Size > maximumBinaryFileSize) {
          throw new Error(
            `Binary resource ${item.Key} has a file size of ${item.Size}, which is larger than the maximum file size of ${maximumBinaryFileSize} bytes`
          );
        }
      });
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  console.log(`All converted binary files are within the size limit of ${maximumBinaryFileSize}`);
  logs.write(`${new Date().toISOString()}: Finish checkConvertedBinaryFileSize \n`);
}

export async function deleteFhirResourceFromHealthLakeIfNeeded(
  folderName: string,
  outputFile: ExportOutput
): Promise<void> {
  let deleteQueue: string[] = [];
  // eslint-disable-next-line security/detect-object-injection
  for (let j = 0; j < outputFile.file_names[folderName].length; j += 1) {
    const s3Client = new S3({
      region: API_AWS_REGION!
    });

    // eslint-disable-next-line security/detect-object-injection
    const resourcePath = outputFile.file_names[folderName][j];
    logs.write(`${new Date().toISOString()}: Checking resources from ${resourcePath}...\n`);
    const resourceFile = await s3Client
      .getObject({
        Bucket: process.env.EXPORT_BUCKET_NAME!,
        Key: resourcePath
      })
      .promise();
    if (resourceFile.$response.error) {
      throw new Error(`Failed to read file ${resourceFile.$response.error}`);
    }
    const allResources: string[] = resourceFile.Body!.toString().trimEnd().split('\n');
    for (let i = 0; i < allResources.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const resource = JSON.parse(allResources[i]);
      // This is a resource marked for deletion
      if (resource.meta.tag.some((x: { display: string; code: string }) => x.code === 'DELETED')) {
        // DELETE the resource from HealthLake
        logs.write(
          `${new Date().toISOString()}: Resource at ${resourcePath} line ${i} is marked for DELETION\n`
        );
        deleteQueue.push(`/${resource.resourceType}/${resource.id}`);
        if (deleteQueue.length >= HEALTHLAKE_BUNDLE_LIMIT) {
          // eslint-disable-next-line no-await-in-loop
          await deleteResourcesInBundle(deleteQueue);
          deleteQueue = [];
        }
      }
    }
  }
  if (deleteQueue.length !== 0) {
    await deleteResourcesInBundle(deleteQueue);
  }
}

export async function deleteResourcesInBundle(
  deletePaths: string[],
  retryAttempts: number = 1
): Promise<void> {
  try {
    logs.write(`${new Date().toISOString()}: Starting to delete Resource : Attempt #${retryAttempts}\n`);

    const interceptor = aws4Interceptor({
      region: API_AWS_REGION!,
      service: 'healthlake'
    });
    const healthLakeClient = axios.create();
    healthLakeClient.interceptors.request.use(interceptor);
    const bundle: Bundle = getEmptyFHIRBundle();

    for (const path of deletePaths) {
      bundle.entry.push({
        request: {
          method: 'DELETE',
          url: path
        }
      });
    }

    logs.write(`${new Date().toISOString()}: Sending Bundle For Deletion...\n`);

    await healthLakeClient.post(`${process.env.DATASTORE_ENDPOINT}`, JSON.stringify(bundle));
  } catch (e) {
    logs.write(
      `${new Date().toISOString()}: Failed to delete resources - Attempt #${retryAttempts}. Retrying...\n`
    );
    retryAttempts += 1;
    if (retryAttempts > MAX_IMPORT_RETRIES) {
      throw new Error(
        `${new Date().toISOString()}: Exceeded Retry limit for deletion after ${retryAttempts} attempts\n`
      );
    }
    const sleepTime = BUNDLE_RETRY_SLEEP_TIME * retryAttempts;
    logs.write(`Sleeping for ${sleepTime}\n`);
    await sleep(sleepTime);
    await deleteResourcesInBundle(deletePaths, retryAttempts);
  }
}

/* istanbul ignore next */
async function runScript(): Promise<void> {
  // get the job id from the export output file
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const outputFile: ExportOutput = JSON.parse(readFileSync(EXPORT_STATE_FILE_NAME).toString());
  const jobId: string = outputFile.jobId;

  await checkConfiguration(logs);
  await checkConvertedBinaryFileSize(jobId);
  await checkFolderSizeOfResource(Object.keys(outputFile.file_names), jobId);
  if (!dryRun) {
    try {
      const sortedKeys = Object.keys(outputFile.file_names).sort((a: string, b: string) => {
        return a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
      await startImport(sortedKeys, jobId, outputFile);
    } catch (e) {
      console.log('import failed!', e);
      logs.write(`\n**${new Date().toISOString()}: ERROR!**\n${e}\n`);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      // only create a state file in case something went wrong
      writeFileSync(`${IMPORT_STATE_FILE_NAME}`, JSON.stringify(successfullyCompletedFolders));
    }
  }
}

(async () => {
  // don't runScript when importing code for unit tests
  if (!process.env.UNIT_TEST) {
    await runScript();
    logs.end();
  }
})().catch((e) => {
  console.log('Checks failed', e);
  logs.end();
});
