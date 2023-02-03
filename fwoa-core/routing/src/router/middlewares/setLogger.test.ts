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
  test('test logger designed for encryption case', async () => {
    process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION = 'true';
    const nextMock = jest.fn();
    const req = {
      requestContext: {
        requestTimeEpoch: 1673369044,
        identity: {
          apiKeyId: 'asdasd',
          sourceIp: 'asdad'
        },
        path: 'asdas',
        httpMethod: 'asdasda',
        stage: 'dev'
      },
      apiGateway: {
        event: {
          httpMethod: 'asdas',
          queryStringParameters: 'fadfdas',
          pathParameters: { proxy: 'asfdsfdsf' }
        },
        context: {
          logGroupName: 'asd',
          logStreamName: 'asdsa',
          domainName: 'asdas',
          awsRequestId: 'asdasdsa'
        }
      },
      headers: {
        'user-agent': 'PostmanRuntime/7.30.0'
      }
    } as unknown as express.Request;
    const res = {
      locals: {
        userIdentity: {
          sub: 'example@amazon.com',
          fhirUser: 'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/1234567876',
          scope: [
            'fhirUser',
            'openid',
            'patient/*.*',
            'launch/patient',
            'profile',
            'user/*.*',
            'patient_selection'
          ],
          usableScopes: ['patient/*.*', 'user/*.*'],
          launch_response_patient:
            'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/9876543212',
          jti: 'AT.ASDFGHJKL',
          iss: 167337044,
          aud: 167337144,
          iat: 167338044,
          exp: 167339044,
          auth_time: 1673386822,
          scp: [
            'fhirUser',
            'openid',
            'patient/*.*',
            'launch/patient',
            'profile',
            'user/*.*',
            'patient_selection'
          ]
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
          apiKeyId: 'asdasd',
          sourceIp: 'asdad'
        },
        path: 'asdas',
        httpMethod: 'asdasda',
        stage: 'dev'
      },
      apiGateway: {
        event: {
          httpMethod: 'asdas',
          queryStringParameters: 'fadfdas',
          pathParameters: { proxy: 'asfdsfdsf' }
        },
        context: {
          logGroupName: 'asd',
          logStreamName: 'asdsa',
          domainName: 'asdas',
          awsRequestId: 'asdasdsa'
        }
      },
      headers: {
        'user-agent': 'PostmanRuntime/7.30.0'
      }
    } as unknown as express.Request;
    const res = {
      locals: {
        userIdentity: {
          sub: 'example@amazon.com',
          fhirUser: 'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/1234567876',
          scope: [
            'fhirUser',
            'openid',
            'patient/*.*',
            'launch/patient',
            'profile',
            'user/*.*',
            'patient_selection'
          ],
          usableScopes: ['patient/*.*', 'user/*.*'],
          launch_response_patient:
            'https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/9876543212',
          jti: 'AT.ASDFGHJKL',
          iss: 167337044,
          aud: 167337144,
          iat: 167338044,
          exp: 167339044,
          auth_time: 1673386822,
          scp: [
            'fhirUser',
            'openid',
            'patient/*.*',
            'launch/patient',
            'profile',
            'user/*.*',
            'patient_selection'
          ]
        }
      }
    } as unknown as express.Response;

    await setLoggerMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toBeCalledTimes(1);
    expect(mLogger.error).toMatchSnapshot();
  });
});
