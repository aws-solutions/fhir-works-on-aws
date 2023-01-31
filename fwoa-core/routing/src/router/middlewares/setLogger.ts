/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-" ".0
 *
 */

import { Console } from 'console';
import { promises } from 'dns';
import { Agent } from 'http';
import express, { json } from 'express';
import _ from 'lodash';
import uuidv4 from 'uuid/v4';
import getComponentLogger, { getEncryptLogger } from '../../loggerBuilder';
/**
 * Set Logger'
 */

// define metadata,who,what,when,where,how,requestOther,responseOther 5 categoires in logger
export interface metaDataAttribute {
  uid: string;
  timestamp: string;
  category: string;
  EncryptedFields?: { [key: string]: boolean };
  EncryptedPayLoad?: { [key: string]: string } | string;
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
      queryStringParameters: { [key: string]: string } | null;
      pathParameters: {
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
  domainName: string;
  'User-agent': string;
  requestContext: {
    sourceIp: string;
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
    iss: string;
    aud: string;
    scp?: string[];
    iat: string;
    exp: string;
    'auth-time': string;
  };
}

export interface setLogger {
  logMetadata: metaDataAttribute;
  who: whoAttribute;
  what: whatAttribute;
  when: whenAttribute;
  where: whereAttribute;
  how: howAttribute;
  requestOther: requestOtherAttribute;
  responseOther: responseOtherAttribute;
}

function preprocessFieldsToEncrypted(
  fieldsToEncrypted: { [key: string]: boolean },
  logging: setLogger
): setLogger {
  // add encrypted for selected elements
  const fieldsToEncryptedObject: { [key: string]: string } = {};
  const loggingPreproceesed = { ...logging };

  Object.keys(fieldsToEncrypted).forEach((key) => {
    const keyArray = key.split('.');
    const elementToEncrypted = _.get(logging, keyArray);
    if (elementToEncrypted) {
      if (fieldsToEncrypted[key] === false) {
        const elementArray = elementToEncrypted.split('/');
        let elementResourceId = `${elementArray.pop()}`;
        if (elementResourceId.includes('-')) {
          elementResourceId = 'encrypted';
        }
        elementArray.push(elementResourceId);
        const encryptElement = elementArray.join('/');
        _.set(loggingPreproceesed, keyArray, encryptElement);
      } else {
        _.set(loggingPreproceesed, keyArray, 'encrypted');
      }
    } else {
      _.set(loggingPreproceesed, keyArray, '');
    }
    _.set(fieldsToEncryptedObject, keyArray, elementToEncrypted);
  });
  if (Object.keys(fieldsToEncryptedObject).length !== 0) {
    _.set(loggingPreproceesed, ['logMetadata', 'EncryptedFields'], Object.keys(fieldsToEncrypted));
    _.set(loggingPreproceesed, ['logMetadata', 'EncryptedPayLoad'], fieldsToEncryptedObject);
  }
  return loggingPreproceesed;
}

// define logger middleware
export const setLoggerMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const requestTimeEpochDate = new Date((req as any).requestContext.requestTimeEpoch);
    const iatDate = new Date(res.locals.userIdentity.iat * 1000);
    const expDate = new Date(res.locals.userIdentity.exp * 1000);
    const authTimeDate = new Date(res.locals.userIdentity.auth_time * 1000);
    const timestampDate = new Date();
    // initialize encrypt elements
    let encryptSub: string;
    let encryptfhirUser: string;
    let encryptPath: string;
    let encryptPathParameterProxy: string;
    let encryptlaunchResponsePatient: string;
    let encryptSourceIp: string;
    let queryStringParametersObject: { [keys: string]: string };

    let loggerDesign: setLogger = {
      logMetadata: {
        uid: uuidv4(),
        timestamp: timestampDate.toISOString(),
        category: 'Audit Event'
      },
      who: {
        userIdentity: {
          sub: (res as any).locals.userIdentity.sub,
          fhirUser: (res as any).locals.userIdentity.fhirUser,
          'cognito:groups': (res as any).locals.userIdentity['cognito:groups'],
          'cognito:username': (res as any).locals.userIdentity['cognito:username'],
          'custom:tenantId': (res as any).locals.userIdentity['custom:tenantId']
        },
        apiKeyId: (req as any).requestContext.identity.apiKeyId
      },
      what: {
        userIdentity: (({ scopes, usableScopes }) => ({ scopes, usableScopes }))(
          (res as any).locals.userIdentity
        ),
        requestContext: (({ path, httpMethod }) => ({ path, httpMethod }))((req as any).requestContext),
        apiGateway: {
          event: (({ httpMethod, queryStringParameters, pathParameters }) => ({
            httpMethod,
            queryStringParameters,
            pathParameters
          }))((req as any).apiGateway.event)
        }
      },
      when: {
        requestContext: { requestTimeEpoch: requestTimeEpochDate.toISOString() }
      },
      where: {
        apiGateway: {
          Context: (({ logGroupName, logStreamName }) => ({ logGroupName, logStreamName }))(
            (req as any).apiGateway.context
          )
        },
        domainName: (req as any).requestContext.domainName,
        'User-agent': (req as any).headers['user-agent'],
        requestContext: (({ sourceIp }) => ({ sourceIp }))((req as any).requestContext.identity)
      },
      how: {
        apiGateway: { context: (({ awsRequestId }) => ({ awsRequestId }))((req as any).apiGateway.context) },
        userIdentity: (({ jti }) => ({ jti }))((res as any).locals.userIdentity)
      },
      requestOther: {
        requestContext: {
          stage: (req as any).requestContext.stage
        }
      },
      responseOther: {
        userIdentity: {
          ...{ 'launch-response-patient': (res as any).locals.userIdentity.launch_response_patient },
          ...(({ iss, aud, scp }) => ({
            iss,
            aud,
            scp
          }))((res as any).locals.userIdentity),
          iat: iatDate.toISOString(),
          exp: expDate.toISOString(),
          'auth-time': authTimeDate.toISOString()
        }
      }
    };
    let encryptedFileds: string[];
    console.log(process.env.LOGGING_MIDDLEWARE_KMS_KEY);
    let logger: any;
    if (process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION === 'true') {
      loggerDesign = preprocessFieldsToEncrypted(
        {
          'who.userIdentity.sub': true,
          'who.userIdentity.fhirUser': false,
          'what.apiGateway.event.queryStringParameters': true,
          'what.requestContext.path': false,
          'what.apiGateway.event.pathParameters.proxy': false,
          'where.requestContext.sourceIp': true,
          'responseOther.userIdentity.launch-response-patient': false
        },
        loggerDesign
      );
      encryptedFileds = ['logMetadata.EncryptedPayLoad'];
      logger = getEncryptLogger(encryptedFileds);
      logger.error(loggerDesign);
    } else {
      logger = getComponentLogger();
      logger.error(JSON.stringify(loggerDesign, null, ' '));
    }

    next();
  } catch (e) {
    next(e);
  }
};
