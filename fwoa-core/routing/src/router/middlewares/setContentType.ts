/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import express from 'express';

/**
 * Set default content-type to 'application/fhir+json'
 */
export const setContentTypeMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    res.contentType(req.headers.accept === 'application/json' ? 'application/json' : 'application/fhir+json');
    next();
  } catch (e) {
    next(e);
  }
};
