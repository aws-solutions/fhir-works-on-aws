/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
import {
  BatchReadWriteRequest,
  Bundle,
  Authorization,
  GenericResource,
  Resources,
  TypeOperation,
  KeyValueMap,
  isUnauthorizedError,
  Validator,
  RequestContext
} from '@aws/fhir-works-on-aws-interface';
import createError from 'http-errors';
import isEmpty from 'lodash/isEmpty';
import { MAX_BUNDLE_ENTRIES } from '../../constants';
import { validateResource } from '../validation/validationUtilities';
import BundleGenerator from './bundleGenerator';
import BundleHandlerInterface from './bundleHandlerInterface';
import BundleParser from './bundleParser';

export default class BundleHandler implements BundleHandlerInterface {
  private bundleService: Bundle;

  private validators: Validator[];

  readonly serverUrl: string;

  private authService: Authorization;

  private genericResource?: GenericResource;

  private resources?: Resources;

  private supportedGenericResources: string[];

  constructor(
    bundleService: Bundle,
    validators: Validator[],
    serverUrl: string,
    authService: Authorization,
    supportedGenericResources: string[],
    genericResource?: GenericResource,
    resources?: Resources
  ) {
    this.bundleService = bundleService;
    this.serverUrl = serverUrl;
    this.authService = authService;
    this.supportedGenericResources = supportedGenericResources;
    this.genericResource = genericResource;
    this.resources = resources;

    this.validators = validators;
  }

  async processBatch(
    bundleRequestJson: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const startTime = new Date();

    const requests = await this.validateBundleResource(
      bundleRequestJson,
      userIdentity,
      requestContext,
      serverUrl,
      tenantId
    );

    let bundleServiceResponse = await this.bundleService.batch({ requests, startTime, tenantId });
    bundleServiceResponse = await this.filterBundleResult(
      bundleServiceResponse,
      requests,
      userIdentity,
      requestContext,
      serverUrl
    );

    return BundleGenerator.generateBatchBundle(this.serverUrl, bundleServiceResponse.batchReadWriteResponses);
  }

  resourcesInBundleThatServerDoesNotSupport(
    bundleRequestJson: any
  ): { resource: string; operations: TypeOperation[] }[] {
    const bundleEntriesNotSupported: { resource: string; operations: TypeOperation[] }[] = [];
    const resourceTypeToOperations = BundleParser.getResourceTypeOperationsInBundle(bundleRequestJson);
    if (isEmpty(resourceTypeToOperations)) {
      return [];
    }

    // For now, entries in Bundle must be generic resource, because only one persistence obj can be passed into
    // bundleParser
    for (let i = 0; i < Object.keys(resourceTypeToOperations).length; i += 1) {
      const bundleResourceType = Object.keys(resourceTypeToOperations)[i];
      const bundleResourceOperations = resourceTypeToOperations[bundleResourceType];
      // 'Generic resource' includes bundle resourceType and Operation
      if (this.supportedGenericResources.includes(bundleResourceType)) {
        const operationsInBundleThatServerDoesNotSupport = bundleResourceOperations.filter((operation) => {
          return !this.genericResource?.operations.includes(operation);
        });
        if (operationsInBundleThatServerDoesNotSupport.length > 0) {
          bundleEntriesNotSupported.push({
            resource: bundleResourceType,
            operations: operationsInBundleThatServerDoesNotSupport
          });
        }
      } else {
        bundleEntriesNotSupported.push({
          resource: bundleResourceType,
          operations: bundleResourceOperations
        });
      }
    }
    return bundleEntriesNotSupported;
  }

  async processTransaction(
    bundleRequestJson: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    const startTime = new Date();

    const requests = await this.validateBundleResource(
      bundleRequestJson,
      userIdentity,
      requestContext,
      serverUrl,
      tenantId
    );

    if (requests.length > MAX_BUNDLE_ENTRIES) {
      throw new createError.BadRequest(
        `Maximum number of entries for a Bundle is ${MAX_BUNDLE_ENTRIES}. There are currently ${requests.length} entries in this Bundle`
      );
    }

    let bundleServiceResponse = await this.bundleService.transaction({ requests, startTime, tenantId });
    bundleServiceResponse = await this.filterBundleResult(
      bundleServiceResponse,
      requests,
      userIdentity,
      requestContext,
      serverUrl
    );

    return BundleGenerator.generateTransactionBundle(
      this.serverUrl,
      bundleServiceResponse.batchReadWriteResponses
    );
  }

  async validateBundleResource(
    bundleRequestJson: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ) {
    await validateResource(this.validators, 'Bundle', bundleRequestJson, { tenantId });

    let requests: BatchReadWriteRequest[];
    try {
      // TODO use the correct persistence layer
      const resourcesServerDoesNotSupport = this.resourcesInBundleThatServerDoesNotSupport(bundleRequestJson);
      if (resourcesServerDoesNotSupport.length > 0) {
        let message = '';
        resourcesServerDoesNotSupport.forEach(({ resource, operations }) => {
          message += `${resource}: ${operations},`;
        });
        message = message.substring(0, message.length - 1);
        throw new Error(`Server does not support these resource and operations: {${message}}`);
      }
      if (this.genericResource) {
        requests = await BundleParser.parseResource(
          bundleRequestJson,
          this.genericResource.persistence,
          this.serverUrl
        );
      } else {
        throw new Error('Cannot process bundle');
      }
    } catch (e) {
      throw new createError.BadRequest((e as any).message);
    }

    await this.authService.isBundleRequestAuthorized({
      userIdentity,
      requestContext,
      requests,
      fhirServiceBaseUrl: serverUrl
    });

    return requests;
  }

  async filterBundleResult(
    bundleServiceResponse: any,
    requests: any[],
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string
  ) {
    if (!bundleServiceResponse.success) {
      if (bundleServiceResponse.errorType === 'SYSTEM_ERROR') {
        throw new createError.InternalServerError(bundleServiceResponse.message);
      } else if (bundleServiceResponse.errorType === 'USER_ERROR') {
        throw new createError.BadRequest(bundleServiceResponse.message);
      } else if (bundleServiceResponse.errorType === 'CONFLICT_ERROR') {
        throw new createError.Conflict(bundleServiceResponse.message);
      }
    }

    const readOperations = [
      'read',
      'vread',
      'history-type',
      'history-instance',
      'history-system',
      'search-type',
      'search-system'
    ];

    const authAndFilterReadPromises = requests.map((request, index) => {
      if (readOperations.includes(request.operation)) {
        return this.authService.authorizeAndFilterReadResponse({
          operation: request.operation,
          userIdentity,
          requestContext,
          readResponse: bundleServiceResponse.batchReadWriteResponses[index].resource,
          fhirServiceBaseUrl: serverUrl
        });
      }
      return Promise.resolve();
    });

    const readResponses = await Promise.allSettled(authAndFilterReadPromises);

    requests.forEach((request, index) => {
      const entryResponse = bundleServiceResponse.batchReadWriteResponses[index];
      if (readOperations.includes(request.operation)) {
        const readResponse: { status: string; reason?: any; value?: any } = readResponses[index];
        if (readResponse.reason && isUnauthorizedError(readResponse.reason)) {
          entryResponse.resource = {};
        } else {
          entryResponse.resource = readResponse.value;
        }
      }
      // eslint-disable-next-line no-param-reassign
      bundleServiceResponse.batchReadWriteResponses[index] = entryResponse;
    });

    return bundleServiceResponse;
  }
}
