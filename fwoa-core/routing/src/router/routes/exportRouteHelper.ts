/* eslint-disable no-underscore-dangle */
import { ExportType, FhirVersion, InitiateExportRequest } from '@aws/fhir-works-on-aws-interface';
import express from 'express';
import createHttpError from 'http-errors';
import isString from 'lodash/isString';
import { dateTimeWithTimeZoneRegExp } from '../../regExpressions';

export default class ExportRouteHelper {
  static buildInitiateExportRequest(
    req: express.Request,
    res: express.Response,
    exportType: ExportType,
    allowedResourceTypes: string[],
    fhirVersion?: FhirVersion
  ) {
    if (req.query._outputFormat && req.query._outputFormat !== 'ndjson') {
      throw new createHttpError.BadRequest('We only support exporting resources into ndjson formatted file');
    }
    if (req.headers.prefer && req.headers.prefer !== 'respond-async') {
      throw new createHttpError.BadRequest('We only support asyncronous export job request');
    }

    let since;
    if (req.query._since) {
      if (isString(req.query._since) && dateTimeWithTimeZoneRegExp.test(req.query._since)) {
        since = new Date(req.query._since).toISOString();
      } else {
        throw new createHttpError.BadRequest(
          "Query '_since' should be in the FHIR Instant format: YYYY-MM-DDThh:mm:ss.sss+zz:zz (e.g. 2015-02-07T13:28:17.239+02:00 or 2017-01-01T00:00:00Z)"
        );
      }
    }

    const { userIdentity } = res.locals;

    const initiateExportRequest: InitiateExportRequest = {
      requesterUserId: userIdentity.sub,
      exportType,
      transactionTime: new Date().toISOString(),
      outputFormat: isString(req.query._outputFormat) ? req.query._outputFormat : undefined,
      since,
      type: isString(req.query._type) ? req.query._type : undefined,
      groupId: isString(req.params.id) ? req.params.id : undefined,
      tenantId: res.locals.tenantId,
      serverUrl: res.locals.serverUrl,
      fhirVersion,
      allowedResourceTypes
    };
    return initiateExportRequest;
  }

  static getExportUrl(
    baseUrl: string,
    exportType: ExportType,
    queryParams: { outputFormat?: string; since?: string; type?: string },
    groupId?: string
  ) {
    const { outputFormat, since, type } = queryParams;
    const url = new URL(baseUrl);
    url.pathname += url.pathname.endsWith('/') ? '' : '/';
    if (exportType === 'system') {
      url.pathname += '$export';
    }
    if (exportType === 'patient') {
      url.pathname += 'Patient/$export';
    }
    if (exportType === 'group') {
      url.pathname += `Group/${groupId}/$export`;
    }
    if (outputFormat) {
      url.searchParams.append('_outputFormat', outputFormat);
    }
    if (since) {
      url.searchParams.append('_since', since);
    }
    if (type) {
      url.searchParams.append('_type', type);
    }
    return url.toString();
  }
}
