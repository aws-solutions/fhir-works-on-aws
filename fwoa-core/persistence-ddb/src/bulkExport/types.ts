/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { ExportJobStatus, ExportType } from '@aws/fhir-works-on-aws-interface';
import { JobRunState } from 'aws-sdk/clients/glue';

/**
 * Outputs of intermediate steps of the state machine execution that can be used as parameters for subsequent steps
 */
export interface BulkExportStateMachineExecutionParameters {
  glueJobRunId?: string;
  glueJobRunStatus?: JobRunState;
  isCanceled?: boolean;
}

/**
 * Bulk export state machine parameters.
 * All lambda functions in the state machine are expected to use this type as both input and output
 */
export interface BulkExportStateMachineGlobalParameters {
  jobId: string;
  jobOwnerId: string;
  exportType: ExportType;
  transactionTime: string;
  groupId?: string;
  outputFormat?: string;
  since?: string;
  type?: string;
  tenantId?: string;
  serverUrl?: string;
  compartmentSearchParamFile?: string;
  executionParameters?: BulkExportStateMachineExecutionParameters;
}

export interface BulkExportJob {
  jobId: string;
  jobStatus: ExportJobStatus;
  jobOwnerId: string;
  exportType: ExportType;
  transactionTime: string;
  outputFormat: string;
  since: string;
  groupId?: string;
  jobFailedMessage?: string;
  type?: string;
  tenantId?: string;
  serverUrl?: string;
  compartmentSearchParamFile?: string;
}
