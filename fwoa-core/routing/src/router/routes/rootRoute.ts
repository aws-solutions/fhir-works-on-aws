/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  Authorization,
  Bundle,
  SystemOperation,
  Search,
  History,
  GenericResource,
  Resources,
  Validator
} from '@aws/fhir-works-on-aws-interface';
import express, { Router } from 'express';
import createError from 'http-errors';
import BundleHandler from '../bundle/bundleHandler';
import RootHandler from '../handlers/rootHandler';
import RouteHelper from './routeHelper';

export default class RootRoute {
  readonly router: Router;

  private bundleHandler: BundleHandler;

  private rootHandler: RootHandler;

  private authService: Authorization;

  private operations: SystemOperation[];

  constructor(
    operations: SystemOperation[],
    validators: Validator[],
    serverUrl: string,
    bundle: Bundle,
    search: Search,
    history: History,
    authService: Authorization,
    supportedGenericResources: string[],
    genericResource?: GenericResource,
    resources?: Resources
  ) {
    this.router = express.Router();
    this.operations = operations;
    this.bundleHandler = new BundleHandler(
      bundle,
      validators,
      serverUrl,
      authService,
      supportedGenericResources,
      genericResource,
      resources
    );
    this.authService = authService;
    this.rootHandler = new RootHandler(search, history, authService, serverUrl);
    this.init();
  }

  init() {
    if (this.operations.includes('transaction') || this.operations.includes('batch')) {
      this.router.post(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          if (req.body.resourceType === 'Bundle') {
            if (req.body.type.toLowerCase() === 'transaction') {
              const response = await this.bundleHandler.processTransaction(
                req.body,
                res.locals.userIdentity,
                res.locals.requestContext,
                res.locals.serverUrl,
                res.locals.tenantId
              );
              res.send(response);
            } else if (req.body.type.toLowerCase() === 'batch') {
              const response = await this.bundleHandler.processBatch(
                req.body,
                res.locals.userIdentity,
                res.locals.requestContext,
                res.locals.serverUrl,
                res.locals.tenantId
              );
              res.send(response);
            } else {
              throw new createError.BadRequest('This root path can only process a Bundle');
            }
          } else {
            throw new createError.BadRequest('This root path can only process a Bundle');
          }
        })
      );
    }
    if (this.operations.includes('search-system')) {
      this.router.get(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          const searchParamQuery = req.query;
          const response = await this.rootHandler.globalSearch(
            searchParamQuery,
            res.locals.userIdentity,
            res.locals.requestContext,
            res.locals.serverUrl,
            res.locals.tenantId
          );
          const updatedReadResponse = await this.authService.authorizeAndFilterReadResponse({
            operation: 'search-system',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            readResponse: response,
            fhirServiceBaseUrl: res.locals.serverUrl
          });
          res.send(updatedReadResponse);
        })
      );
    }
    if (this.operations.includes('history-system')) {
      this.router.get(
        '/_history',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          const searchParamQuery = req.query;
          const response = await this.rootHandler.globalHistory(
            searchParamQuery,
            res.locals.userIdentity,
            res.locals.requestContext,
            res.locals.serverUrl,
            res.locals.tenantId
          );
          const updatedReadResponse = await this.authService.authorizeAndFilterReadResponse({
            operation: 'history-system',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            readResponse: response,
            fhirServiceBaseUrl: res.locals.serverUrl
          });
          res.send(updatedReadResponse);
        })
      );
    }
  }
}
