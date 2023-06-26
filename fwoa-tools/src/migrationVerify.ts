/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync, WriteStream, createWriteStream } from 'fs';
import { HealthLake, S3 } from 'aws-sdk';
import { aws4Interceptor } from 'aws4-axios';
import axios from 'axios';
import * as dotenv from 'dotenv';
import yargs from 'yargs';
import { ExportOutput, getFhirClient, getFhirClientSMART, verifyResource } from './migrationUtils';

dotenv.config({ path: '.env' });
const { DATASTORE_ID, DATASTORE_ENDPOINT, API_AWS_REGION, IMPORT_OUTPUT_S3_BUCKET_NAME } = process.env;

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
  const outputFile: ExportOutput = JSON.parse(readFileSync('migrationExport_Output.txt').toString());
  const fileNames = outputFile.file_names;

  for (let k = 0; k < Object.keys(fileNames).length; k++) {
    // eslint-disable-next-line security/detect-object-injection
    const resourceType = Object.keys(fileNames)[k];
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
          Bucket: IMPORT_OUTPUT_S3_BUCKET_NAME!,
          Key: resourcePath
        })
        .promise();
      if (resourceFile.$response.error) {
        throw new Error(`Failed to read file ${resourceFile.$response.error}`);
      }

      // Each resource file can contain a number of resource objects
      const allResources: string[] = resourceFile.Body!.toString().split('\n');
      let j: number = 0;
      for (j; j < allResources.length; j += 1) {
        // eslint-disable-next-line security/detect-object-injection
        const resource = JSON.parse(allResources[j]);
        const id = resource.id;
        const resourceInHL = await healthLakeClient.get(`${DATASTORE_ENDPOINT}/${resourceType}/${id}`);
        logs.write(
          `\n${new Date().toISOString()}: Retrieved resource at ${resourcePath} from datastore, comparing to FWoA...`
        );
        if (!(await verifyResource(fhirClient, resourceInHL.data, id, resourceType))) {
          throw new Error(`Resources in FWoA and AHL do not match, ${resourcePath}`);
        }
      }
    }
    logs.write(`\n${new Date().toISOString()}: Successfully completed verifying Import Jobs!`);
  }
}

async function checkConfiguration(): Promise<void> {
  if (!DATASTORE_ID) throw new Error('DATASTORE_ID environment variable is not defined');
  if (!DATASTORE_ENDPOINT) throw new Error('DATASTORE_ENDPOINT environment variable is not defined');
  if (!API_AWS_REGION) throw new Error('API_AWS_REGION environment variable is not defined');
  if (!IMPORT_OUTPUT_S3_BUCKET_NAME)
    throw new Error('IMPORT_OUTPUT_S3_BUCKET_NAME environment variable is not defined');

  const healthLake: HealthLake = new HealthLake({
    region: API_AWS_REGION
  });

  await healthLake
    .describeFHIRDatastore({
      DatastoreId: DATASTORE_ID!
    })
    .promise();
  console.log('Successfully accessed healthlake datastore');

  await (smartClient ? getFhirClientSMART() : getFhirClient());
  console.log('Successfully accessed FHIR Server');

  console.log('Successfully Passed all checks!');
}

// eslint-disable-next-line no-unused-expressions
(async () => {
  await checkConfiguration();
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
