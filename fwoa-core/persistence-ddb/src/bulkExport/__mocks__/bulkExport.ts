/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { BulkExportJob } from '../types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getBulkExportResults = async (jobId: string): Promise<{ type: string; url: string }[]> => {
  return [];
};

// eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
export const startJobExecution = async (bulkExportJob: BulkExportJob): Promise<void> => {};
