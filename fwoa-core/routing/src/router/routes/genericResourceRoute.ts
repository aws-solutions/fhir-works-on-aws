/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Authorization, TypeOperation } from '@aws/fhir-works-on-aws-interface';
import express, { Router } from 'express';
import createError from 'http-errors';
import { isEmpty, mergeWith } from 'lodash';
import CrudHandlerInterface from '../handlers/crudHandlerInterface';
import RouteHelper from './routeHelper';

export default class GenericResourceRoute {
  readonly operations: TypeOperation[];

  readonly router: Router;

  private handler: CrudHandlerInterface;

  private readonly authService: Authorization;

  constructor(operations: TypeOperation[], handler: CrudHandlerInterface, authService: Authorization) {
    this.operations = operations;
    this.handler = handler;
    this.router = express.Router({ mergeParams: true });
    this.authService = authService;
    this.init();
  }

  private init() {
    // TODO handle HTTP response code
    if (this.operations.includes('read')) {
      // READ
      this.router.get(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { id, resourceType } = req.params;
          const response = await this.handler.read(resourceType, id, res.locals.tenantId);
          const updatedReadResponse = await this.authService.authorizeAndFilterReadResponse({
            operation: 'read',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            readResponse: response,
            fhirServiceBaseUrl: res.locals.serverUrl
          });
          if (updatedReadResponse && updatedReadResponse.meta) {
            res.set({
              ETag: `W/"${updatedReadResponse.meta.versionId}"`,
              'Last-Modified': updatedReadResponse.meta.lastUpdated
            });
          }
          res.send(updatedReadResponse);
        })
      );
    }

    // VREAD
    if (this.operations.includes('vread')) {
      this.router.get(
        '/:id/_history/:vid',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { id, vid, resourceType } = req.params;
          const response = await this.handler.vRead(resourceType, id, vid, res.locals.tenantId);
          const updatedReadResponse = await this.authService.authorizeAndFilterReadResponse({
            operation: 'vread',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            readResponse: response,
            fhirServiceBaseUrl: res.locals.serverUrl
          });
          if (updatedReadResponse && updatedReadResponse.meta) {
            res.set({
              ETag: `W/"${updatedReadResponse.meta.versionId}"`,
              'Last-Modified': updatedReadResponse.meta.lastUpdated
            });
          }
          res.send(updatedReadResponse);
        })
      );
    }

    // Type History
    if (this.operations.includes('history-type')) {
      this.router.get(
        '/_history',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { resourceType } = req.params;
          const searchParamQuery = req.query;
          const response = await this.handler.typeHistory(
            resourceType,
            searchParamQuery,
            res.locals.userIdentity,
            res.locals.requestContext,
            res.locals.tenantId
          );
          const updatedReadResponse = await this.authService.authorizeAndFilterReadResponse({
            operation: 'history-type',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            readResponse: response,
            fhirServiceBaseUrl: res.locals.serverUrl
          });
          res.send(updatedReadResponse);
        })
      );
    }

    // Instance History
    if (this.operations.includes('history-instance')) {
      this.router.get(
        '/:id/_history',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const searchParamQuery = req.query;
          const { id, resourceType } = req.params;
          const response = await this.handler.instanceHistory(
            resourceType,
            id,
            searchParamQuery,
            res.locals.userIdentity,
            res.locals.requestContext,
            res.locals.tenantId
          );
          const updatedReadResponse = await this.authService.authorizeAndFilterReadResponse({
            operation: 'history-instance',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            readResponse: response,
            fhirServiceBaseUrl: res.locals.serverUrl
          });
          res.send(updatedReadResponse);
        })
      );
    }

    if (this.operations.includes('search-type')) {
      const handleSearch = async (res: express.Response, resourceType: string, searchParamQuery: any) => {
        return this.handler.typeSearch(
          resourceType,
          searchParamQuery,
          res.locals.userIdentity,
          res.locals.requestContext,
          res.locals.serverUrl,
          res.locals.tenantId
        );
      };
      // SEARCH
      this.router.get(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { resourceType } = req.params;
          const searchParamQuery = req.query;
          const updatedSearchResponse = await handleSearch(res, resourceType, searchParamQuery);
          res.send(updatedSearchResponse);
        })
      );
      this.router.post(
        '/_search',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { resourceType } = req.params;
          const searchParamQuery = req.query;
          const { body } = req;

          if (!isEmpty(body)) {
            mergeWith(searchParamQuery, body, (valueOne, valueTwo) => {
              if (
                !isEmpty(valueOne) &&
                !isEmpty(valueTwo) &&
                (Array.isArray(valueOne) || Array.isArray(valueTwo) || valueOne !== valueTwo)
              ) {
                return [...new Set([].concat(valueOne, valueTwo))];
              }
              return undefined; // Merging is handled by lodash mergeWith if undefined is returned
            });
          }

          const updatedSearchResponse = await handleSearch(res, resourceType, searchParamQuery);
          res.send(updatedSearchResponse);
        })
      );
    }

    // CREATE
    if (this.operations.includes('create')) {
      this.router.post(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { resourceType } = req.params;
          const { body } = req;

          await this.authService.isWriteRequestAuthorized({
            resourceBody: body,
            operation: 'create',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            fhirServiceBaseUrl: res.locals.serverUrl
          });

          const response = await this.handler.create(resourceType, body, res.locals.tenantId);
          if (response && response.meta) {
            res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
          }
          res.status(201).send(response);
        })
      );
    }

    // UPDATE
    if (this.operations.includes('update')) {
      this.router.put(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          const { id, resourceType } = req.params;
          const { body } = req;

          if (body.id === null || body.id !== id) {
            throw new createError.BadRequest(
              `Can not update resource with ID[${id}], while the given request payload has an ID[${body.id}]`
            );
          }
          await this.authService.isWriteRequestAuthorized({
            resourceBody: body,
            operation: 'update',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            fhirServiceBaseUrl: res.locals.serverUrl
          });

          const response = await this.handler.update(resourceType, id, body, res.locals.tenantId);
          if (response && response.meta) {
            res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
          }
          res.send(response);
        })
      );
    }

    // PATCH
    if (this.operations.includes('patch')) {
      this.router.patch(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          const { id, resourceType } = req.params;
          const { body } = req;

          if (body.id && body.id !== id) {
            throw new createError.BadRequest(
              `Can not update resource with ID[${id}], while the given request payload has an ID[${body.id}]`
            );
          }
          await this.authService.isWriteRequestAuthorized({
            resourceBody: body,
            operation: 'patch',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            fhirServiceBaseUrl: res.locals.serverUrl
          });

          const response = await this.handler.patch(resourceType, id, body, res.locals.tenantId);
          if (response && response.meta) {
            res.set({ ETag: `W/"${response.meta.versionId}"`, 'Last-Modified': response.meta.lastUpdated });
          }
          res.send(response);
        })
      );
    }

    // DELETE
    if (this.operations.includes('delete')) {
      this.router.delete(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
          // Get the ResourceType looks like '/Patient'
          const { id, resourceType } = req.params;
          const readResponse = await this.handler.read(resourceType, id, res.locals.tenantId);

          await this.authService.isWriteRequestAuthorized({
            resourceBody: readResponse,
            operation: 'delete',
            userIdentity: res.locals.userIdentity,
            requestContext: res.locals.requestContext,
            fhirServiceBaseUrl: res.locals.serverUrl
          });

          const response = await this.handler.delete(resourceType, id, res.locals.tenantId);
          res.send(response);
        })
      );
    }
  }
}
