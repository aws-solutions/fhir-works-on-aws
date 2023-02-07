/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-underscore-dangle */
import {
  Authorization,
  BulkDataAccess,
  ExportType,
  FhirVersion,
  InitiateExportRequest
} from '@aws/fhir-works-on-aws-interface';
import express, { Router } from 'express';
import createHttpError from 'http-errors';
import ExportHandler from '../handlers/exportHandler';
import ExportRouteHelper from './exportRouteHelper';
import RouteHelper from './routeHelper';

export default class ExportRoute {
  readonly router: Router;

  private exportHandler: any;

  private fhirVersion: FhirVersion;

  private authService: Authorization;

  constructor(bulkDataAccess: BulkDataAccess, authService: Authorization, fhirVersion: FhirVersion) {
    this.router = express.Router();
    this.fhirVersion = fhirVersion;
    this.authService = authService;
    this.exportHandler = new ExportHandler(bulkDataAccess, authService);
    this.init();
  }

  async initiateExportRequests(req: express.Request, res: express.Response, exportType: ExportType) {
    const allowedResourceTypes = await this.authService.getAllowedResourceTypesForOperation({
      operation: 'read',
      userIdentity: res.locals.userIdentity,
      requestContext: res.locals.userIdentity
    });
    const initiateExportRequest: InitiateExportRequest = ExportRouteHelper.buildInitiateExportRequest(
      req,
      res,
      exportType,
      allowedResourceTypes,
      this.fhirVersion
    );

    const jobId = await this.exportHandler.initiateExport(initiateExportRequest);

    const exportStatusUrl = `${res.locals.serverUrl}/$export/${jobId}`;
    res.header('Content-Location', exportStatusUrl).status(202).send();
  }

  init() {
    // Start export job
    this.router.get(
      '/\\$export',
      RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
        const exportType: ExportType = 'system';
        await this.initiateExportRequests(req, res, exportType);
      })
    );

    this.router.get(
      '/Group/:id/\\$export',
      RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
        const exportType: ExportType = 'group';
        await this.initiateExportRequests(req, res, exportType);
      })
    );

    this.router.get('/Patient/\\$export', () => {
      throw new createHttpError.BadRequest('We currently do not support Patient export');
    });

    // Export Job Status
    this.router.get(
      '/\\$export/:jobId',
      RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
        const { userIdentity, requestContext, tenantId } = res.locals;
        const { jobId } = req.params;
        const response = await this.exportHandler.getExportJobStatus(
          jobId,
          userIdentity,
          requestContext,
          tenantId
        );
        if (response.jobStatus === 'in-progress') {
          res.status(202).header('x-progress', 'in-progress').send();
        } else if (response.jobStatus === 'failed') {
          throw new createHttpError.InternalServerError(response.errorMessage);
        } else if (response.jobStatus === 'completed') {
          const { outputFormat, since, type, groupId } = response;
          const queryParams = { outputFormat, since, type };
          const jsonResponse = {
            transactionTime: response.transactionTime,
            request: ExportRouteHelper.getExportUrl(
              res.locals.serverUrl,
              response.exportType,
              queryParams,
              groupId
            ),
            requiresAccessToken: response.requiresAccessToken,
            output: response.exportedFileUrls,
            error: response.errorArray
          };
          res.status(200).send(jsonResponse);
        } else if (response.jobStatus === 'canceled') {
          res.send('Export job has been canceled');
        } else if (response.jobStatus === 'canceling') {
          res.send('Export job is being canceled');
        }
      })
    );

    // Cancel export job
    this.router.delete(
      '/\\$export/:jobId',
      RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
        const { jobId } = req.params;
        const { userIdentity, requestContext, tenantId } = res.locals;
        await this.exportHandler.cancelExport(jobId, userIdentity, requestContext, tenantId);
        res.status(202).send();
      })
    );
  }
}
