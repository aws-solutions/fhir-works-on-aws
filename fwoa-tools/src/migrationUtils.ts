/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import * as AWS from 'aws-sdk';
import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';
import { stringify } from 'qs';

const getAuthParameters: () => { PASSWORD: string; USERNAME: string } = () => {
  const { COGNITO_USERNAME, COGNITO_PASSWORD } = process.env;

  if (COGNITO_USERNAME === undefined) {
    throw new Error('COGNITO_USERNAME environment variable is not defined');
  }
  if (COGNITO_PASSWORD === undefined) {
    throw new Error('COGNITO_PASSWORD environment variable is not defined');
  }

  const password = COGNITO_PASSWORD;
  const username = COGNITO_USERNAME;

  return {
    USERNAME: username,
    PASSWORD: password
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
  oauthApiEndpoint: string
): Promise<string> {
  const data = stringify({
    grant_type: 'password',
    username,
    password,
    scope: 'system/*.read' // hard-code system/*.read to scope system to only exports
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
    throw new Error('SMART_INTEGRATION_TEST_CLIENT_ID environment variable is not defined');
  }
  if (SMART_CLIENT_SECRET === undefined) {
    throw new Error('SMART_INTEGRATION_TEST_CLIENT_PW environment variable is not defined');
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

  const username = SMART_AUTH_USERNAME;

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
