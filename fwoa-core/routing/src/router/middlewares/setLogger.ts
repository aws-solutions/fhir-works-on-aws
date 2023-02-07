/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-" ".0
 *
 */

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
        proxy?: string;
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
    let contentInField: string | { [key: string]: string } | undefined | null;
    let markedContent: string | undefined | null;
    // eslint-disable-next-line default-case
    switch (selectedField) {
      case 'who.userIdentity.sub': {
        contentInField = _.get(logging, selectedField);
        markedContent = stringToReplace;
        break;
      }
      case 'who.userIdentity.fhirUser': {
        contentInField = _.get(logging, selectedField);
        if (contentInField) {
          markedContent = (contentInField as string).replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'what.apiGateway.event.queryStringParameters': {
        contentInField = _.get(logging, selectedField);
        if (contentInField) {
          markedContent = stringToReplace;
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'what.requestContext.path': {
        contentInField = _.get(logging, selectedField);
        markedContent = (contentInField as string).replace(resourceIdRegx, stringToReplace);
        break;
      }
      case 'what.apiGateway.event.pathParameters.proxy': {
        contentInField = _.get(logging, selectedField);
        if (contentInField) {
          markedContent = (contentInField as string).replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      case 'where.requestContext.identity.sourceIp': {
        contentInField = _.get(logging, selectedField);
        markedContent = stringToReplace;
        break;
      }
      case 'responseOther.userIdentity.launch-response-patient': {
        contentInField = _.get(logging, selectedField);
        if (contentInField) {
          markedContent = (contentInField as string).replace(resourceIdRegx, stringToReplace);
        } else {
          markedContent = contentInField;
        }
        break;
      }
      default:
        throw new Error('Field to encrypt must be the existing cases');
    }
    // keep selected fields inside encryptedPayLoad even the field does not have encrypted contents
    _.set(fieldsToEncryptedObject, selectedField, contentInField);
    _.set(loggingPreprocessed, selectedField, markedContent);
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
    let encryptedField: string;
    let logger: any;
    if (process.env.ENABLE_LOGGING_MIDDLEWARE_ENCRYPTION === 'true') {
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
      encryptedField = 'logMetadata.encryptedPayLoad';
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
