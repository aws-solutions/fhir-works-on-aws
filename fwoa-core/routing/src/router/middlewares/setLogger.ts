/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import express, { json } from 'express';
import _ from 'lodash';
import { v4 } from 'uuid';
import getComponentLogger, { getEncryptLogger } from '../../loggerBuilder';
import {
  captureFhirUserParts,
  capturePathParts,
  capturePathParametersProxyParts
} from '../../regExpressions';

// define metadata,who,what,when,where,how,requestOther,responseOther 5 categoires in logger

export interface metaDataAttribute {
  uid: string;
  timestamp: string;
  category: string;
  encryptedFields?: string[];
  payLoadToEncrypt?: { [key: string]: string };
  encryptedPayLoad?: string;
}

export interface whoAttribute {
  userIdentity: {
    sub: string;
    fhirUser?: string;
    'cognito:groups'?: string[];
    'cognito:username'?: string;
    'custom:tenantId'?: string;
  };
  apiKeyId: string;
}

export interface whatAttribute {
  userIdentity: {
    scopes?: string[];
    usableScopes?: string[];
  };
  requestContext: { path: string; httpMethod: string };
  apiGateway: {
    event: {
      httpMethod: string;
      queryStringParameters?: { [key: string]: string };
      pathParameters?: {
        proxy: string;
      };
    };
  };
}
export interface whenAttribute {
  requestContext: { requestTimeEpoch: string };
}

export interface whereAttribute {
  apiGateway: {
    Context: {
      logGroupName: string;
      logStreamName: string;
    };
  };
  'User-agent': string;
  requestContext: {
    domainName: string;
    identity: {
      sourceIp: string;
    };
  };
}

export interface howAttribute {
  apiGateway: {
    context: { awsRequestId: string };
  };
  userIdentity: { jti: string };
}
export interface requestOtherAttribute {
  requestContext: {
    stage: string;
  };
}

export interface responseOtherAttribute {
  userIdentity: {
    'launch-response-patient'?: string;
    iss: string; // issuer: identify who created and signed the access token
    aud: string; // The dev URL of the fhir works that you're trying to access using the JWT to authenticate
    scp?: string[]; // The scopes from the original request
    iat: string; // When the token was issued
    exp: string; // The token expiration time
    'auth-time': string; // when the authentication occurs
  };
}

export interface setEntireLogger {
  logMetadata: metaDataAttribute;
  who: whoAttribute;
  what: whatAttribute;
  when: whenAttribute;
  where: whereAttribute;
  how: howAttribute;
  requestOther: requestOtherAttribute;
  responseOther: responseOtherAttribute;
}

function preprocessFieldsToEncrypted(fieldsToEncrypt: string[], logging: setEntireLogger): setEntireLogger {
  // mark encrypted string for selected elements
  const fieldsToEncryptedObject: { [key: string]: string } = {};
  const loggingPreprocessed = { ...logging };
  const validFieldsToEncrypt: string[] = [];
  const stringToReplace = 'encrypted';
  fieldsToEncrypt.forEach((selectedField) => {
    let markedContent: string | undefined | null;
    // eslint-disable-next-line default-case
    const contentInField = _.get(logging, selectedField);
    if (contentInField) {
      switch (selectedField) {
        case 'who.userIdentity.sub': {
          markedContent = stringToReplace;
          break;
        }
        // {fhirUser:https://example.execute-api.us-east-1.amazonaws.com/dev/Practitioner/00000000-0000-0000-0000-000000000000}
        // {fhirUser:https://example.execute-api.us-east-1.amazonaws.com/dev/Patient/00000000-0000-0000-0000-000000000000}
        // match groups = ["https://example.execute-api.us-east-1.amazonaws.com/dev/Patient/00000000-0000-0000-0000-000000000000", "https://example.execute-api.us-east-1.amazonaws.com/dev/Patient/", "00000000-0000-0000-0000-000000000000", undefined]
        case 'who.userIdentity.fhirUser': {
          const actualMatch = contentInField.match(captureFhirUserParts);
          if (actualMatch && actualMatch[2]) {
            markedContent = actualMatch[1] + stringToReplace;
          } else {
            markedContent = contentInField;
          }
          break;
        }
        // queryStringParameters: {name: 'FakeName'}
        // queryStringParameters: null
        case 'what.apiGateway.event.queryStringParameters': {
          markedContent = stringToReplace;
          break;
        }
        // {path: '/dev/Patient/00000000-0000-0000-0000-000000000000'}
        // {path: '/dev/Practitioner'}
        // match groups = ["/dev/Patient/00000000-0000-0000-0000-000000000000", "/dev/Patient/", "00000000-0000-0000-0000-000000000000"]
        case 'what.requestContext.path': {
          const actualMatch = contentInField.match(capturePathParts);
          if (actualMatch && actualMatch[2]) {
            markedContent = actualMatch[1] + stringToReplace;
          } else {
            markedContent = contentInField;
          }
          break;
        }
        // {pathParameters:{ proxy: 'patient/00000000-0000-0000-0000-000000000000' }}
        // {pathParameters:{}}
        // match groups =["Patient/00000000-0000-0000-0000-000000000000", "Patient/", "00000000-0000-0000-0000-000000000000"]
        case 'what.apiGateway.event.pathParameters.proxy': {
          const actualMatch = contentInField.match(capturePathParametersProxyParts);
          if (actualMatch && actualMatch[2]) {
            markedContent = actualMatch[1] + stringToReplace;
          } else {
            markedContent = contentInField;
          }
          break;
        }
        // {sourceIp: '0.0.0.0'}
        case 'where.requestContext.identity.sourceIp': {
          markedContent = stringToReplace;
          break;
        }
        // {launch-response-patient:'https://example.execute-api.us-east-1.amazonaws.com/dev/Patient/22222222-2222-2222-2222-222222222222'}
        // {launch-response-patient:'Patient/22222222-2222-2222-2222-222222222222'}
        // {launch-response-patient:''}
        case 'responseOther.userIdentity.launch-response-patient': {
          const actualMatchCase1 = contentInField.match(captureFhirUserParts);
          const actualMatchCase2 = contentInField.match(capturePathParametersProxyParts);
          if (actualMatchCase1 && actualMatchCase1[2]) {
            markedContent = actualMatchCase1[1] + stringToReplace;
          } else if (actualMatchCase2 && actualMatchCase2[2]) {
            markedContent = actualMatchCase2[1] + stringToReplace;
          } else {
            markedContent = contentInField;
          }
          break;
        }
        default:
          throw new Error('Field to encrypt must be the existing cases');
      }
      if (markedContent !== contentInField) {
        _.set(fieldsToEncryptedObject, selectedField, contentInField);
        _.set(loggingPreprocessed, selectedField, markedContent);
        validFieldsToEncrypt.push(selectedField);
      }
    }
  });
  if (Object.keys(fieldsToEncryptedObject).length !== 0) {
    _.set(loggingPreprocessed, 'logMetadata.encryptedFields', validFieldsToEncrypt);
    _.set(loggingPreprocessed, 'logMetadata.payLoadToEncrypt', fieldsToEncryptedObject);
  }
  return loggingPreprocessed;
}

