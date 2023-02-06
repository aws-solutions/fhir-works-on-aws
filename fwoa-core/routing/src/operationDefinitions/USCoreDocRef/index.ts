/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { KeyValueMap, RequestContext, TypeOperation } from '@aws/fhir-works-on-aws-interface';
import express from 'express';
import ResourceHandler from '../../router/handlers/resourceHandler';
import RouteHelper from '../../router/routes/routeHelper';
import { OperationDefinitionImplementation } from '../types';
import { convertDocRefParamsToSearchParams } from './convertDocRefParamsToSearchParams';
import { DocRefParams, parsePostParams, parseQueryParams } from './parseParams';

const searchTypeOperation: TypeOperation = 'search-type';

const docRefImpl = async (
  resourceHandler: ResourceHandler,
  userIdentity: KeyValueMap,
  params: DocRefParams,
  requestContext: RequestContext,
  serverUrl: string,
  tenantId?: string
) => {
  const searchParams = convertDocRefParamsToSearchParams(params);
  return resourceHandler.typeSearch(
    'DocumentReference',
    searchParams,
    userIdentity,
    requestContext,
    serverUrl,
    tenantId
  );
};

export const USCoreDocRef: OperationDefinitionImplementation = {
  canonicalUrl: 'http://hl7.org/fhir/us/core/OperationDefinition/docref',
  name: 'docref',
  documentation:
    "This operation is used to return all the references to documents related to a patient. \n\n The operation takes the optional input parameters: \n  - patient id\n  - start date\n  - end date\n  - document type \n\n and returns a [Bundle](http://hl7.org/fhir/bundle.html) of type \"searchset\" containing [US Core DocumentReference Profiles](http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference) for the patient. If the server has or can create documents that are related to the patient, and that are available for the given user, the server returns the DocumentReference profiles needed to support the records.  The principle intended use for this operation is to provide a provider or patient with access to their available document information. \n\n This operation is *different* from a search by patient and type and date range because: \n\n 1. It is used to request a server *generate* a document based on the specified parameters. \n\n 1. If no parameters are specified, the server SHALL return a DocumentReference to the patient's most current CCD \n\n 1. If the server cannot *generate* a document based on the specified parameters, the operation will return an empty search bundle. \n\n This operation is the *same* as a FHIR RESTful search by patient,type and date range because: \n\n 1. References for *existing* documents that meet the requirements of the request SHOULD also be returned unless the client indicates they are only interested in 'on-demand' documents using the *on-demand* parameter." +
    '\n\n This server does not generate documents on-demand',
  path: '/DocumentReference/$docref',
  httpVerbs: ['GET', 'POST'],
  targetResourceType: 'DocumentReference',
  requestInformation: {
    operation: searchTypeOperation,
    resourceType: 'DocumentReference'
  },
  buildRouter: (resourceHandler: ResourceHandler) => {
    const path = '/DocumentReference/\\$docref';
    const router = express.Router();
    router.get(
      path,
      RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
        const response = await docRefImpl(
          resourceHandler,
          res.locals.userIdentity,
          parseQueryParams(req.query),
          res.locals.requestContext,
          res.locals.serverUrl,
          res.locals.tenantId
        );
        res.send(response);
      })
    );

    router.post(
      path,
      RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
        const response = await docRefImpl(
          resourceHandler,
          res.locals.userIdentity,
          parsePostParams(req.body),
          res.locals.requestContext,
          res.locals.serverUrl,
          res.locals.tenantId
        );
        res.send(response);
      })
    );

    return router;
  }
};
