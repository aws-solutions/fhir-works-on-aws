/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { TypeOperation, SystemOperation } from './constants';

export interface Reference {
  resourceType: string;
  id: string;
  vid: string;
  rootUrl: string;
  referenceFullUrl: string;
  // This param tells where to find the reference in the Bundle entry
  referencePath: string;
}

export interface BatchReadWriteRequest {
  operation: TypeOperation | SystemOperation;
  resourceType: string;
  id: string;
  vid?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
  // GET requests, only contains the URL of the resource
  fullUrl?: string;
  references?: Reference[];
}

export interface BatchRequest {
  requests: BatchReadWriteRequest[];
  startTime: Date;
  tenantId?: string;
}
export interface TransactionRequest {
  requests: BatchReadWriteRequest[];
  startTime: Date;
  tenantId?: string;
}

// TODO all required?
export interface BatchReadWriteResponse {
  id: string;
  vid: string;
  resourceType: string;
  operation: TypeOperation | SystemOperation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
  lastModified: string;
  error?: string;
}

export type BatchReadWriteErrorType = 'USER_ERROR' | 'SYSTEM_ERROR' | 'CONFLICT_ERROR';
export interface BundleResponse {
  readonly success: boolean;
  readonly errorType?: BatchReadWriteErrorType;
  readonly message: string;
  readonly batchReadWriteResponses: BatchReadWriteResponse[];
}
export interface Bundle {
  /**
   * A set of actions to be independently performed as a "batch". For example if one operation in the batch
   * fails this will NOT fail the entire batch
   */
  batch(request: BatchRequest): Promise<BundleResponse>;
  /**
   * A set of actions to be atomically performed as a "transaction". For example if one operation in the transaction
   * fails this will fail the entire transaction, and roll back any pending changes.
   */
  transaction(request: TransactionRequest): Promise<BundleResponse>;
}
