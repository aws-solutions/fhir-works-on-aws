/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Persistence,
  ReadResourceRequest,
  vReadResourceRequest,
  CreateResourceRequest,
  DeleteResourceRequest,
  UpdateResourceRequest,
  PatchResourceRequest,
  ConditionalDeleteResourceRequest,
  generateMeta,
  GenericResponse,
  clone,
  InitiateExportRequest,
  GetExportStatusResponse
} from '@aws/fhir-works-on-aws-interface';
import validPatient from '../../sampleData/validV4Patient.json';

const DynamoDbDataService: Persistence = class {
  static updateCreateSupported: boolean = false;

  static async createResource(request: CreateResourceRequest): Promise<GenericResponse> {
    const resourceCopy: any = clone(request.resource);
    resourceCopy.id = request.id || 'id';
    resourceCopy.meta = generateMeta('1');
    return {
      message: 'Resource created',
      resource: resourceCopy
    };
  }

  static async updateResource(request: UpdateResourceRequest): Promise<GenericResponse> {
    const resourceCopy: any = clone(request.resource);
    resourceCopy.id = request.id;
    resourceCopy.meta = generateMeta('2');
    return {
      message: 'Resource updated',
      resource: resourceCopy
    };
  }

  static async patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
    const resourceCopy: any = clone(request.resource);
    resourceCopy.id = request.id;
    resourceCopy.meta = generateMeta('2');
    return {
      message: 'Resource patched',
      resource: resourceCopy
    };
  }

  static async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
    const resourceCopy: any = clone(validPatient);
    resourceCopy.id = request.id;
    resourceCopy.meta = generateMeta('1');
    return {
      message: 'Resource found',
      resource: resourceCopy
    };
  }

  static async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
    const resourceCopy: any = clone(validPatient);
    resourceCopy.id = request.id;
    if (request.vid) {
      expect(request.vid).toMatch(/^\d+$/);
    }
    resourceCopy.meta = generateMeta(request.vid);
    return {
      message: 'Resource found',
      resource: resourceCopy
    };
  }

  static async deleteResource(request: DeleteResourceRequest): Promise<GenericResponse> {
    return {
      message: `Successfully deleted ResourceType: ${request.resourceType}, Id: ${request.id}`,
      resource: { count: 3 }
    };
  }

  static async deleteVersionedResource(
    resourceType: string,
    id: string,
    versionId: string
  ): Promise<GenericResponse> {
    return {
      message: `Successfully deleted ResourceType: ${resourceType}, Id: ${id}, VersionId: ${versionId}`,
      resource: { count: 1 }
    };
  }

  static conditionalCreateResource(
    request: CreateResourceRequest,
    queryParams: any
  ): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  static conditionalUpdateResource(
    request: UpdateResourceRequest,
    queryParams: any
  ): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  static conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  static conditionalDeleteResource(
    request: ConditionalDeleteResourceRequest,
    queryParams: any
  ): Promise<GenericResponse> {
    throw new Error('Method not implemented.');
  }

  static initiateExport(request: InitiateExportRequest): Promise<string> {
    throw new Error('Method not implemented.');
  }

  static cancelExport(jobId: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  static getExportStatus(jobId: string): Promise<GetExportStatusResponse> {
    throw new Error('Method not implemented');
  }

  static getActiveSubscriptions(params: { tenantId?: string }): Promise<Record<string, any>[]> {
    throw new Error('Method not implemented');
  }
};
export default DynamoDbDataService;
