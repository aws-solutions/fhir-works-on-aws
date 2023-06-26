/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import * as AWS from 'aws-sdk';
import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';
import objectHash from 'object-hash';
import { stringify } from 'qs';

export interface ExportOutput {
  jobId: string;
  file_names: Record<string, string[]>;
}

export async function sleep(milliseconds: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const POLLING_TIME: number = 5000;
export const MS_TO_HOURS: number = 60 * 60 * 1000;
export const EXPORT_STATE_FILE_NAME: string = 'migrationExport_Output.json';

const getAuthParameters: (requestAdditionalScopes?: boolean) => { PASSWORD: string; USERNAME: string } = (
  requestAdditionalScopes?: boolean
) => {
  const { COGNITO_USERNAME, COGNITO_ADMIN_USERNAME, COGNITO_PASSWORD } = process.env;

  const password = COGNITO_PASSWORD;
  const username = requestAdditionalScopes ? COGNITO_ADMIN_USERNAME : COGNITO_USERNAME;
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

export const getFhirClient: (requestAdditionalScopes?: boolean) => Promise<AxiosInstance> = async (
  requestAdditionalScopes
): Promise<AxiosInstance> => {
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
      AuthParameters: getAuthParameters(requestAdditionalScopes)
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

export const getFhirClientSMART: (requestAdditionalScopes?: boolean) => Promise<AxiosInstance> = async (
  requestAdditionalScopes
): Promise<AxiosInstance> => {
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
  const username = requestAdditionalScopes ? process.env.SMART_AUTH_ADMIN_USERNAME : SMART_AUTH_USERNAME;
  if (!username) {
    throw new Error('SMART_AUTH_ADMIN_USERNAME environment variable is not defined');
  }
  const accessToken = await getAuthToken(
    username,
    SMART_AUTH_PASSWORD,
    SMART_CLIENT_ID,
    SMART_CLIENT_SECRET,
    SMART_OAUTH2_API_ENDPOINT,
    requestAdditionalScopes
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

export async function getResource(
  s3Client: AWS.S3,
  itemKey: string,
  bucketName: string
): Promise<AWS.S3.GetObjectOutput> {
  console.log(`getting ${itemKey}`);
  const file = await s3Client
    .getObject({
      Bucket: bucketName,
      Key: itemKey
    })
    .promise();
  if (file.$response.error) {
    throw new Error(`Failed to get object ${itemKey}`);
  }
  return file;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const binaryResource: { resourceType: string; contentType: string } = {
  resourceType: 'Binary',
  contentType: 'image/jpeg'
};

export const binaryObject: string = 'exampleBinaryStreamData';
