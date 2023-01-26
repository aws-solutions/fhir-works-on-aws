/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */

import {
  GenericResponse,
  Persistence,
  ReadResourceRequest,
  vReadResourceRequest,
  CreateResourceRequest,
  DeleteResourceRequest,
  UpdateResourceRequest,
  PatchResourceRequest,
  ConditionalDeleteResourceRequest,
  FhirVersion,
  ResourceNotFoundError,
  InitiateExportRequest,
  GetExportStatusResponse
} from '@aws/fhir-works-on-aws-interface';
import mime from 'mime-types';

import { SEPARATOR } from '../constants';
import ObjectNotFoundError from './ObjectNotFoundError';
import S3ObjectStorageService from './s3ObjectStorageService';

export class S3DataService implements Persistence {
  updateCreateSupported: boolean = false;

  readonly enableMultiTenancy: boolean;

  private readonly dbPersistenceService: Persistence;

  private readonly fhirVersion: FhirVersion;

  constructor(
    dbPersistenceService: Persistence,
    fhirVersion: FhirVersion,
    { enableMultiTenancy = false }: { enableMultiTenancy?: boolean } = {}
  ) {
    this.dbPersistenceService = dbPersistenceService;
    this.fhirVersion = fhirVersion;
    this.enableMultiTenancy = enableMultiTenancy;
  }

  private assertValidTenancyMode(tenantId?: string) {
    if (this.enableMultiTenancy && tenantId === undefined) {
      throw new Error(
        'This instance has multi-tenancy enabled, but the incoming request is missing tenantId'
      );
    }
    if (!this.enableMultiTenancy && tenantId !== undefined) {
      throw new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId');
    }
  }

  async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
    this.assertValidTenancyMode(request.tenantId);
    const getResponse = await this.dbPersistenceService.readResource(request);
    return this.getBinaryGetUrl(getResponse, request);
  }

  async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
    this.assertValidTenancyMode(request.tenantId);
    const getResponse = await this.dbPersistenceService.vReadResource(request);
    return this.getBinaryGetUrl(getResponse, request);
  }

  async createResource(request: CreateResourceRequest) {
    this.assertValidTenancyMode(request.tenantId);
    // Delete binary data because we don't want to store the content in the data service, we store the content
    // as an object in the objStorageService
    if (this.fhirVersion === '3.0.1') {
      delete request.resource.content;
    } else {
      delete request.resource.data;
    }

    const createResponse = await this.dbPersistenceService.createResource(request);
    const { resource } = createResponse;

    const fileName = this.getPathName(
      resource.id,
      resource.meta.versionId,
      resource.contentType,
      request.tenantId
    );
    let presignedPutUrlResponse;
    try {
      presignedPutUrlResponse = await S3ObjectStorageService.getPresignedPutUrl(fileName);
    } catch (e) {
      await this.dbPersistenceService.deleteResource({ resourceType: request.resourceType, id: resource.id });
      throw e;
    }

    const updatedResource = { ...resource };
    updatedResource.presignedPutUrl = presignedPutUrlResponse.message;
    return {
      success: true,
      message: 'Resource created',
      resource: updatedResource
    };
  }

  async updateResource(request: UpdateResourceRequest) {
    this.assertValidTenancyMode(request.tenantId);
    if (this.fhirVersion === '3.0.1') {
      delete request.resource.content;
    } else {
      delete request.resource.data;
    }

    const updateResponse = await this.dbPersistenceService.updateResource(request);
    const { resource } = updateResponse;

    const fileName = this.getPathName(
      resource.id,
      resource.meta.versionId,
      resource.contentType,
      request.tenantId
    );
    let presignedPutUrlResponse;
    try {
      presignedPutUrlResponse = await S3ObjectStorageService.getPresignedPutUrl(fileName);
    } catch (e) {
      // TODO make this an update
      await this.dbPersistenceService.deleteResource({ resourceType: request.resourceType, id: resource.id });
      throw e;
    }

    const updatedResource = { ...resource };
    updatedResource.presignedPutUrl = presignedPutUrlResponse.message;
    return {
      success: true,
      message: 'Resource updated',
      resource: updatedResource
    };
  }

  async deleteResource(request: DeleteResourceRequest) {
    this.assertValidTenancyMode(request.tenantId);
    await this.dbPersistenceService.readResource(request);
    const prefix = this.enableMultiTenancy ? `${request.tenantId}/${request.id}` : request.id;
    await S3ObjectStorageService.deleteBasedOnPrefix(prefix);
    await this.dbPersistenceService.deleteResource(request);

    return { success: true, message: 'Resource deleted' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  conditionalDeleteResource(
    request: ConditionalDeleteResourceRequest,
    queryParams: any
  ): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initiateExport(initiateExportRequest: InitiateExportRequest): Promise<string> {
    throw new Error('method not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cancelExport(jobId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getExportStatus(jobId: string): Promise<GetExportStatusResponse> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getActiveSubscriptions(params: { tenantId?: string }): Promise<Record<string, any>[]> {
    throw new Error('Method not implemented.');
  }

  private getPathName(id: string, versionId: string, contentType: string, tenantId: string = '') {
    const fileExtension = mime.extension(contentType);
    const filename = `${id}${SEPARATOR}${versionId}.${fileExtension}`;
    return this.enableMultiTenancy ? `${tenantId}/${filename}` : filename;
  }

  private async getBinaryGetUrl(
    dbResponse: GenericResponse,
    request: ReadResourceRequest
  ): Promise<GenericResponse> {
    const fileName = this.getPathName(
      request.id,
      dbResponse.resource.meta.versionId,
      dbResponse.resource.contentType,
      request.tenantId
    );
    let presignedGetUrlResponse;
    try {
      presignedGetUrlResponse = await S3ObjectStorageService.getPresignedGetUrl(fileName);
    } catch (e) {
      if (e instanceof ObjectNotFoundError) {
        throw new ResourceNotFoundError('Binary', request.id);
      }
      throw e;
    }

    const binary = dbResponse.resource;
    // Add binary content to message
    binary.presignedGetUrl = presignedGetUrlResponse.message;

    return { message: 'Item found', resource: binary };
  }
}
