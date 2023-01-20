/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ExportType } from './bulkDataAccess';
import { BatchReadWriteRequest } from './bundle';
import { TypeOperation, SystemOperation, KeyValueMap } from './constants';
import { SearchFilter } from './search';

export interface BulkDataAuth {
  operation:
    | 'initiate-export'
    | 'initiate-import'
    | 'get-status-export'
    | 'get-status-import'
    | 'cancel-export'
    | 'cancel-import';
  exportType?: ExportType;
  importResources?: string[];
}

export type VerbType = 'CONNECT' | 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';

/**
 * Contains information from incoming http request. As well as
 * additional context information such as use case specific auth handlers or
 * operational information specific to this request.
 */
export interface RequestContext {
  verb?: VerbType;
  url: string;
  hostname: string;
  headers: KeyValueMap;
  contextInfo: KeyValueMap;
}

export interface VerifyAccessTokenRequest {
  accessToken: string;
  operation: TypeOperation | SystemOperation;
  resourceType?: string;
  requestContext?: RequestContext;
  id?: string;
  vid?: string;
  bulkDataAuth?: BulkDataAuth;
  /**
   * The FHIR server base URL. It may contain a path in addition to the hostname. See: https://www.hl7.org/fhir/http.html#root
   * @example https://fhir-server/path
   */
  fhirServiceBaseUrl?: string;
}

export interface AuthorizationBundleRequest {
  userIdentity: KeyValueMap;
  requestContext?: RequestContext;
  requests: BatchReadWriteRequest[];
  /**
   * The FHIR server base URL. It may contain a path in addition to the hostname. See: https://www.hl7.org/fhir/http.html#root
   * @example https://fhir-server/path
   */
  fhirServiceBaseUrl?: string;
}

export interface AllowedResourceTypesForOperationRequest {
  userIdentity: KeyValueMap;
  requestContext?: RequestContext;
  operation: TypeOperation | SystemOperation;
}

export interface AccessBulkDataJobRequest {
  userIdentity: KeyValueMap;
  requestContext?: RequestContext;
  jobOwnerId: string;
}

export interface ReadResponseAuthorizedRequest {
  userIdentity: KeyValueMap;
  requestContext?: RequestContext;
  operation: TypeOperation | SystemOperation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readResponse: any;
  /**
   * The FHIR server base URL. It may contain a path in addition to the hostname. See: https://www.hl7.org/fhir/http.html#root
   * @example https://fhir-server/path
   */
  fhirServiceBaseUrl?: string;
}

export interface WriteRequestAuthorizedRequest {
  userIdentity: KeyValueMap;
  requestContext?: RequestContext;
  operation: TypeOperation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceBody: any;
  /**
   * The FHIR server base URL. It may contain a path in addition to the hostname. See: https://www.hl7.org/fhir/http.html#root
   * @example https://fhir-server/path
   */
  fhirServiceBaseUrl?: string;
}

export interface GetSearchFilterBasedOnIdentityRequest {
  userIdentity: KeyValueMap;
  requestContext?: RequestContext;
  operation: 'search-type' | 'search-system' | 'history-type' | 'history-system' | 'history-instance';
  /** Used for type and instance based searching */
  resourceType?: string;
  /** Used exclusively for `history-instance` operation */
  id?: string;
  /**
   * The FHIR server base URL. It may contain a path in addition to the hostname. See: https://www.hl7.org/fhir/http.html#root
   * @example https://fhir-server/path
   */
  fhirServiceBaseUrl?: string;
}

export interface Authorization {
  /**
   * Validates the access token and returns the userIdentity
   * @returns decoded access token; effectively the userIdentity
   * @throws UnauthorizedError
   */
  verifyAccessToken(request: VerifyAccessTokenRequest): Promise<KeyValueMap>;
  /**
   * Used to authorize Bundle transactions
   * @throws UnauthorizedError
   */
  isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<void>;
  /*
   * Used to determine if a requester can access a Bulk Data Job
   * @throws UnauthorizedError
   */
  isAccessBulkDataJobAllowed(request: AccessBulkDataJobRequest): Promise<void>;
  /**
   * @returns resourceTypes for which the requester is allowed to perform the requested operation.
   */
  getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]>;
  /**
   * Filters and validates the read response per the specific user
   * @returns a potentially filtered readResponse
   * @throws UnauthorizedError
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authorizeAndFilterReadResponse(request: ReadResponseAuthorizedRequest): Promise<any>;
  /**
   * Examines the writes request body to authorize if user is allowed to perform the action requested
   * @throws UnauthorizedError
   */
  isWriteRequestAuthorized(request: WriteRequestAuthorizedRequest): Promise<void>;

  /**
   * Returns search filters to prevent doing expensive overly permissive search
   * @returns Search filter
   */
  getSearchFilterBasedOnIdentity(request: GetSearchFilterBasedOnIdentityRequest): Promise<SearchFilter[]>;
}
