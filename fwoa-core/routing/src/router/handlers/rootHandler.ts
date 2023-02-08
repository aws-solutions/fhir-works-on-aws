/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  Search,
  History,
  KeyValueMap,
  Authorization,
  RequestContext
} from '@aws/fhir-works-on-aws-interface';
import BundleGenerator from '../bundle/bundleGenerator';
import { hash } from './utils';

export default class RootHandler {
  private searchService: Search;

  private historyService: History;

  private authService: Authorization;

  private serverUrl: string;

  constructor(searchService: Search, historyService: History, authService: Authorization, serverUrl: string) {
    this.searchService = searchService;
    this.historyService = historyService;
    this.authService = authService;
    this.serverUrl = serverUrl;
  }

  async globalSearch(
    queryParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
      userIdentity,
      requestContext,
      operation: 'search-system',
      fhirServiceBaseUrl: serverUrl
    });
    const searchResponse = await this.searchService.globalSearch({
      queryParams,
      baseUrl: this.serverUrl,
      searchFilters,
      tenantId,
      sessionId: hash(userIdentity)
    });
    return BundleGenerator.generateBundle(this.serverUrl, queryParams, searchResponse.result, 'searchset');
  }

  async globalHistory(
    queryParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
      userIdentity,
      requestContext,
      operation: 'history-system',
      fhirServiceBaseUrl: serverUrl
    });
    const historyResponse = await this.historyService.globalHistory({
      queryParams,
      baseUrl: this.serverUrl,
      searchFilters,
      tenantId
    });
    return BundleGenerator.generateBundle(this.serverUrl, queryParams, historyResponse.result, 'history');
  }
}
