//* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

const Logger = {
  error: jest.fn()
};
const encryptLogger = {
  error: jest.fn()
};

jest.mock('../../loggerBuilder', () => {
  const originalModule = jest.requireActual('../../loggerBuilder');
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn(() => Logger),
    getEncryptLogger: jest.fn(() => encryptLogger)
  };
});

jest.mock('uuid', () => ({ v4: () => '00000000-0000-0000-0000-000000000000' }));

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
import express from 'express';
import { setLoggerMiddleware } from './setLogger';

describe('createLoggerMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('test encryption', () => {
    test('happy case', async () => {
      //BUILD
      const nextMock = jest.fn();
      const req = {
        requestContext: {
          requestTimeEpoch: 1673369044,
          identity: {
            apiKeyId: 'FakeApiKeyId',
            sourceIp: '0.0.0.0'
          },
          domainName: 'FakeDomainName',
          path: '/dev/Patient',
          httpMethod: 'GET',
          stage: 'dev'
        },
        apiGateway: {
          event: {
            httpMethod: 'GET',
            queryStringParameters: {
              name: 'FakeName'
            },
            pathParameters: { proxy: 'patient/00000000-0000-0000-0000-000000000000' }
          },
          context: {
            logGroupName: 'FakeLogGroupName',
            logStreamName: 'FakeLogStreamName',
            awsRequestId: '11111111-1111-1111-1111-111111111111'
          }
        },
        headers: {
          'user-agent': 'FakeUserAgent'
        }
      } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            sub: 'example@example.com',
            fhirUser:
              'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
            scopes: ['FakeScope1', 'FakeScope2', 'FakeScope3'],
            usableScopes: ['FakeScope2', 'FakeScope3'],
            launch_response_patient:
              'https://example.execute-api.us-east-1.amazonaws.com/dev/Patient/22222222-2222-2222-2222-222222222222',
            jti: 'AT.FakeJTIValue',
            iss: 'FakeIssuer',
            aud: 'FakeAudience',
            iat: 167338044,
            exp: 167339044,
            auth_time: 1673386822,
            scp: ['FakeScope1', 'FakeScope2', 'FakeScope3']
          }
        }
      } as unknown as express.Response;

      //OPERATE
      await setLoggerMiddleware(req, res, nextMock);

      //CHECK
      expect(nextMock).toBeCalledTimes(1);
      expect(encryptLogger.error).toMatchSnapshot();
    });

    test('test null value in a field for encryption case', async () => {
      //BUILD
      const nextMock = jest.fn();
      const req = {
        requestContext: {
          requestTimeEpoch: 167337044,
          identity: {
            apiKeyId: 'FakeApiKeyId',
            sourceIp: '0.0.0.0'
          },
          domainName: 'FakeDomainName',
          path: '/dev/Patient',
          httpMethod: 'GET',
          stage: 'dev'
        },
        apiGateway: {
          event: {
            httpMethod: 'GET',
            queryStringParameters: null,
            pathParameters: { proxy: 'patient/00000000-0000-0000-0000-000000000000' }
          },
          context: {
            logGroupName: 'FakeLogGroupName',
            logStreamName: 'FakeLogStreamName',
            awsRequestId: '11111111-1111-1111-1111-111111111111'
          }
        },
        headers: {
          'user-agent': 'FakeUserAgent'
        }
      } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            sub: 'example@example.com',
            fhirUser:
              'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
            scopes: ['FakeScope1', 'FakeScope2', 'FakeScope3'],
            usableScopes: ['FakeScope2', 'FakeScope3'],
            launch_response_patient: '',
            jti: 'AT.FakeJTIValue',
            iss: 'FakeIssuer',
            aud: 'FakeAudience',
            iat: 167338044,
            exp: 167339044,
            auth_time: 1673386822,
            scp: ['FakeScope1', 'FakeScope2', 'FakeScope3']
          }
        }
      } as unknown as express.Response;
      //OPERATE
      await setLoggerMiddleware(req, res, nextMock);

      //CHECK
      expect(nextMock).toBeCalledTimes(1);
      expect(encryptLogger.error).toMatchSnapshot();
    });
    test('test reference launch context value for encryption case', async () => {
      //BUILD
      const nextMock = jest.fn();
      const req = {
        requestContext: {
          requestTimeEpoch: 167337044,
          identity: {
            apiKeyId: 'FakeApiKeyId',
            sourceIp: '0.0.0.0'
          },
          domainName: 'FakeDomainName',
          path: '/dev/Patient',
          httpMethod: 'GET',
          stage: 'dev'
        },
        apiGateway: {
          event: {
            httpMethod: 'GET',
            queryStringParameters: null,
            pathParameters: { proxy: 'patient/00000000-0000-0000-0000-000000000000' }
          },
          context: {
            logGroupName: 'FakeLogGroupName',
            logStreamName: 'FakeLogStreamName',
            awsRequestId: '11111111-1111-1111-1111-111111111111'
          }
        },
        headers: {
          'user-agent': 'FakeUserAgent'
        }
      } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            sub: 'example@example.com',
            fhirUser:
              'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
            scopes: ['FakeScope1', 'FakeScope2', 'FakeScope3'],
            usableScopes: ['FakeScope2', 'FakeScope3'],
            launch_response_patient: 'Patient/22222222-2222-2222-2222-222222222222',
            jti: 'AT.FakeJTIValue',
            iss: 'FakeIssuer',
            aud: 'FakeAudience',
            iat: 167338044,
            exp: 167339044,
            auth_time: 1673386822,
            scp: ['FakeScope1', 'FakeScope2', 'FakeScope3']
          }
        }
      } as unknown as express.Response;
      //OPERATE
      await setLoggerMiddleware(req, res, nextMock);

      //CHECK
      expect(nextMock).toBeCalledTimes(1);
      expect(encryptLogger.error).toMatchSnapshot();
    });
  });
});
