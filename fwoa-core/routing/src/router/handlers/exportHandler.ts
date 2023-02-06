/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  AccessBulkDataJobRequest,
  Authorization,
  BulkDataAccess,
  GetExportStatusResponse,
  InitiateExportRequest,
  KeyValueMap,
  RequestContext
} from '@aws/fhir-works-on-aws-interface';
import createError from 'http-errors';

export default class ExportHandler {
  private bulkDataAccess: BulkDataAccess;

  private authService: Authorization;

  constructor(bulkDataAccess: BulkDataAccess, authService: Authorization) {
    this.bulkDataAccess = bulkDataAccess;
    this.authService = authService;
  }

  async initiateExport(initiateExportRequest: InitiateExportRequest): Promise<string> {
    return this.bulkDataAccess.initiateExport(initiateExportRequest);
  }

  async getExportJobStatus(
    jobId: string,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    tenantId?: string
  ): Promise<GetExportStatusResponse> {
    const jobDetails = await this.bulkDataAccess.getExportStatus(jobId, tenantId);
    await this.checkIfRequesterHasAccessToJob(jobDetails, userIdentity, requestContext);
    return jobDetails;
  }

  async cancelExport(
    jobId: string,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    tenantId?: string
  ): Promise<void> {
    const jobDetails = await this.bulkDataAccess.getExportStatus(jobId, tenantId);
    await this.checkIfRequesterHasAccessToJob(jobDetails, userIdentity, requestContext);
    if (['completed', 'failed'].includes(jobDetails.jobStatus)) {
      throw new createError.BadRequest(
        `Job cannot be canceled because job is already in ${jobDetails.jobStatus} state`
      );
    }

    await this.bulkDataAccess.cancelExport(jobId, tenantId);
  }

  private async checkIfRequesterHasAccessToJob(
    jobDetails: GetExportStatusResponse,
    userIdentity: KeyValueMap,
    requestContext: RequestContext
  ) {
    const { jobOwnerId } = jobDetails;
    const accessBulkDataJobRequest: AccessBulkDataJobRequest = { userIdentity, requestContext, jobOwnerId };
    await this.authService.isAccessBulkDataJobAllowed(accessBulkDataJobRequest);
  }
}
