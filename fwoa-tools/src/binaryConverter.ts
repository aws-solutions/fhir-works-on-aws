/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { execSync } from 'child_process';
import { WriteStream, createWriteStream, readFileSync, renameSync, writeFileSync, readdirSync } from 'fs';
import { performance } from 'perf_hooks';
import * as dotenv from 'dotenv';
import yargs from 'yargs';
import { EXPORT_STATE_FILE_NAME, ExportOutput, checkConfiguration, sleep } from './migrationUtils';

dotenv.config({ path: '.env' });
const CONVERSION_OUTPUT_LOG_FILE_PREFIX: string = 'binary_conversion_output_';
const FIVE_GB_IN_BYTES: number = 5368709120;

let totalDownloadTime: number = 0;
let totalUploadTime: number = 0;
let totalConversionTime: number = 0;

// eslint-disable-next-line security/detect-non-literal-fs-filename
export const logs: WriteStream = createWriteStream(
  `${CONVERSION_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`,
  {
    flags: 'a'
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCmdOptions(): any {
  return yargs(process.argv.slice(2))
    .usage('Usage: $0 [--dryRun, -d boolean]')
    .describe('dryRun', 'Check operations and authentication status')
    .boolean('dryRun')
    .default('dryRun', false)
    .alias('d', 'dryRun').argv;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const argv: any = parseCmdOptions();
const dryRun: boolean = argv.dryRun;
let completedWithErrors: boolean = false;

export async function convertBinaryResource(outputFile: ExportOutput): Promise<void> {
  // Step 1, Get all Binary Resource Paths
  let itemKeys: string[] = [];

  let tenantPrefix = '';
  if (process.env.MIGRATION_TENANT_ID) {
    tenantPrefix = `${process.env.MIGRATION_TENANT_ID}/`;
  }
  // eslint-disable-next-line security/detect-object-injection
  const syncStartTime = performance.now();
  execSync(
    `aws s3 sync s3://${process.env.EXPORT_BUCKET_NAME!}/${tenantPrefix}${
      outputFile.jobId
    } ./binaryFiles --exclude "*" --include "Binary-v*"`,
    { stdio: 'ignore' }
  );
  execSync(`aws s3 sync s3://${process.env.BINARY_BUCKET_NAME!}/${tenantPrefix} ./binaryObjects`, {
    stdio: 'ignore'
  });
  const syncEndTime = performance.now();
  totalDownloadTime += syncEndTime - syncStartTime;
  logs.write(`${new Date().toISOString()}: Sync complete. Elapsed Time ${syncEndTime - syncStartTime}\n`);

  // we need to create a dictionary of file extensions for quick access
  const binaryObjects = readdirSync('./binaryObjects');
  const objectPaths: { [id: string]: string } = {};

  binaryObjects.forEach((file) => {
    const parts = file.split('.')[0]; // each Binary NDJSON resource's path
    objectPaths[`${parts}`] = file;
  });

  for (const key of Object.keys(outputFile.file_names)) {
    if (key.startsWith('Binary-v')) {
      // eslint-disable-next-line security/detect-object-injection
      itemKeys = outputFile.file_names[key];
    } else {
      continue;
    }
    if (itemKeys.length === 0) {
      logs.write(`${new Date().toISOString()}: No Binary resources found to convert...\n`);
      continue;
    }
    logs.write(`${new Date().toISOString()}: Retrieved All Binary Keys from migration export output.\n`);
    for (const itemKey of itemKeys) {
      logs.write(`${new Date().toISOString()}: Retrieving Binary Resource from ${itemKey}...\n`);
      // sync to get the directories
      const pathToSyncedFile = process.env.MIGRATION_TENANT_ID
        ? itemKey.replace(tenantPrefix, '').replace(outputFile.jobId, '')
        : itemKey.replace(outputFile.jobId, '');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const file = readFileSync(`./binaryFiles${pathToSyncedFile}`); // read in an ndjson file
      const binaryResources: string[] = file.toString().split('\n');
      let results: WriteStream = createWriteStream('./binaryFiles/temp.ndjson');
      let currentFileSize: number = 0;
      let currentFilePartition: number = 0;

      for (const binaryResourceString of binaryResources) {
        const binaryResource = JSON.parse(binaryResourceString);
        logs.write(`${new Date().toISOString()}: Retrieved Binary Resource from Exported ndjson file.\n`);
        if (binaryResource.meta.tag.some((x: { display: string; code: string }) => x.code === 'DELETED')) {
          logs.write(
            `${new Date().toISOString()}: Encountered DELETED Binary resource, skipping ${itemKey}...\n`
          );
          continue;
        }
        // Step 3, Retrieve Binary objects from S3 Binary Bucket
        let binaryObject;
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          binaryObject = readFileSync(
            `./binaryObjects/${objectPaths[`${binaryResource.id}_${binaryResource.meta.versionId}`]}`
          );
          logs.write(
            `${new Date().toISOString()}: Retrieved Binary Object from Binary objects folder with vid ${
              binaryResource.meta.versionId
            }.\n`
          );
        } catch (e) {
          logs.write(
            `${new Date().toISOString()}: \nERROR!\n Failed to find Binary object ${binaryResource.id}_${
              binaryResource.meta.versionId
            }.\n`
          );
          completedWithErrors = true;
          continue;
        }

        // Step 4, Convert to Binary string
        const conversionStartTime = performance.now();
        binaryResource.data = binaryObject.toString('base64');
        const conversionEndTime = performance.now();
        totalConversionTime += conversionEndTime - conversionStartTime;

        // Step 5, append to downloaded file
        const dataToWrite = JSON.stringify(binaryResource) + '\n';
        const dataSizeInBytes = dataToWrite.length * 2;
        if (dataSizeInBytes + currentFileSize >= FIVE_GB_IN_BYTES) {
          results.end();
          // this is needed to allow the file stream to close gracefully, otherwise the script fails on the rename step
          await sleep(1000);
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          renameSync(
            './binaryFiles/temp.ndjson',
            `./binaryFiles/${key}/Binary-part-${currentFilePartition}.ndjson`
          );
          results = createWriteStream('./binaryFiles/temp.ndjson');
          currentFileSize = 0;
          currentFilePartition += 1;
        }
        currentFileSize += dataSizeInBytes;
        results.write(dataToWrite);
        logs.write(`${new Date().toISOString()}: Binary data appended to resource.\n`);
      }
      results.end();
      // this is needed to allow the file stream to close gracefully, otherwise the script fails on the rename step
      await sleep(1000);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      renameSync('./binaryFiles/temp.ndjson', `./binaryFiles${pathToSyncedFile}`);
    }
  }
  const uploadStartTime = performance.now();
  execSync(
    `aws s3 sync ./binaryFiles s3://${process.env.EXPORT_BUCKET_NAME!}/${tenantPrefix}${outputFile.jobId}`,
    { stdio: 'ignore' }
  );
  const uploadEndTime = performance.now();
  totalUploadTime += uploadEndTime - uploadStartTime;
  logs.write(`${new Date().toISOString()}: Updated Binary .ndjson uploaded to Export Bucket!\n`);
}

/* istanbul ignore next */
async function runScript(): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const outputFile = JSON.parse(readFileSync(EXPORT_STATE_FILE_NAME).toString());

  try {
    await checkConfiguration(logs);
    console.log('successfully authenticated to all services');
    if (!dryRun) {
      console.log(`Starting Binary Resource Conversion...`);
      logs.write(`${new Date().toISOString()}: Starting Binary Resource Conversion\n`);
      await convertBinaryResource(outputFile);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      writeFileSync(`${EXPORT_STATE_FILE_NAME}`, JSON.stringify(outputFile));
      logs.write(`${new Date().toISOString()}: Finished Binary Resource Conversion\n`);
      if (completedWithErrors) {
        console.log('Converted binary resources with some errors. Please check the logs.');
      } else {
        console.log('successfully converted all binary resources!');
      }
    }
  } catch (error) {
    console.log('Failed to process binary resources', error);
    logs.write(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
  }
}

const startTime: number = performance.now();
/* istanbul ignore next */
(async () => {
  // don't runScript when importing code for unit tests
  if (!process.env.UNIT_TEST) {
    await runScript();
    logs.end();
  }
})().catch((e) => {
  console.error(e);
  const endTime = performance.now();
  logs.write(`${new Date().toISOString()}: Total Downloads time: ${totalDownloadTime}\n`);
  logs.write(`${new Date().toISOString()}: Total Uploads time: ${totalUploadTime}\n`);
  logs.write(`${new Date().toISOString()}: Total Conversions time: ${totalConversionTime}\n`);
  logs.write(`${new Date().toISOString()}: Total Script time: ${endTime - startTime}\n`);
  logs.end();
});
