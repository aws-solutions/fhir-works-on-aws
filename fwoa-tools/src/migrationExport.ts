/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { WriteStream, createWriteStream, writeFileSync } from 'fs';
import { S3 } from 'aws-sdk';
import * as dotenv from 'dotenv';
import yargs from 'yargs';
import { GlueJobResponse, getExportStateFile, getExportStatus, startExportJob } from './exportHelper';
import { EXPORT_STATE_FILE_NAME, ExportOutput, MS_TO_HOURS, checkConfiguration } from './migrationUtils';

dotenv.config({ path: '.env' });
const { GLUE_JOB_NAME, EXPORT_BUCKET_NAME } = process.env;
const EXPORT_OUTPUT_LOG_FILE_PREFIX: string = 'export_output_';

// eslint-disable-next-line security/detect-non-literal-fs-filename
const logs: WriteStream = createWriteStream(`${EXPORT_OUTPUT_LOG_FILE_PREFIX}${Date.now().toString()}.log`, {
  flags: 'a'
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCmdOptions(): any {
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
    .describe('snapshotExists', 'Export from a previous snapshot in S3')
    .boolean('snapshotExists')
    .default('snapshotExists', false)
    .alias('e', 'snapshotExists')
    .describe('snapshotLocation', 'Previous Export location S3 URI')
    .default('snapshotLocation', null)
    .alias('l', 'snapshotLocation')
    .describe('since', 'Optional: timestamp from which to start export')
    .alias('t', 'since')
    .default('since', null).argv;
}

let output: ExportOutput = {
  jobId: '',
  file_names: {}
};

export async function startExport(
  since: string,
  smartClient: boolean,
  snapshotExists: boolean,
  snapshotLocation: string
): Promise<{
  jobId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportResponse: any;
}> {
  const params = {
    since,
    glueJobName: GLUE_JOB_NAME!,
    apiUrl: smartClient ? process.env.SMART_SERVICE_URL! : process.env.API_URL!,
    tenantId: process.env.MIGRATION_TENANT_ID || undefined,
    snapshotExists,
    snapshotLocation
  };
  const glueJobResponse: GlueJobResponse = await startExportJob(params);
  const startTime = new Date();
  logs.write(`${startTime.toISOString()}: Started Export\n`);
  console.log(`Checking Status with ${glueJobResponse.jobId} and run id ${glueJobResponse.jobRunId}`);
  const response = await getExportStatus(GLUE_JOB_NAME!, logs, glueJobResponse.jobRunId);
  const finishTime = new Date();
  logs.write(
    `${new Date().toISOString()}: Completed Export. Elapsed Time - ${
      Math.abs(startTime.getTime() - finishTime.getTime()) / MS_TO_HOURS
    } hours\n`
  );

  // return the last element of the split array, which is the jobId portion of the url
  logs.write(`${new Date().toISOString()}: Export JobId - ${glueJobResponse.jobId}\n`);
  output.jobId = glueJobResponse.jobId!;

  return { jobId: glueJobResponse.jobId!, exportResponse: response };
}

async function generateStateFile(bucket: string, prefix: string): Promise<ExportOutput> {
  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });

  // to copy the s3 files to a different bucket, you can replace the
  // third parameter with a different bucket
  return await getExportStateFile(s3Client, bucket, prefix);
}
export async function runScript(
  smartClient: boolean,
  dryRun: boolean,
  since: string,
  snapshotExists: boolean,
  snapshotLocation: string
): Promise<void> {
  if (since) {
    try {
      since = new Date(since).toISOString();
    } catch (e) {
      throw new Error('Provided since timestamp not in correct format (ISO 8601)');
    }
  }

  await checkConfiguration(logs, smartClient ? 'Smart' : 'Cognito');
  logs.write('Verification complete');
  if (!dryRun) {
    const response = await startExport(since, smartClient, snapshotExists, snapshotLocation);
    logs.write('Export completed. Start sorting objects.');

    let tenantPrefix = '';
    if (process.env.MIGRATION_TENANT_ID) {
      tenantPrefix = `${process.env.MIGRATION_TENANT_ID}/`;
    }
    const names = await generateStateFile(EXPORT_BUCKET_NAME!, `${tenantPrefix}${response.jobId}/`);
    output = {
      jobId: output.jobId,
      file_names: names.file_names
    };
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(`./${EXPORT_STATE_FILE_NAME}`, JSON.stringify(output));
    logs.write(`${new Date().toISOString()}: Finished sorting export objects into folders.\n`);
  }
}

export function buildRunScriptParams(): {
  smartClient: boolean;
  dryRun: boolean;
  since: string;
  snapshotExists: boolean;
  snapshotLocation: string;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const argv: any = parseCmdOptions();
  const smartClient: boolean = argv.smart;
  const dryRun: boolean = argv.dryRun;
  const since: string = argv.since;
  const snapshotExists: boolean = argv.snapshotExists;
  const snapshotLocation: string = argv.snapshotLocation;
  return { smartClient, dryRun, since, snapshotExists, snapshotLocation };
}

/* istanbul ignore next */
(async () => {
  // Don't runScript when code is being imported for unit tests
  if (!process.env.UNIT_TEST) {
    const { smartClient, dryRun, since, snapshotExists, snapshotLocation } = buildRunScriptParams();
    await runScript(smartClient, dryRun, since, snapshotExists, snapshotLocation);
    logs.end();
  }
})().catch((error) => {
  console.log('Run failed', error);
  logs.write(`\n**${new Date().toISOString()}: ERROR!**\n${error}\n`);
  logs.end();
});
