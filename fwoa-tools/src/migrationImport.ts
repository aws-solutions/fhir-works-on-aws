import { readFileSync } from 'fs';
import { HealthLake } from 'aws-sdk';
import { StartFHIRImportJobRequest } from 'aws-sdk/clients/healthlake';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import yargs from 'yargs';
import { ExportOutput, POLLING_TIME, sleep } from './migrationUtils';

dotenv.config({ path: '.env' });
const {
  EXPORT_BUCKET_URI,
  DATASTORE_ID,
  API_AWS_REGION,
  DATA_ACCESS_ROLE_ARN,
  HEALTHLAKE_CLIENT_TOKEN,
  IMPORT_OUTPUT_S3_URI,
  IMPORT_KMS_KEY_ARN
} = process.env;

const MAX_IMPORT_RUNTIME: number = 48 * 60 * 60 * 1000; // 48 hours

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

// get the job id from the export output file
const outputFile: ExportOutput = JSON.parse(readFileSync('migrationExport_Output.txt').toString());
const jobId: string = outputFile.jobId;

const healthLake: HealthLake = new HealthLake({
  region: API_AWS_REGION
});

async function startImport(folderNames: string[]): Promise<void> {
  for (let i: number = 0; i < folderNames.length; i += 1) {
    // eslint-disable-next-line security/detect-object-injection
    const folderName = folderNames[i];
    console.log(`Starting import for folder ${folderName}`);
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
          console.log(`successfully imported folder ${folderName}`);
          // check each file
          break;
        } else if (jobStatus.ImportJobProperties.JobStatus === 'FAILED') {
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

async function checkConfiguration(): Promise<void> {
  await healthLake
    .describeFHIRDatastore({
      DatastoreId: DATASTORE_ID!
    })
    .promise();
  console.log('successfully accessed healthlake datastore');
}

if (!dryRun) {
  startImport(outputFile.folderNames)
    .then((value) => {
      console.log('successfully completed import jobs!');
    })
    .catch((error) => {
      console.log('import failed!', error);
    });
} else {
  checkConfiguration()
    .then((value) => {
      console.log('Successfully Passed all checks!');
    })
    .catch((error) => {
      console.log('failed some checks!', error);
    });
}
