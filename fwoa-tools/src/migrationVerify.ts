/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync, WriteStream, createWriteStream } from 'fs';
import { S3 } from 'aws-sdk';
import { aws4Interceptor } from 'aws4-axios';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import objectHash from 'object-hash';
import yargs from 'yargs';
import {
  ExportOutput,
  getFhirClient,
  getFhirClientSMART,
  checkConfiguration,
  EXPORT_STATE_FILE_NAME
} from './migrationUtils';

dotenv.config({ path: '.env' });
const { DATASTORE_ENDPOINT, API_AWS_REGION } = process.env;

const IMPORT_VERIFICATION_LOG_FILE_PREFIX: string = 'import_verification_';

// eslint-disable-next-line security/detect-non-literal-fs-filename
const logs: WriteStream = createWriteStream(
  `${IMPORT_VERIFICATION_LOG_FILE_PREFIX}${Date.now().toString()}.log`,
  {
    flags: 'a'
  }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCmdOptions(): any {
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

export async function verifyResource(
  fhirClient: AxiosInstance,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  healthLakeResource: any,
  resourceId: string,
  resourceType: string
): Promise<boolean> {
  const fwoaResponse = (await fhirClient.get(`/${resourceType}/${resourceId}`)).data;
  delete fwoaResponse.meta;
  delete healthLakeResource.meta;
  if (resourceType === 'Binary') {
    delete healthLakeResource.data;
    delete fwoaResponse.presignedGetUrl;
  }
  return objectHash(fwoaResponse) === objectHash(healthLakeResource);
}

export async function verifyFolderImport(smartClient: boolean, outputFile: ExportOutput): Promise<void> {
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
    console.log(`Starting import for resource ${resourceType}`);
    const interceptor = aws4Interceptor({
      region: API_AWS_REGION!,
      service: 'healthlake'
    });

    const fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
    const s3Client = new S3({
      region: API_AWS_REGION!
    });
    const healthLakeClient = axios.create();
    healthLakeClient.interceptors.request.use(interceptor);

    // Retrieve resource from HealthLake and compare it to fwoa.
    for (let i = 0; i < resourcePaths.length; i += 1) {
      // resource path includes jobId, tenantId, resourceType, and S3 object id
      // eslint-disable-next-line security/detect-object-injection
      const resourcePath = resourcePaths[i];
      logs.write(`\n${new Date().toISOString()}: Verifying Import from ${resourcePath}...`);
      const resourceFile = await s3Client
        .getObject({
          Bucket: process.env.EXPORT_BUCKET_NAME!,
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
        // Skip any resources marked for deletion, we don't need to verify these.
        if (!resource.meta.tag.some((x: { display: string; code: string }) => x.code === 'DELETED')) {
          continue;
        }
        const id = resource.id;
        const resourceInHL = await healthLakeClient.get(
          `${DATASTORE_ENDPOINT}/${resource.resourceType}/${id}`
        );
        logs.write(
          `\n${new Date().toISOString()}: Retrieved resource at ${resourcePath} line ${j} from datastore, comparing to FWoA...`
        );
        if (!(await verifyResource(fhirClient, resourceInHL.data, id, resource.resourceType))) {
          throw new Error(`Resources in FWoA and AHL do not match, ${resourcePath}`);
        }
      }
    }
    logs.write(`\n${new Date().toISOString()}: Successfully completed verifying Import Jobs!`);
  }
}

export function buildRunScriptParams(): { smartClient: boolean; dryRun: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const argv: any = parseCmdOptions();
  const smartClient: boolean = argv.smart;
  const dryRun: boolean = argv.dryRun;
  return { smartClient, dryRun };
}

export async function runScript(
  smartClient: boolean,
  dryRun: boolean,
  outputFile: ExportOutput
): Promise<void> {
  await checkConfiguration(logs, smartClient ? 'Smart' : 'Cognito');
  if (!dryRun) {
    try {
      await verifyFolderImport(smartClient, outputFile);
      console.log('successfully completed verifying Import Jobs!');
    } catch (error) {
      console.log('verification failed!', error);
      logs.write(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
    }
  }
}

/* istanbul ignore next */
(async () => {
  // Don't runScript when code is being imported for unit tests
  if (!process.env.UNIT_TEST) {
    const { smartClient, dryRun } = buildRunScriptParams();
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const outputFile: ExportOutput = JSON.parse(readFileSync(EXPORT_STATE_FILE_NAME).toString());
    await runScript(smartClient, dryRun, outputFile);
    logs.end();
  }
})().catch((error) => {
  console.log('failed some checks!', error);
  logs.end();
});
