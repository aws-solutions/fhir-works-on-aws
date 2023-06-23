/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { HealthLake, S3 } from 'aws-sdk';
import { StartFHIRImportJobRequest } from 'aws-sdk/clients/healthlake';
import { aws4Interceptor } from 'aws4-axios';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import yargs from 'yargs';
import {
  ExportOutput,
  MS_TO_HOURS,
  POLLING_TIME,
  getFhirClient,
  getFhirClientSMART,
  sleep,
  verifyResource
} from './migrationUtils';
import { ListObjectsV2Output } from 'aws-sdk/clients/s3';

dotenv.config({ path: '.env' });
const {
  EXPORT_BUCKET_URI,
  DATASTORE_ID,
  DATASTORE_ENDPOINT,
  API_AWS_REGION,
  DATA_ACCESS_ROLE_ARN,
  HEALTHLAKE_CLIENT_TOKEN,
  IMPORT_OUTPUT_S3_URI,
  IMPORT_OUTPUT_S3_BUCKET_NAME,
  IMPORT_KMS_KEY_ARN
} = process.env;

const MAX_IMPORT_RUNTIME: number = 48 * 60 * 60 * 1000; // 48 hours
const IMPORT_OUTPUT_LOG_FILE_PREFIX: string = 'import_output_';
const IMPORT_STATE_FILE_NAME: string = 'import_state.txt';

