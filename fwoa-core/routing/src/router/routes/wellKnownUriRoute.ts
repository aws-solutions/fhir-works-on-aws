/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SmartStrategy } from '@aws/fhir-works-on-aws-interface';
import express, { Router } from 'express';
import { getWellKnownUriResponse } from '../handlers/wellKnownUriHandler';

export default class WellKnownUriRouteRoute {
  readonly router: Router;

  readonly smartStrategy: SmartStrategy;

  constructor(smartStrategy: SmartStrategy) {
    this.router = express.Router();
    this.smartStrategy = smartStrategy;
    this.init();
  }

  private init() {
    this.router.get('/', async (req: express.Request, res: express.Response) => {
      const response = getWellKnownUriResponse(this.smartStrategy);
      res.contentType('application/json');
      res.send(response);
    });
  }
}