// define logger middleware
export const setLoggerMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const response = res as any;
    const request = req as any;
    const requestTimeEpochDate = new Date(request.requestContext.requestTimeEpoch);
    const iatDate = new Date(res.locals.userIdentity.iat * 1000);
    const expDate = new Date(res.locals.userIdentity.exp * 1000);
    const authTimeDate = new Date(res.locals.userIdentity.auth_time * 1000);
    const timestampDate = new Date();
    let loggerDesign: setEntireLogger = {
      logMetadata: {
        uid: v4(),
        timestamp: timestampDate.toISOString(),
        category: 'Audit Event'
      },
      who: {
        userIdentity: {
          sub: response.locals.userIdentity.sub,
          fhirUser: response.locals.userIdentity.fhirUser,
          'cognito:groups': response.locals.userIdentity['cognito:groups'],
          'cognito:username': response.locals.userIdentity['cognito:username'],
          'custom:tenantId': response.locals.userIdentity['custom:tenantId']
        },
        apiKeyId: request.requestContext.identity.apiKeyId
      },
      what: {
        userIdentity: (({ scopes, usableScopes }) => ({ scopes, usableScopes }))(
          response.locals.userIdentity
        ),
        requestContext: (({ path, httpMethod }) => ({ path, httpMethod }))(request.requestContext),
        apiGateway: {
          event: (({ httpMethod, queryStringParameters, pathParameters }) => ({
            httpMethod,
            queryStringParameters,
            pathParameters
          }))(request.apiGateway.event)
        }
      },
      when: {
        requestContext: { requestTimeEpoch: requestTimeEpochDate.toISOString() }
      },
      where: {
        apiGateway: {
          Context: (({ logGroupName, logStreamName }) => ({ logGroupName, logStreamName }))(
            request.apiGateway.context
          )
        },
        'User-agent': request.headers['user-agent'],
        requestContext: {
          domainName: request.requestContext.domainName,
          identity: (({ sourceIp }) => ({ sourceIp }))(request.requestContext.identity)
        }
      },

      how: {
        apiGateway: { context: (({ awsRequestId }) => ({ awsRequestId }))(request.apiGateway.context) },
        userIdentity: (({ jti }) => ({ jti }))(response.locals.userIdentity)
      },
      requestOther: {
        requestContext: {
          stage: request.requestContext.stage
        }
      },
      responseOther: {
        userIdentity: {
          ...{ 'launch-response-patient': response.locals.userIdentity.launch_response_patient },
          ...(({ iss, aud, scp }) => ({
            iss,
            aud,
            scp
          }))(response.locals.userIdentity),
          iat: iatDate.toISOString(),
          exp: expDate.toISOString(),
          'auth-time': authTimeDate.toISOString()
        }
      }
    };

    loggerDesign = preprocessFieldsToEncrypted(
      [
        'who.userIdentity.sub',
        'who.userIdentity.fhirUser',
        'what.apiGateway.event.queryStringParameters',
        'what.requestContext.path',
        'what.apiGateway.event.pathParameters.proxy',
        'where.requestContext.identity.sourceIp',
        'responseOther.userIdentity.launch-response-patient'
      ],
      loggerDesign
    );
    const encryptedField = 'logMetadata.payLoadToEncrypt';
    const logger = getEncryptLogger({ encryptedField });
    await logger.error(loggerDesign);

    next();
  } catch (e) {
    next(e);
  }
};
