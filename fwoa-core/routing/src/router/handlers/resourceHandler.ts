/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  Search,
  History,
  Persistence,
  Authorization,
  KeyValueMap,
  Validator,
  RequestContext
} from '@aws/fhir-works-on-aws-interface';
import BundleGenerator from '../bundle/bundleGenerator';
import OperationsGenerator from '../operationsGenerator';
import { validateResource } from '../validation/validationUtilities';
import CrudHandlerInterface from './crudHandlerInterface';
import { hash } from './utils';

export default class ResourceHandler implements CrudHandlerInterface {
  private validators: Validator[];

  private dataService: Persistence;

  private searchService: Search;

  private historyService: History;

  private authService: Authorization;

  constructor(
    dataService: Persistence,
    searchService: Search,
    historyService: History,
    authService: Authorization,
    serverUrl: string,
    validators: Validator[]
  ) {
    this.validators = validators;
    this.dataService = dataService;
    this.searchService = searchService;
    this.historyService = historyService;
    this.authService = authService;
  }

  async create(resourceType: string, resource: any, tenantId?: string) {
    await validateResource(this.validators, resourceType, resource, { tenantId, typeOperation: 'create' });

    const createResponse = await this.dataService.createResource({
      resourceType,
      resource,
      tenantId
    });
    return createResponse.resource;
  }

  async update(resourceType: string, id: string, resource: any, tenantId?: string) {
    await validateResource(this.validators, resourceType, resource, { tenantId, typeOperation: 'update' });

    const updateResponse = await this.dataService.updateResource({
      resourceType,
      id,
      resource,
      tenantId
    });
    return updateResponse.resource;
  }

  async patch(resourceType: string, id: string, resource: any, tenantId?: string) {
    // TODO Add request validation around patching
    const patchResponse = await this.dataService.patchResource({ resourceType, id, resource, tenantId });

    return patchResponse.resource;
  }

  async typeSearch(
    resourceType: string,
    queryParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const allowedResourceTypes = await this.authService.getAllowedResourceTypesForOperation({
      operation: 'search-type',
      userIdentity,
      requestContext
    });

    const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
      userIdentity,
      requestContext,
      operation: 'search-type',
      resourceType,
      fhirServiceBaseUrl: serverUrl
    });

    const searchResponse = await this.searchService.typeSearch({
      resourceType,
      queryParams,
      baseUrl: serverUrl,
      allowedResourceTypes,
      searchFilters,
      tenantId,
      sessionId: hash(userIdentity)
    });
    const bundle = BundleGenerator.generateBundle(
      serverUrl,
      queryParams,
      searchResponse.result,
      'searchset',
      resourceType
    );

    return this.authService.authorizeAndFilterReadResponse({
      operation: 'search-type',
      userIdentity,
      requestContext,
      readResponse: bundle,
      fhirServiceBaseUrl: serverUrl
    });
  }

  async typeHistory(
    resourceType: string,
    queryParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
      userIdentity,
      requestContext,
      operation: 'history-type',
      resourceType,
      fhirServiceBaseUrl: serverUrl
    });

    const historyResponse = await this.historyService.typeHistory({
      resourceType,
      queryParams,
      baseUrl: serverUrl,
      searchFilters,
      tenantId
    });
    return BundleGenerator.generateBundle(
      serverUrl,
      queryParams,
      historyResponse.result,
      'history',
      resourceType
    );
  }

  async instanceHistory(
    resourceType: string,
    id: string,
    queryParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
      userIdentity,
      requestContext,
      operation: 'history-instance',
      resourceType,
      id,
      fhirServiceBaseUrl: serverUrl
    });

    const historyResponse = await this.historyService.instanceHistory({
      id,
      resourceType,
      queryParams,
      baseUrl: serverUrl,
      searchFilters,
      tenantId
    });
    return BundleGenerator.generateBundle(
      serverUrl,
      queryParams,
      historyResponse.result,
      'history',
      resourceType,
      id
    );
  }

  async read(resourceType: string, id: string, tenantId?: string) {
    const getResponse = await this.dataService.readResource({ resourceType, id, tenantId });
    return getResponse.resource;
  }

  async vRead(resourceType: string, id: string, vid: string, tenantId?: string) {
    const getResponse = await this.dataService.vReadResource({ resourceType, id, vid, tenantId });
    return getResponse.resource;
  }

  async delete(resourceType: string, id: string, tenantId?: string) {
    await this.dataService.deleteResource({ resourceType, id, tenantId });
    return OperationsGenerator.generateSuccessfulDeleteOperation();
  }
}
