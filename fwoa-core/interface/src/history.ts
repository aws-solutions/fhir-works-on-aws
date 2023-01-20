/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SearchEntry, SearchFilter } from './search';

export interface GlobalHistoryRequest {
  baseUrl: string; // server's URL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryParams?: any;
  searchFilters?: SearchFilter[];
  tenantId?: string;
}

export interface TypeHistoryRequest extends GlobalHistoryRequest {
  resourceType: string;
}

export interface InstanceHistoryRequest extends TypeHistoryRequest {
  id: string;
}

export interface HistoryResult {
  numberOfResults: number;
  entries: SearchEntry[];
  message: string;
  firstResultUrl?: string;
  previousResultUrl?: string;
  nextResultUrl?: string;
  lastResultUrl?: string;
}

export interface HistoryResponse {
  result: HistoryResult;
}

export interface History {
  /**
   * History interaction retrieves the history of a particular resource
   * Should be thought of as a 'search' of older versioned resources
   */
  instanceHistory(request: InstanceHistoryRequest): Promise<HistoryResponse>;
  /**
   * History interaction retrieves the history of all resources of a given type
   * Should be thought of as a 'search' of older versioned resources
   */
  typeHistory(request: TypeHistoryRequest): Promise<HistoryResponse>;
  /**
   * History interaction retrieves the history of all resources supported by the system.
   * Should be thought of as a 'search' of older versioned resources
   */
  globalHistory(request: GlobalHistoryRequest): Promise<HistoryResponse>;
}
