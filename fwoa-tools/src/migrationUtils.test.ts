/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { createWriteStream, WriteStream } from 'fs';
import AWS from 'aws-sdk';
import { InitiateAuthRequest } from 'aws-sdk/clients/cognitoidentityserviceprovider';
import * as AWSMock from 'aws-sdk-mock';
import { checkConfiguration, getFhirClient, getFhirClientSMART } from './migrationUtils';

const env = process.env;
AWSMock.setSDKInstance(AWS);

describe('MigrationUtils', () => {
  beforeEach(() => {
    expect.hasAssertions();
    AWSMock.restore();
  });

  afterEach(() => {
    AWSMock.restore();
    jest.resetModules();
    process.env = env;
  });
  describe('getFhirClient', () => {
    test('throws error when environment variable is missing', async () => {
      await expect(getFhirClient()).rejects.toThrowError('API_URL environment variable is not defined');
      process.env.API_URL = 'https://fake-api-url.com/dev';
      await expect(getFhirClient()).rejects.toThrowError('API_KEY environment variable is not defined');
      process.env.API_KEY = 'fake-api-key';
      await expect(getFhirClient()).rejects.toThrowError(
        'API_AWS_REGION environment variable is not defined'
      );
      process.env.API_AWS_REGION = 'us-east-1';
      await expect(getFhirClient()).rejects.toThrowError(
        'COGNITO_CLIENT_ID environment variable is not defined'
      );
      process.env.COGNITO_CLIENT_ID = 'fake-cognito-client-id';
      await expect(getFhirClient()).rejects.toThrowError(
        'COGNITO_USERNAME environment variable is not defined'
      );
    });

    test('should call Cognito with correct parameters', async () => {
      process.env.API_URL = 'https://fake-api-url.com/dev';
      process.env.API_KEY = 'fake-api-key';
      process.env.API_AWS_REGION = 'us-east-1';
      process.env.COGNITO_CLIENT_ID = 'fakeCognitoClientId';
      process.env.COGNITO_USERNAME = 'fake-cognito-user-name';
      process.env.COGNITO_PASSWORD = 'fake-cognito-password';

      AWSMock.mock(
        'CognitoIdentityServiceProvider',
        'initiateAuth',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: InitiateAuthRequest, callback: Function) => {
          expect(params).toMatchInlineSnapshot(`
            Object {
              "AuthFlow": "USER_PASSWORD_AUTH",
              "AuthParameters": Object {
                "PASSWORD": "fake-cognito-password",
                "USERNAME": "fake-cognito-user-name",
              },
              "ClientId": "fakeCognitoClientId",
            }
          `);
          callback(null, { AuthenticationResult: { IdToken: 'take-id-token' } });
        }
      );
      const fhirClient = await getFhirClient();
      expect(fhirClient.defaults.baseURL).toEqual('https://fake-api-url.com/dev');
      expect(fhirClient.defaults.headers).toEqual(
        expect.objectContaining({ Authorization: 'Bearer take-id-token' })
      );
    });
  });

  describe('getFhirClientSMART', () => {
    test('throws error when environment variable is missing', async () => {
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_AUTH_USERNAME environment variable is not defined'
      );
      process.env.SMART_AUTH_USERNAME = 'fake-smart-user-name';
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_AUTH_PASSWORD environment variable is not defined'
      );
      process.env.SMART_AUTH_PASSWORD = 'fake-password';
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_CLIENT_ID environment variable is not defined'
      );
      process.env.SMART_CLIENT_ID = 'fake-client-id';
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_CLIENT_SECRET environment variable is not defined'
      );
      process.env.SMART_CLIENT_SECRET = 'fake-client-secret';
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_OAUTH2_API_ENDPOINT environment variable is not defined'
      );
      process.env.SMART_OAUTH2_API_ENDPOINT = 'fake-oauth-endpoint';
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_SERVICE_URL environment variable is not defined'
      );
      process.env.SMART_SERVICE_URL = 'fake-service-url';
      await expect(getFhirClientSMART()).rejects.toThrowError(
        'SMART_API_KEY environment variable is not defined'
      );
    });
  });

  describe('checkConfiguration', () => {
    test('throws error when environment variable is missing', async () => {
      const logs: WriteStream = createWriteStream(`unit-test.log`, {
        flags: 'a'
      });
      await expect(checkConfiguration(logs)).rejects.toThrow(
        'Environment variables EXPORT_BUCKET_NAME, ' +
          'BINARY_BUCKET_NAME, GLUE_JOB_NAME, DATASTORE_ID, DATASTORE_ENDPOINT, DATA_ACCESS_ROLE_ARN, ' +
          'IMPORT_KMS_KEY_ARN, IMPORT_OUTPUT_S3_BUCKET_NAME, HEALTHLAKE_CLIENT_TOKEN, EXPORT_BUCKET_URI, ' +
          'IMPORT_OUTPUT_S3_URI not defined.'
      );
    });

    test('should check s3 and healthlake ', async () => {
      process.env.EXPORT_BUCKET_NAME = 'fake-export-bucket-name';
      process.env.BINARY_BUCKET_NAME = 'fake-binary-bucket-name';
      process.env.API_AWS_REGION = 'us-east-1';
      process.env.GLUE_JOB_NAME = 'fake-job-name';
      process.env.DATASTORE_ID = 'fake-ds-id';
      process.env.DATASTORE_ENDPOINT = 'fake-endpoint';
      process.env.DATA_ACCESS_ROLE_ARN = 'fake-role-arn';
      process.env.IMPORT_KMS_KEY_ARN = 'fake-kms-arn';
      process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'fake-import-output-bucket-name';
      process.env.HEALTHLAKE_CLIENT_TOKEN = 'fake-client-id';
      process.env.EXPORT_BUCKET_URI = 'fake-export-uri';
      process.env.IMPORT_OUTPUT_S3_URI = 'fake-import-uri';
      const logs: WriteStream = createWriteStream(`util-unit-test-${Date.now().toString()}.log`, {
        flags: 'a'
      });

      /* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
      const s3MockFunction = jest.fn((params: any, callback: Function) => callback(null, { test: 'result' }));
      const healthlakeMockFunction = jest.fn((params: any, callback: Function) => {
        expect(params).toEqual({ DatastoreId: 'fake-ds-id' });
        callback(null, { test: 'result' });
      });
      /* eslint-enable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

      AWSMock.mock('S3', 'listObjectsV2', s3MockFunction);

      AWSMock.mock('HealthLake', 'describeFHIRDatastore', healthlakeMockFunction);
      await checkConfiguration(logs);
      expect(s3MockFunction).toHaveBeenCalledTimes(3);
      expect(healthlakeMockFunction).toHaveBeenCalledTimes(1);
      logs.end();
    });
  });
});
