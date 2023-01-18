/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable tsdoc/syntax */
import { FhirVersion } from './constants';

export type ExportJobStatus = 'completed' | 'failed' | 'in-progress' | 'canceled' | 'canceling';

export type ExportType = 'system' | 'group' | 'patient';

export interface InitiateExportRequest {
  requesterUserId: string;
  exportType: ExportType;
  allowedResourceTypes: string[];
  transactionTime: string;
  outputFormat?: string;
  since?: string;
  type?: string;
  groupId?: string;
  tenantId?: string;
  serverUrl?: string;
  fhirVersion?: FhirVersion;
}

export interface GetExportStatusResponse {
  jobStatus: ExportJobStatus;
  jobOwnerId: string;
  requiresAccessToken?: boolean;
  exportedFileUrls?: { type: string; url: string }[];
  transactionTime?: string;
  exportType?: ExportType;
  outputFormat?: string; // query _outputFormat, required to allow building of request url, https://hl7.org/Fhir/uv/bulkdata/export/index.html#query-parameters
  since?: string; // query _since
  type?: string; // query _type
  groupId?: string;
  errorArray?: [{ type: string; url: string }]; // An export job that is completed can optionally have an error array https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---complete-status
  errorMessage?: string; // Error message for 4xx or 5xx error of an export job https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---error-status-1
}

export interface BulkDataAccess {
  /**
   * Start the job for exporting the database into downloadable files. The file format of the downloadable files
   * is specified by '_outputFormat'. This interface is to support the bulk export request API
   * https://hl7.org/Fhir/uv/bulkdata/export/index.html#bulk-data-kick-off-request
   * @param initiateExportRequest - request to initiate export
   * @returns jobId - id of the export job that was created
   */
  initiateExport(initiateExportRequest: InitiateExportRequest): Promise<string>;

  /**
   * Cancel an export request that is currently running and delete any files that might have been
   * generated during the export. This interface is to support the bulk export DELETE API
   * https://hl7.org/Fhir/uv/bulkdata/export/index.html#bulk-data-delete-request
   * @param jobId - Id of the job you would like to cancel the export request for
   * @param tenantId - tenant identifier in a multi-tenancy setup
   */
  cancelExport(jobId: string, tenantId?: string): Promise<void>;

  /**
   * Get the current status of the export request. This includes the jobStatus of the job.
   * If the jobStatus is completed return the exportedFileUrls of the exported files.
   * Example of exportedFileUrls object: { Patient: [ s3Url1.com, s3Url2.com], Medication: [s3Url3.com]}
   * This interface is to support the bulk export Data Status Request API
   * https://hl7.org/Fhir/uv/bulkdata/export/index.html#bulk-data-status-request
   * @param jobId - Id of the job you would like to get the export status for
   * @param tenantId - tenant identifier in a multi-tenancy setup
   * @returns GetExportStatusResponse - The status of the export job as well as additional metadata information if the job is now completed
   */
  getExportStatus(jobId: string, tenantId?: string): Promise<GetExportStatusResponse>;
}
