/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { WriteStream, createWriteStream, readFileSync } from 'fs';
import { S3 } from 'aws-sdk';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import * as dotenv from 'dotenv';
import yargs from 'yargs';
import { ExportOutput } from './migrationUtils';

dotenv.config({ path: '.env' });
const { EXPORT_BUCKET_NAME, BINARY_BUCKET_NAME, API_AWS_REGION } = process.env;
const CONVERSION_OUTPUT_LOG_FILE_PREFIX: string = 'binary_conversion_output_';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCmdOptions(): any {
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
const exportBucketName: string | undefined = process.env.EXPORT_BUCKET_NAME;
const binaryBucketName: string | undefined = process.env.BINARY_BUCKET_NAME;

// eslint-disable-next-line security/detect-non-literal-fs-filename
const logs: WriteStream = createWriteStream(
  `${CONVERSION_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`,
  { flags: 'a' }
);
const outputFile: ExportOutput = JSON.parse(readFileSync('migrationExport_Output.txt').toString());
let tenantPrefix: string = '';
if (process.env.MIGRATION_TENANT_ID) {
  tenantPrefix = `${process.env.MIGRATION_TENANT_ID}/`;
}

const s3Client: S3 = new S3({
  region: API_AWS_REGION
});

if (!BINARY_BUCKET_NAME) {
  throw new Error('BINARY_BUCKET_NAME environment variable not specified');
}
if (!EXPORT_BUCKET_NAME) {
  throw new Error('EXPORT_BUCKET_NAME environment variable not specified');
}

// Step 2, download files from S3 to get Ids
async function getBinaryResource(itemKey: string): Promise<GetObjectOutput> {
  console.log(`getting ${itemKey}`);
  const file = await s3Client
    .getObject({
      Bucket: EXPORT_BUCKET_NAME!,
      Key: itemKey
    })
    .promise();
  if (file.$response.error) {
    throw new Error(`Failed to get object ${itemKey}`);
  }
  return file;
}

// Step 3, Retrieve Binary objects from S3 Binary Bucket
async function getBinaryObject(itemKey: string, versionId: number = 1): Promise<GetObjectOutput> {
  const files = await s3Client
    .listObjectsV2({
      Bucket: BINARY_BUCKET_NAME!,
      Prefix: `${tenantPrefix}${itemKey}_${versionId}.`
    })
    .promise();
  if (files.$response.error || !files.Contents || files.Contents.length === 0) {
    throw new Error(`Failed to find object ${itemKey}`);
  }
  // there should only be 1 file in the S3 bucket that begins with id_vid.
  // we need to do a list object first because we don't know the suffix (.png/.jpg, etc.)
  const file = await s3Client
    .getObject({
      Bucket: BINARY_BUCKET_NAME!,
      Key: files.Contents![0].Key!
    })
    .promise();
  if (file.$response.error) {
    throw new Error(`Failed to get object ${itemKey}`);
  }
  return file;
}

// Step 6, reupload to S3 Export bucket
async function uploadBinaryResource(itemKey: string, newData: string): Promise<GetObjectOutput> {
  return await s3Client
    .upload({
      Bucket: EXPORT_BUCKET_NAME!,
      Key: itemKey,
      Body: newData
    })
    .promise();
}

async function retrieveBinaryIdsFromFolder(): Promise<void> {
  // Step 1, Get all Binary Resource Paths
  const itemKeys = outputFile.file_names.Binary;
  logs.write(`${new Date().toISOString()}: Retrieved All Binary Keys from migration export output.\n`);
  let binaryResourceNum = 0;
  for (const itemKey of itemKeys) {
    logs.write(`${new Date().toISOString()}: Retrieving Binary Resource from ${itemKey}...\n`);
    const file = await getBinaryResource(itemKey);
    const binaryResources: string[] = file.Body!.toString().split('\n');
    let results: string = '';
    for (const binaryResourceString of binaryResources) {
      const binaryResource = JSON.parse(binaryResourceString);
      logs.write(`${new Date().toISOString()}: Retrieved Binary Resource from Export bucket.\n`);
      if (binaryResource.meta.tag.some((x: { display: string; code: string }) => x.code === 'DELETED')) {
        logs.write(
          `${new Date().toISOString()}: Encountered DELETED Binary resource, skipping ${itemKey}...\n`
        );
        continue;
      }
      const binaryObject = await getBinaryObject(binaryResource.id, binaryResource.meta.versionId);
      logs.write(
        `${new Date().toISOString()}: Retrieved Binary Object from Binary bucket with vid ${
          binaryResource.meta.versionId
        }.\n`
      );
      // Step 4, Convert to Binary string
      // Step 5, append to downloaded file
      binaryResource.data = binaryObject.Body?.toString('base64');
      results += JSON.stringify(binaryResource) + '\n';
      logs.write(`${new Date().toISOString()}: Binary data appended to resource.\n`);
      // upload to separate folder to avoid import limit
      const newKey = `${tenantPrefix}${outputFile.jobId}/Binary_converted_${binaryResourceNum}/Binary-${binaryResourceNum}.ndjson`;
      await uploadBinaryResource(newKey, results);
      logs.write(`${new Date().toISOString()}: Updated Binary .ndjson uploaded to Export Bucket!\n`);
      binaryResourceNum += 1;
    }
    results = results.trimEnd();
  }
}

async function checkConfiguration(): Promise<void> {
  await s3Client.listObjectsV2({ Bucket: exportBucketName! }).promise();
  console.log('Sucessfully authenticated with S3 Export Bucket...');
  await s3Client.listObjectsV2({ Bucket: binaryBucketName! }).promise();
  console.log('Sucessfully authenticated with S3 Binary Bucket...');
}

async function startBinaryConversion(): Promise<void> {
  if (!outputFile.file_names.Binary) {
    logs.write(`${new Date().toISOString()}: No Binary resources found to convert! Exiting...\n`);
    return;
  }
  console.log(`Starting Binary Resource Conversion...`);
  logs.write(`${new Date().toISOString()}: Starting Binary Resource Conversion`);
  await retrieveBinaryIdsFromFolder();
  logs.write(`${new Date().toISOString()}: Finished Binary Resource Conversion`);
}

if (!dryRun) {
  startBinaryConversion()
    .then(() => {
      console.log('successfully converted all binary resources!');
      logs.end();
    })
    .catch((error) => {
      console.log('Failed to process binary resources', error);
      logs.write(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      logs.end();
    });
} else {
  checkConfiguration()
    .then(() => {
      console.log('successfully authenticated to all services');
    })
    .catch((error) => {
      console.log('some checks failed!', error);
    });
}
