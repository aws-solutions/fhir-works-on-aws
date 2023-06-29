/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync, WriteStream, createWriteStream } from 'fs';
import { S3 } from 'aws-sdk';
import { aws4Interceptor } from 'aws4-axios';
import axios, { AxiosResponse, AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import objectHash from 'object-hash';
import yargs from 'yargs';
import {
  ExportOutput,
  getFhirClient,
  getFhirClientSMART,
  checkConfiguration,
  EXPORT_STATE_FILE_NAME,
  Bundle,
  getEmptyFHIRBundle,
  HEALTHLAKE_BUNDLE_LIMIT
} from './migrationUtils';

dotenv.config({ path: '.env' });
const { DATASTORE_ENDPOINT, API_AWS_REGION, IMPORT_OUTPUT_S3_BUCKET_NAME } = process.env;

const IMPORT_VERIFICATION_LOG_FILE_PREFIX: string = 'import_verification_';

// eslint-disable-next-line security/detect-non-literal-fs-filename
const logs: WriteStream = createWriteStream(
  `${IMPORT_VERIFICATION_LOG_FILE_PREFIX}${Date.now().toString()}.log`,
  {
    flags: 'a'
  }
);
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

async function verifyFolderImport(): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const outputFile: ExportOutput = JSON.parse(readFileSync(EXPORT_STATE_FILE_NAME).toString());
  const fileNames = outputFile.file_names;

  for (let k = 0; k < Object.keys(fileNames).length; k++) {
    // eslint-disable-next-line security/detect-object-injection
    const resourceType = Object.keys(fileNames)[k];
    // skip verifying of Binary resources as
    // older versions may not share the same representation
    if (resourceType.startsWith('Binary')) {
      continue;
    }
    // eslint-disable-next-line security/detect-object-injection
    const resourcePaths = fileNames[resourceType];
    console.log(`Starting verification for resource ${resourceType}`);
    const s3Client = new S3({
      region: API_AWS_REGION!
    });

    let comparisonQueue: string[] = [];
    // Retrieve resource from HealthLake and compare it to fwoa.
    for (let i = 0; i < resourcePaths.length; i += 1) {
      // resource path includes jobId, tenantId, resourceType, and S3 object id
      // eslint-disable-next-line security/detect-object-injection
      const resourcePath = resourcePaths[i];
      logs.write(`\n${new Date().toISOString()}: Verifying resources from ${resourcePath}...`);
      const resourceFile = await s3Client
        .getObject({
          Bucket: IMPORT_OUTPUT_S3_BUCKET_NAME!,
          Key: resourcePath
        })
        .promise();
      if (resourceFile.$response.error) {
        throw new Error(`Failed to read file ${resourceFile.$response.error}`);
      }

      // Each resource file can contain a number of resource objects
      const allResources: string[] = resourceFile.Body!.toString().trimEnd().split('\n');
      for (let j = 0; j < allResources.length; j += 1) {
        // eslint-disable-next-line security/detect-object-injection
        const resource = JSON.parse(allResources[j]);
        comparisonQueue.push(`${resource.resourceType}/${resource.id}`);
        logs.write(
          `\n${new Date().toISOString()}: Retrieved resource at ${resourcePath} line ${j} from datastore, queuing for comparison...`
        );
        if (comparisonQueue.length >= HEALTHLAKE_BUNDLE_LIMIT) {
          await compareResources(comparisonQueue);
          comparisonQueue = [];
        }
      }
    }
    if (comparisonQueue.length > 0) {
      await compareResources(comparisonQueue);
    }
    logs.write(`\n${new Date().toISOString()}: Successfully completed verifying Import Jobs!`);
  }
}

async function compareResources(comparisonQueue: string[]): Promise<void> {
  const interceptor = aws4Interceptor({
    region: API_AWS_REGION!,
    service: 'healthlake'
  });

  const fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  const healthLakeClient = axios.create();
  healthLakeClient.interceptors.request.use(interceptor);

  const bundle: Bundle = getEmptyFHIRBundle();

  for (const resourcePath of comparisonQueue) {
    bundle.entry.push({
      request: {
        method: 'GET',
        url: resourcePath
      }
    });
  }

  logs.write(`\n${new Date().toISOString()}: Starting Bundle Verification`);

  const resourcesFromAHL = await healthLakeClient.post(`${DATASTORE_ENDPOINT}`, bundle);
  if (resourcesFromAHL.status !== 200) {
    throw new Error('Failed to retrieve resources from AHL!');
  }

  const resourcesFromFWoA = await fhirClient.post(
    '/', // POST FWoA bundle to root
    bundle
  );
  if (resourcesFromFWoA.status !== 200) {
    throw new Error('Failed to retrieve resources from FWoA');
  }

  if (resourcesFromAHL.data.entry.length !== resourcesFromFWoA.data.entry.length) {
    throw new Error('Size of Bundle Responses do not match');
  }

  verifyBundle(resourcesFromAHL, resourcesFromFWoA, resourcesFromAHL.data.entry.length);
}

function verifyBundle(
  healthLakeResources: AxiosResponse,
  fhirWorksResources: AxiosResponse,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const hlResource = healthLakeResources.data.entry[i].resource;
    // eslint-disable-next-line security/detect-object-injection
    const fwoaResource = fhirWorksResources.data.entry[i].resource;
    delete fwoaResource.meta;
    delete hlResource.meta;
    if (hlResource.resourceType === 'Binary') {
      delete hlResource.data;
      delete fwoaResource.presignedGetUrl;
    }

    if (objectHash(fwoaResource) !== objectHash(hlResource)) {
      throw new Error(`Error: FWoA resource does not match AHL Resource! Bundle Entry num ${i}`);
    }
  }
}

// eslint-disable-next-line no-unused-expressions
(async () => {
  await checkConfiguration(logs, smartClient ? 'Smart' : 'Cognito');
  if (!dryRun) {
    try {
      await verifyFolderImport();
      console.log('successfully completed verifying Import Jobs!');
    } catch (error) {
      console.log('verification failed!', error);
      logs.write(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
    }
  }
  logs.end();
})().catch((error) => {
  console.log('failed some checks!', error);
  logs.end();
});
