/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface SearchFilter {
  key: string;
  value: string[];
  comparisonOperator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  logicalOperator: 'AND' | 'OR';
}

export interface GlobalSearchRequest {
  baseUrl: string; // server's URL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryParams?: any;
  searchFilters?: SearchFilter[];
  tenantId?: string;
  /**
   * An optional session identifier. Search implementations may use this value to optimize search queries.
   */
  sessionId?: string;
}

export interface TypeSearchRequest extends GlobalSearchRequest {
  resourceType: string;
  allowedResourceTypes: string[];
}

export interface SearchEntry {
  fullUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
  search: {
    mode: 'match' | 'include' | 'outcome';
    score?: number;
  };
}

export interface SearchResult {
  numberOfResults: number;
  entries: SearchEntry[];
  message: string;
  firstResultUrl?: string;
  previousResultUrl?: string;
  nextResultUrl?: string;
  lastResultUrl?: string;
}

export interface SearchResponse {
  result: SearchResult;
}

export interface SearchCapabilities {
  searchParam: {
    name: string;
    definition?: string;
    type: string;
    documentation?: string;
  }[];
  searchInclude: string[];
  searchRevInclude: string[];
}

export interface SearchCapabilityStatement {
  [resourceType: string]: SearchCapabilities;
}

export interface Search {
  /**
   * Searches a specific Resource Type based on some filter criteria
   */
  typeSearch(request: TypeSearchRequest): Promise<SearchResponse>;
  /**
   * Searches all Resource Types based on some filter criteria
   */
  globalSearch(request: GlobalSearchRequest): Promise<SearchResponse>;
  /**
   * Retrieve a subset of the CapabilityStatement with the search-related fields for all resources
   * See https://www.hl7.org/fhir/capabilitystatement.html
   */
  getCapabilities(): Promise<SearchCapabilityStatement>;
  /**
   * Verify that a search string used as criteria in Subscription resource is valid
   */
  validateSubscriptionSearchCriteria(searchCriteria: string): void;
}