const successfullyCompletedFolders: string[] = [];
const logs: string[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCmdOptions(): any {
  return yargs(process.argv.slice(2))
    .usage('Usage: $0 [--smart, -s boolean] [--dryRun, -d boolean]')
    .describe('smart', 'Whether the FWoA deployment is SMART-on-FHIR or not')
    .boolean('smart')
    .default('smart', false)
    .alias('s', 'smart')
    .describe('dryRun', 'Check operations and authentication status')
    .boolean('dryRun')
    .default('dryRun', false)
    .alias('d', 'dryRun').argv;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const argv: any = parseCmdOptions();
const smartClient: boolean = argv.smart;
const dryRun: boolean = argv.dryRun;

// get the job id from the export output file
const outputFile: ExportOutput = JSON.parse(readFileSync('migrationExport_Output.json').toString());
const jobId: string = outputFile.jobId;

const healthLake: HealthLake = new HealthLake({
  region: API_AWS_REGION
});

async function startImport(folderNames: string[]): Promise<void> {
  let i: number = 0;
  // To see if we have completed folders to skip importing
  if (existsSync(`${IMPORT_STATE_FILE_NAME}`)) {
    const folders = JSON.parse(readFileSync(`${IMPORT_STATE_FILE_NAME}`).toString());
    if (folders.length > 0) {
      i = parseInt(folders[folders.length - 1]);
    }
  }

  for (i; i < folderNames.length; i += 1) {
    // eslint-disable-next-line security/detect-object-injection
    const folderName = folderNames[i];
    console.log(`Starting import for folder ${folderName}`);
    const startTime = new Date();
    logs.push(`${startTime.toISOString()}: Start Import for folder ${folderName}...`);

    const params: StartFHIRImportJobRequest = {
      InputDataConfig: {
        S3Uri: `${EXPORT_BUCKET_URI}/${jobId}/${folderName}`
      },
      JobName: `FWoAFolderMigration-${folderName}`,
      DatastoreId: DATASTORE_ID!,
      DataAccessRoleArn: DATA_ACCESS_ROLE_ARN!,
      JobOutputDataConfig: {
        S3Configuration: {
          S3Uri: IMPORT_OUTPUT_S3_URI!,
          KmsKeyId: IMPORT_KMS_KEY_ARN!
        }
      },
      ClientToken: HEALTHLAKE_CLIENT_TOKEN || uuidv4()
    };
    const importJob = await healthLake.startFHIRImportJob(params).promise();
    console.log(`successfully started import job, checking status at ${importJob.JobId}`);
    logs.push(`${new Date().toISOString()}: Started Import Job, JobId - ${importJob.JobId}`);
    const cutOffTime = new Date(new Date().getTime() + MAX_IMPORT_RUNTIME);
    while (new Date().getTime() < cutOffTime.getTime()) {
      try {
        const jobStatus = await healthLake
          .describeFHIRImportJob({
            DatastoreId: DATASTORE_ID!,
            JobId: importJob.JobId
          })
          .promise();
        if (jobStatus.ImportJobProperties.JobStatus === 'COMPLETED') {
          const finishTime = new Date();
          console.log(`successfully imported folder ${folderName}`);
          logs.push(
            `${finishTime.toISOString()}: Import Job for folder ${folderName} succeeded! Elapsed Time: ${
              Math.abs(startTime.getTime() - finishTime.getTime()) / MS_TO_HOURS
            }`
          );

          await deleteFhirResourceFromHealthLakeIfNeeded(
            folderName,
            jobStatus.ImportJobProperties.JobOutputDataConfig?.S3Configuration?.S3Uri!
          );
          logs.push(`${new Date().toISOString()}: Verification of folder ${folderName} import succeeded!`);
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
        await sleep(POLLING_TIME);
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
  }
}

async function checkFolderSizeOfResource(resources: string[]) {
  const s3Client = new S3({
    region: API_AWS_REGION!
  });
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    // We don't check Binary resource ndjson file, instead we check the `Binary_converted` ndjson files
    // Each binary file is limited to 5GB and each `Binary_converted` ndjson file has only one binary file
    if (resource === 'Binary') {
      continue;
    }
    console.log(`Checking resource ${resource}`);
    const maximumFolderSize = 536870912000; // 500 GB in bytes

    let folderSize = 0;
    let continuationToken: string | undefined = undefined;
    do {
      const response: ListObjectsV2Output = await s3Client
        .listObjectsV2({
          Bucket: IMPORT_OUTPUT_S3_BUCKET_NAME!,
          Prefix: `${outputFile.jobId}/${resource}`,
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
  }
}

async function checkConvertedBinaryFileSize() {
  console.log('Checking Binary file size');
  const s3Client = new S3({
    region: API_AWS_REGION!
  });
  const maximumBinaryFileSize = 5368709120; // 5 GB in bytes
  const convertedBinaryFolderName = 'Binary_converted';
  let continuationToken: string | undefined = undefined;
  do {
    const response: ListObjectsV2Output = await s3Client
      .listObjectsV2({
        Bucket: IMPORT_OUTPUT_S3_BUCKET_NAME!,
        Prefix: `${outputFile.jobId}/${convertedBinaryFolderName}`,
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
}

async function deleteFhirResourceFromHealthLakeIfNeeded(folderName: string, s3Uri: string): Promise<void> {
  const path = s3Uri.replace('s3://', '').replace(`${IMPORT_OUTPUT_S3_BUCKET_NAME!}/`, '');
  const interceptor = aws4Interceptor({
    region: API_AWS_REGION!,
    service: 'healthlake'
  });

  // eslint-disable-next-line security/detect-object-injection
  for (let j = 0; j < outputFile.file_names[folderName].length; j += 1) {
    const fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
    const s3Client = new S3({
      region: API_AWS_REGION!
    });
    const healthLakeClient = axios.create();
    healthLakeClient.interceptors.request.use(interceptor);

    // eslint-disable-next-line security/detect-object-injection
    const resourcePath = outputFile.file_names[folderName][j].replace(outputFile.jobId, `${path}SUCCESS`);
    logs.push(`${new Date().toISOString()}: Verifying Import from ${resourcePath}...`);
    const resourceFile = await s3Client
      .getObject({
        Bucket: IMPORT_OUTPUT_S3_BUCKET_NAME!,
        Key: resourcePath
      })
      .promise();
    if (resourceFile.$response.error) {
      throw new Error(`Failed to read file ${resourceFile.$response.error}`);
    }
    const allResourceVersions: string[] = resourceFile.Body!.toString().split('\n');
    let resource = JSON.parse(allResourceVersions[allResourceVersions.length - 1]); // latest version
    // eslint-disable-next-line security/detect-object-injection
    const responseKey = Object.keys(resource).find((x) => resource[x].jsonBlob !== undefined);
    resource = resource[responseKey!].jsonBlob;
    // This is a resource marked for deletion
    if (resource.meta.tag.some((x: { display: string; code: string }) => x.code === 'DELETED')) {
      // DELETE the resource from HealthLake
      logs.push(`${new Date().toISOString()}: Resource at ${resourcePath} marked for DELETION, deleting...`);
      await healthLakeClient.delete(`${DATASTORE_ENDPOINT}/${resource.resourceType}/${resource.id}`);
    }
  }
}

async function checkConfiguration(): Promise<void> {
  if (!EXPORT_BUCKET_URI) throw new Error('EXPORT_BUCKET_URI environment variable is not defined');
  if (!DATASTORE_ID) throw new Error('DATASTORE_ID environment variable is not defined');
  if (!DATASTORE_ENDPOINT) throw new Error('DATASTORE_ENDPOINT environment variable is not defined');
  if (!API_AWS_REGION) throw new Error('API_AWS_REGION environment variable is not defined');
  if (!DATA_ACCESS_ROLE_ARN) throw new Error('DATA_ACCESS_ROLE_ARN environment variable is not defined');
  if (!HEALTHLAKE_CLIENT_TOKEN)
    throw new Error('HEALTHLAKE_CLIENT_TOKEN environment variable is not defined');
  if (!IMPORT_OUTPUT_S3_URI) throw new Error('IMPORT_OUTPUT_S3_URI environment variable is not defined');
  if (!IMPORT_OUTPUT_S3_BUCKET_NAME)
    throw new Error('IMPORT_OUTPUT_S3_BUCKET_NAME environment variable is not defined');
  if (!IMPORT_KMS_KEY_ARN) throw new Error('IMPORT_KMS_KEY_ARN environment variable is not defined');
  await healthLake
    .describeFHIRDatastore({
      DatastoreId: DATASTORE_ID!
    })
    .promise();
  console.log('successfully accessed healthlake datastore');
}

// if (!dryRun) {
//   startImport(Object.keys(outputFile.file_names))
//     .then(() => {
//       console.log('successfully completed import jobs!');
//       logs.push(`${new Date().toISOString()}: Successfully completed all Import Jobs!`);
//       // eslint-disable-next-line security/detect-non-literal-fs-filename
//       writeFileSync(`${IMPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`, logs.join('\n'));
//     })
//     .catch((error) => {
//       console.log('import failed!', error);
//       logs.push(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
//       // eslint-disable-next-line security/detect-non-literal-fs-filename
//       writeFileSync(`${IMPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`, logs.join('\n'));
//       // only create a state file in case something went wrong
//       writeFileSync(`${IMPORT_STATE_FILE_NAME}`, JSON.stringify(successfullyCompletedFolders));
//     });
// } else {
//   checkConfiguration()
//     .then((value) => {
//       console.log('Successfully Passed configuration check');
//     })
//     .catch((error) => {
//       console.log('failed configuration check', error);
//     });
//   checkConvertedBinaryFileSize().then(() => {
//     console.log('Passed binary file size check');
//   }).catch((error) => {
//     console.log('Failed binary file size check', error);
//   });
//   checkFolderSizeOfResource(Object.keys(outputFile.file_names)).then(() => {
//     console.log('Passed resource folder size check');
//   }).catch((error) => {
//     console.log('Failed resource folder size check', error);
//   });
// }
(async () => {
  if (!dryRun) {
    try {
      await startImport(Object.keys(outputFile.file_names));
    } catch (e) {
      console.log('import failed!', e);
      logs.push(`\n**${new Date().toISOString()}: ERROR!**\n${e}\n`);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      writeFileSync(`${IMPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`, logs.join('\n'));
      // only create a state file in case something went wrong
      writeFileSync(`${IMPORT_STATE_FILE_NAME}`, JSON.stringify(successfullyCompletedFolders));
    }
  } else {
    // await checkConfiguration();
    await checkConvertedBinaryFileSize();
    await checkFolderSizeOfResource(Object.keys(outputFile.file_names));
  }
})();
