/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { FhirConfig } from '@aws/fhir-works-on-aws-interface';
import express from 'express';
import RouteHelper from '../routes/routeHelper';

/**
 * Sets the value of `res.locals.serverUrl`
 * the serverUrl can either be a static value from FhirConfig of a dynamic value for some multi-tenancy setups.
 */
export const setServerUrlMiddleware: (
  fhirConfig: FhirConfig
) => (req: express.Request, res: express.Response, next: express.NextFunction) => void = (
  fhirConfig: FhirConfig
) => {
  return RouteHelper.wrapAsync(
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.baseUrl && req.baseUrl !== '/') {
        res.locals.serverUrl = fhirConfig.server.url + req.baseUrl;
      } else {
        res.locals.serverUrl = fhirConfig.server.url;
      }
      next();
    }
  );
};
