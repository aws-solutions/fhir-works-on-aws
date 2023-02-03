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
import { captureResourceIdRegExp } from '../../regExpressions';
/**
 * Set Logger'
 */

// define metadata,who,what,when,where,how,requestOther,responseOther 5 categoires in logger
export interface metaDataAttribute {
  uid: string;
  timestamp: string;
  category: string;
  encryptedFields?: { [key: string]: boolean };
  encryptedPayLoad?: { [key: string]: string } | string;
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

function preprocessFieldsToEncrypted(
  fieldsToEncrypt: string[], // { [key: string]: boolean },
  logging: setEntireLogger
): setEntireLogger {
  // add encrypted for selected elements
  const fieldsToEncryptedObject: { [key: string]: string } = {};
  const loggingPreprocessed = { ...logging };
  const stringToReplace = 'encrypted';
  const resourceIdRegx = /(\w{8}(-\w{4}){3}-\w{12})/;
  fieldsToEncrypt.forEach((selectedField) => {
    // const contentInField = _.get(logging, selectedField, undefined);
    // if (contentInField) {
    //     if (fieldsToEncrypt[selectedField] === false) {
    //         const markedContent = contentInField.replace(captureResourceIdRegExp, stringToReplace);
    //         _.set(loggingPreprocessed, selectedField, markedContent);
    //     } else {
    //         _.set(loggingPreprocessed, selectedField, stringToReplace);
    //     }
    //     _.set(fieldsToEncryptedObject, selectedField, contentInField);
    // }

    let contentInField: string | { [key: string]: string } | undefined;
    let markedContent: string | undefined;
    // eslint-disable-next-line default-case
    switch (selectedField) {
      case 'who.userIdentity.sub': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = stringToReplace;
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'who.userIdentity.fhirUser': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = contentInField.replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'what.apiGateway.event.queryStringParameters': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = stringToReplace;
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'what.requestContext.path': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = contentInField.replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'what.apiGateway.event.pathParameters.proxy': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = contentInField.replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'where.requestContext.sourceIp': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = stringToReplace;
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'responseOther.userIdentity.launch-response-patient': {
        contentInField = _.get(logging, selectedField, undefined);
        if (contentInField) {
          markedContent = contentInField.replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      default:
        throw new Error('Field to encrypt must be the existing cases');
    }
    if (contentInField) {
      _.set(loggingPreprocessed, selectedField, markedContent);
      _.set(fieldsToEncryptedObject, selectedField, contentInField);
    } else {
      throw new Error('No existing case field in logger');
    }
  });
  if (Object.keys(fieldsToEncryptedObject).length !== 0) {
    _.set(loggingPreprocessed, 'logMetadata.encryptedFields', fieldsToEncrypt);
    _.set(loggingPreprocessed, 'logMetadata.encryptedPayLoad', fieldsToEncryptedObject);
  }
  return loggingPreprocessed;
}

// define logger middleware
export const setLoggerMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const encryptedField = ['logMetadata.encryptedPayLoad'];
  const logger = getEncryptLogger(encryptedField);
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
        uid: uuidv4(),
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
        domainName: request.requestContext.domainName,
        'User-agent': request.headers['user-agent'],
        requestContext: (({ sourceIp }) => ({ sourceIp }))(request.requestContext.identity)
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
    let encryptedField: string[];
    let logger: any;
    if (process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION === 'true') {
      // true or false means if a field is selected to replace the whole field with 'encrypted' or add 'encrypted' partially.
      // Examples: https://ygvm00kbzl.execute-api.us-east-1.amazonaws.com/dev/Patient/encrypted"
      loggerDesign = preprocessFieldsToEncrypted(
        // {
        //     'who.userIdentity.sub': true,
        //     'who.userIdentity.fhirUser': false,
        //     'what.apiGateway.event.queryStringParameters': true,
        //     'what.requestContext.path': false,
        //     'what.apiGateway.event.pathParameters.proxy': false,
        //     'where.requestContext.sourceIp': true,
        //     'responseOther.userIdentity.launch-response-patient': false,
        // },
        [
          'who.userIdentity.sub',
          'who.userIdentity.fhirUser',
          'what.apiGateway.event.queryStringParameters',
          'what.requestContext.path',
          'what.apiGateway.event.pathParameters.proxy',
          'where.requestContext.sourceIp',
          'responseOther.userIdentity.launch-response-patient'
        ],
        loggerDesign
      );
      encryptedField = ['logMetadata.encryptedPayLoad'];
      logger = getEncryptLogger(encryptedField);
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
