/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Handler } from 'aws-lambda';
import AWS from '../AWS';
import { BulkExportStateMachineGlobalParameters } from './types';

export const startExportJobHandler: Handler<
  BulkExportStateMachineGlobalParameters,
  BulkExportStateMachineGlobalParameters
> = async (event) => {
  const { GLUE_JOB_NAME } = process.env;
  if (GLUE_JOB_NAME === undefined) {
    throw new Error('GLUE_JOB_NAME environment variable is not defined');
  }

  const glue = new AWS.Glue();
  const startJobRunResponse = await glue
    .startJobRun({
      JobName: GLUE_JOB_NAME,
      Arguments: {
        '--jobId': event.jobId,
        '--jobOwnerId': event.jobOwnerId,
        '--exportType': event.exportType,
        '--transactionTime': event.transactionTime,
        '--groupId': event.groupId!,
        '--since': event.since!,
        '--type': event.type!,
        '--outputFormat': event.outputFormat!,
        '--tenantId': event.tenantId!,
        '--serverUrl': event.serverUrl!,
        '--compartmentSearchParamFile': event.compartmentSearchParamFile!
      }
    })
    .promise();
  return {
    ...event,
    executionParameters: {
      ...event.executionParameters,
      glueJobRunId: startJobRunResponse.JobRunId
    }
  };
};
