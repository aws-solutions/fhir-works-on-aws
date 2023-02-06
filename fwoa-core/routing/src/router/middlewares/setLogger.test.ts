const mLogger = {
  error: jest.fn()
};
process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION = 'true';
// // eslint-disable-next-line @rushstack/hoist-jest-mock
jest.mock('../../loggerBuilder', () => {
  const originalModule = jest.requireActual('../../loggerBuilder');
  return {
    __esModule: true,
    ...originalModule,
    getEncryptLogger: jest.fn(() => mLogger),
    getComponentLogger: jest.fn(() => mLogger)
  };
});

import express from 'express';
import { Logger } from 'winston';
import * as loggerBuilder from '../../loggerBuilder';
import { setLoggerMiddleware } from './setLogger';

async function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
describe('createServerUrlMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('test logger designed for encryption case', async () => {
    process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION = 'true';
    const nextMock = jest.fn();
    const req = {
      requestContext: {
        requestTimeEpoch: 1673369044,
        identity: {
          apiKeyId: 'FakeApiKeyId',
          sourceIp: '0.0.0.0'
        },
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
          domainName: 'FakeDomainName',
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
          sub: 'example@amazon.com',
          fhirUser:
            'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
          scope: ['FakeScope1', 'FakeScope2', 'FakeScope3'],
          usableScopes: ['patient/*.*', 'user/*.*'],
          launch_response_patient:
            'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
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

    await setLoggerMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toBeCalledTimes(1);
    expect(mLogger.error).toBeCalledTimes(1);
    expect(mLogger.error).toMatchSnapshot();
  });
  test('test no encrypt case', async () => {
    process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION = 'false';
    const nextMock = jest.fn();
    const req = {
      requestContext: {
        requestTimeEpoch: 1673369044,
        identity: {
          apiKeyId: 'FakeApiKeyId',
          sourceIp: '0.0.0.0'
        },
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
          domainName: 'FakeDomainName',
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
          sub: 'example@amazon.com',
          fhirUser:
            'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
          scope: ['FakeScope1', 'FakeScope2', 'FakeScope3'],
          usableScopes: ['patient/*.*', 'user/*.*'],
          launch_response_patient:
            'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000',
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

    await setLoggerMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toBeCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith();
    expect(mLogger.error).toMatchSnapshot();
  });
});
