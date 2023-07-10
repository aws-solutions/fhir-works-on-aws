/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { WriteStream } from 'fs';
import * as AWS from 'aws-sdk';
import { HealthLake, S3, CognitoIdentityServiceProvider } from 'aws-sdk';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';
import { isEmpty } from 'lodash';
import { stringify } from 'qs';

export interface ExportOutput {
  jobId: string;
  file_names: Record<string, string[]>;
}

export async function sleep(milliseconds: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const POLLING_TIME: number = 5000;
export const EXTENDED_POLLING_TIME: number = POLLING_TIME * 20;
export const MS_TO_HOURS: number = 60 * 60 * 1000;
export const HEALTHLAKE_BUNDLE_LIMIT: number = 160;
export const EXPORT_STATE_FILE_NAME: string = 'migrationExport_Output.json';

const getAuthParameters: () => { PASSWORD: string; USERNAME: string } = () => {
  const { COGNITO_USERNAME, COGNITO_PASSWORD } = process.env;

  const password = COGNITO_PASSWORD;
  const username = COGNITO_USERNAME;
  if (username === undefined) {
    throw new Error('COGNITO_USERNAME environment variable is not defined');
  }
  if (COGNITO_PASSWORD === undefined) {
    throw new Error('COGNITO_PASSWORD environment variable is not defined');
  }

  return {
    USERNAME: username!,
    PASSWORD: password!
  };
};

export const getFhirClient: () => Promise<AxiosInstance> = async (): Promise<AxiosInstance> => {
  dotenv.config({ path: '.env' });

  const { API_URL, API_KEY, API_AWS_REGION, COGNITO_CLIENT_ID } = process.env;
  if (API_URL === undefined) {
    throw new Error('API_URL environment variable is not defined');
  }
  if (API_KEY === undefined) {
    throw new Error('API_KEY environment variable is not defined');
  }
  if (API_AWS_REGION === undefined) {
    throw new Error('API_AWS_REGION environment variable is not defined');
  }
  if (COGNITO_CLIENT_ID === undefined) {
    throw new Error('COGNITO_CLIENT_ID environment variable is not defined');
  }

  AWS.config.update({ region: API_AWS_REGION });
  const Cognito = new CognitoIdentityServiceProvider();

  const IdToken = (
    await Cognito.initiateAuth({
      ClientId: COGNITO_CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: getAuthParameters()
    }).promise()
  ).AuthenticationResult!.IdToken!;

  const baseURL = API_URL;

  return axios.create({
    headers: {
      'x-api-key': API_KEY,
      Authorization: `Bearer ${IdToken}`
    },
    baseURL
  });
};

async function getAuthToken(
  username: string,
  password: string,
  clientId: string,
  clientPw: string,
  oauthApiEndpoint: string,
  requestAdditionalScopes?: boolean
): Promise<string> {
  const data = stringify({
    grant_type: 'password',
    username,
    password,
    scope: requestAdditionalScopes ? 'fhirUser user/*.*' : 'system/*.read' // hard-code system/*.read to scope system to only exports
  });

  const authToken = `Basic ${Buffer.from(`${clientId}:${clientPw}`).toString('base64')}`;

  const config: AxiosRequestConfig = {
    method: 'post',
    url: `${oauthApiEndpoint}/token`,
    headers: {
      Accept: 'application/json',
      Authorization: authToken,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data
  };

  const response = await axios(config);
  return response.data.access_token;
}

export const getFhirClientSMART: () => Promise<AxiosInstance> = async (): Promise<AxiosInstance> => {
  dotenv.config({ path: '.env' });

  // Check all environment variables are provided
  const {
    SMART_AUTH_USERNAME,
    SMART_AUTH_PASSWORD,
    SMART_CLIENT_ID,
    SMART_CLIENT_SECRET,
    SMART_OAUTH2_API_ENDPOINT,
    SMART_SERVICE_URL,
    SMART_API_KEY
  } = process.env;
  if (SMART_AUTH_USERNAME === undefined) {
    throw new Error('SMART_AUTH_USERNAME environment variable is not defined');
  }
  if (SMART_AUTH_PASSWORD === undefined) {
    throw new Error('SMART_AUTH_PASSWORD environment variable is not defined');
  }
  if (SMART_CLIENT_ID === undefined) {
    throw new Error('SMART_CLIENT_ID environment variable is not defined');
  }
  if (SMART_CLIENT_SECRET === undefined) {
    throw new Error('SMART_CLIENT_SECRET environment variable is not defined');
  }
  if (SMART_OAUTH2_API_ENDPOINT === undefined) {
    throw new Error('SMART_OAUTH2_API_ENDPOINT environment variable is not defined');
  }
  if (SMART_SERVICE_URL === undefined) {
    throw new Error('SMART_SERVICE_URL environment variable is not defined');
  }
  if (SMART_API_KEY === undefined) {
    throw new Error('SMART_API_KEY environment variable is not defined');
  }

  // SMART_AUTH_USERNAME should be for a System
  const username = process.env.SMART_AUTH_USERNAME;
  if (!username) {
    throw new Error('SMART_AUTH_ADMIN_USERNAME environment variable is not defined');
  }
  const accessToken = await getAuthToken(
    username,
    SMART_AUTH_PASSWORD,
    SMART_CLIENT_ID,
    SMART_CLIENT_SECRET,
    SMART_OAUTH2_API_ENDPOINT
  );

  const baseURL = SMART_SERVICE_URL;

  return axios.create({
    headers: {
      'x-api-key': SMART_API_KEY,
      Authorization: `Bearer ${accessToken}`
    },
    baseURL
  });
};

function checkEnvVars(envVarsToCheck: string[]): void {
  //eslint-disable-next-line security/detect-object-injection
  const undefinedEnvVars = envVarsToCheck.filter((varName) => isEmpty(process.env[varName]));
  if (undefinedEnvVars.length > 0) {
    throw new Error(`Environment variables ${undefinedEnvVars.join(', ')} not defined.`);
  }
}

export type FhirServerType = 'Smart' | 'Cognito';
// This function checks the configuration required for every scripts
// This ensures any configuration issue is discovered from the start and dealt with
export async function checkConfiguration(logs: WriteStream, fhirServerType?: FhirServerType): Promise<void> {
  dotenv.config({ path: '.env' });
  logs.write(`${new Date().toISOString()}: Checking configuration\n`);

  const envVarsToCheck = [
    // Export script variables
    'EXPORT_BUCKET_NAME',
    'BINARY_BUCKET_NAME',
    'API_AWS_REGION',
    'GLUE_JOB_NAME',
    // Import script variables
    'DATASTORE_ID',
    'DATASTORE_ENDPOINT',
    'DATA_ACCESS_ROLE_ARN',
    'IMPORT_KMS_KEY_ARN',
    'IMPORT_OUTPUT_S3_BUCKET_NAME',
    'HEALTHLAKE_CLIENT_TOKEN',
    'EXPORT_BUCKET_URI',
    'IMPORT_OUTPUT_S3_URI'
  ];
  checkEnvVars(envVarsToCheck);
  logs.write('Export and Import environment variables verified.');

  const s3Client = new S3({
    region: process.env.API_AWS_REGION
  });
  await s3Client.listObjectsV2({ Bucket: process.env.EXPORT_BUCKET_NAME! }).promise();
  await s3Client.listObjectsV2({ Bucket: process.env.BINARY_BUCKET_NAME! }).promise();
  await s3Client.listObjectsV2({ Bucket: process.env.IMPORT_OUTPUT_S3_BUCKET_NAME! }).promise();

  logs.write('S3 buckets access verified.');

  if (fhirServerType === 'Smart') await getFhirClientSMART();
  if (fhirServerType === 'Cognito') await getFhirClient();

  const healthLake: HealthLake = new HealthLake({
    region: process.env.API_AWS_REGION
  });
  await healthLake.describeFHIRDatastore({ DatastoreId: process.env.DATASTORE_ID! }).promise();
  logs.write('Healthlake access verified.');

  logs.write(`${new Date().toISOString()}: Finished checking configuration\n`);
}

export const binaryResource: { resourceType: string; contentType: string } = {
  resourceType: 'Binary',
  contentType: 'image/jpeg'
};

export const binaryObject: string = 'exampleBinaryStreamData';

export interface BundleEntry {
  request: { method: string; url: string };
}

export interface Bundle {
  resourceType: string;
  type: string;
  entry: BundleEntry[];
}

export const getEmptyFHIRBundle = (): Bundle => {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: []
  };
};
