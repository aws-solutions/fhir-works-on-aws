/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ExportJobStatus } from '@aws/fhir-works-on-aws-interface';
import { Handler } from 'aws-lambda';
import AWS from '../AWS';
import DynamoDbParamBuilder from '../dataServices/dynamoDbParamBuilder';
import { BulkExportStateMachineGlobalParameters } from './types';

const EXPORT_JOB_STATUS = ['completed', 'failed', 'in-progress', 'canceled', 'canceling'];
const isJobStatus = (x: string): x is ExportJobStatus => EXPORT_JOB_STATUS.includes(x);

export const updateStatusStatusHandler: Handler<
  { globalParams: BulkExportStateMachineGlobalParameters; status: string },
  void
> = async (event) => {
  const { globalParams, status } = event;
  if (!isJobStatus(status)) {
    throw new Error(`Invalid status "${event.status}"`);
  }
  await new AWS.DynamoDB()
    .updateItem(
      DynamoDbParamBuilder.buildUpdateExportRequestJobStatus(
        globalParams.jobId,
        status,
        globalParams.tenantId
      )
    )
    .promise();
};
