/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-classes-per-file */

import {
  SearchResponse,
  Persistence,
  CreateResourceRequest,
  UpdateResourceRequest,
  ReadResourceRequest,
  vReadResourceRequest,
  DeleteResourceRequest,
  PatchResourceRequest,
  ConditionalDeleteResourceRequest,
  GenericResponse,
  stubs,
  ResourceNotFoundError,
  ResourceVersionNotFoundError,
  InvalidResourceError,
  InitiateExportRequest,
  GetExportStatusResponse,
  RequestContext
} from '@aws/fhir-works-on-aws-interface';
import { v4 as uuidv4 } from 'uuid';
import invalidPatient from '../../sampleData/invalidV4Patient.json';
import validPatient from '../../sampleData/validV4Patient.json';

import DynamoDbDataService from '../__mocks_/dynamoDbDataService';
import ElasticSearchService from '../__mocks_/elasticSearchService';
import OperationsGenerator from '../operationsGenerator';
import JsonSchemaValidator from '../validation/jsonSchemaValidator';
import ResourceHandler from './resourceHandler';
import { validateXHTMLResource } from './utils';

const enum SEARCH_PAGINATION_PARAMS {
  PAGES_OFFSET = '_getpagesoffset',
  COUNT = '_count'
}

const dummyRequestContext: RequestContext = {
  url: 'https://fhir.acme.com/patient',
  contextInfo: {},
  headers: {},
  hostname: 'fhir.acme.com',
  verb: 'GET'
};

describe('SUCCESS CASES: Testing create, read, update, delete of resources', () => {
  const resourceHandler = new ResourceHandler(
    DynamoDbDataService,
    ElasticSearchService,
    stubs.history,
    stubs.passThroughAuthz,
    'https://API_URL.com',
    [new JsonSchemaValidator('4.0.1')]
  );

  test('create: patient', async () => {
    // BUILD
    const expectedValidPatient = { ...validPatient } as any;

    // The patient that was created has a randomly generated id, which will not match the expectedValidPatient's id
    delete expectedValidPatient.id;

    // OPERATE
    const createResponse = await resourceHandler.create('Patient', validPatient);

    // CHECK
    // TODO spy on DS and ensure ID being passed in is not the expectedValidPatient.id
    expect(createResponse.id).toBeDefined();
    expect(createResponse.meta).toBeDefined();
    expect(createResponse.meta.versionId).toEqual('1');
    expect(createResponse.meta.lastUpdated).toBeDefined();
    delete createResponse.meta;
    expect(createResponse).toMatchObject(expectedValidPatient);
  });

  test('get: patient', async () => {
    // BUILD
    const id = uuidv4();
    const expectedValidPatient = { ...validPatient };
    expectedValidPatient.id = id;

    // OPERATE
    const getResponse: any = await resourceHandler.read('Patient', id);

    // CHECK
    expect(getResponse.meta).toBeDefined();
    expect(getResponse.meta.versionId).toEqual('1');
    expect(getResponse.meta.lastUpdated).toBeDefined();
    delete getResponse.meta;
    expect(getResponse).toMatchObject(expectedValidPatient);
  });

  test('vread: patient', async () => {
    // BUILD
    const id = uuidv4();
    const vid = '1';
    const expectedValidPatient = { ...validPatient };
    expectedValidPatient.id = id;

    // OPERATE
    const getResponse: any = await resourceHandler.vRead('Patient', id, vid);

    // CHECK
    expect(getResponse.meta).toBeDefined();
    expect(getResponse.meta.versionId).toEqual('1');
    expect(getResponse.meta.lastUpdated).toBeDefined();
    delete getResponse.meta;
    expect(getResponse).toMatchObject(expectedValidPatient);
  });

  test('update: patient', async () => {
    // BUILD
    const id = uuidv4();
    const expectedValidPatient = { ...validPatient };
    expectedValidPatient.id = id;

    // OPERATE
    const updateResponse = await resourceHandler.update('Patient', id, validPatient);

    // CHECK
    // TODO spy on DS and ensure ID being passed in is the expectedValidPatient.id & versionId is set to 2
    expect(updateResponse.id).toEqual(id);
    expect(updateResponse.meta).toBeDefined();
    expect(updateResponse.meta.versionId).toEqual('2');
    expect(updateResponse.meta.lastUpdated).toBeDefined();
    delete updateResponse.meta;
    expect(updateResponse).toMatchObject(expectedValidPatient);
  });

  test('patch: patient', async () => {
    // BUILD
    const id = uuidv4();
    const expectedValidPatient = { ...validPatient };
    expectedValidPatient.id = id;

    // OPERATE
    const patchResponse = await resourceHandler.patch('Patient', id, validPatient);

    // CHECK
    // TODO spy on DS and ensure ID being passed in is the expectedValidPatient.id & versionId is set to 2
    expect(patchResponse.id).toEqual(id);
    expect(patchResponse.meta).toBeDefined();
    expect(patchResponse.meta.versionId).toEqual('2');
    expect(patchResponse.meta.lastUpdated).toBeDefined();
    delete patchResponse.meta;
    expect(patchResponse).toMatchObject(expectedValidPatient);
  });

  test('delete: patient', async () => {
    // BUILD
    const id = uuidv4();
    // OPERATE
    const deleteResponse = await resourceHandler.delete('Patient', id);
    // CHECK
    expect(deleteResponse).toEqual(OperationsGenerator.generateSuccessfulDeleteOperation(1));
  });
});
describe('ERROR CASES: Testing create, read, update, delete of resources', () => {
  const dbError = new Error('Some database error');
  const mockedDataService: Persistence = class {
    static updateCreateSupported: boolean = false;

    static async createResource(request: CreateResourceRequest): Promise<GenericResponse> {
      throw dbError;
    }

    static async updateResource(request: UpdateResourceRequest): Promise<GenericResponse> {
      const { resourceType, id } = request;
      throw new ResourceNotFoundError(resourceType, id);
    }

    static async patchResource(request: PatchResourceRequest): Promise<GenericResponse> {
      throw dbError;
    }

    static async readResource(request: ReadResourceRequest): Promise<GenericResponse> {
      const { resourceType, id } = request;
      throw new ResourceNotFoundError(resourceType, id);
    }

    static async vReadResource(request: vReadResourceRequest): Promise<GenericResponse> {
      const { resourceType, id, vid } = request;
      throw new ResourceVersionNotFoundError(resourceType, id, vid);
    }

    static async deleteResource(request: DeleteResourceRequest): Promise<GenericResponse> {
      const { resourceType, id } = request;
      throw new ResourceNotFoundError(resourceType, id);
    }

    static async deleteVersionedResource(
      resourceType: string,
      id: string,
      versionId: string
    ): Promise<GenericResponse> {
      throw dbError;
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

    static conditionalPatchResource(
      request: PatchResourceRequest,
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

    static conditionalDeleteResource(
      request: ConditionalDeleteResourceRequest,
      queryParams: any
    ): Promise<GenericResponse> {
      throw new Error('Method not implemented.');
    }

    static getActiveSubscriptions(params: { tenantId?: string }): Promise<Record<string, any>[]> {
      throw new Error('Method not implemented');
    }
  };

  const resourceHandler = new ResourceHandler(
    mockedDataService,
    ElasticSearchService,
    stubs.history,
    stubs.passThroughAuthz,
    'https://API_URL.com',
    [new JsonSchemaValidator('4.0.1')]
  );

  beforeEach(() => {
    // Ensures that for each test, we test the assertions in the catch block
    expect.hasAssertions();
  });

  test('create: invalid patient', async () => {
    // BUILD
    try {
      // OPERATE
      await resourceHandler.create('Patient', invalidPatient);
    } catch (e) {
      // CHECK
      expect(e).toEqual(
        new InvalidResourceError(
          "Failed to parse request body as JSON resource. Error was: data.text should have required property 'div', data.gender should be equal to one of the allowed values"
        )
      );
    }
  });

  test('create: Data Service failure', async () => {
    // BUILD
    try {
      // OPERATE
      await resourceHandler.create('Patient', validPatient);
    } catch (e) {
      // CHECK
      expect(e).toEqual(dbError);
    }
  });

  test('update: invalid patient', async () => {
    // BUILD
    const id = uuidv4();
    try {
      // OPERATE
      await resourceHandler.update('Patient', id, invalidPatient);
    } catch (e) {
      // CHECK
      expect(e).toEqual(
        new InvalidResourceError(
          "Failed to parse request body as JSON resource. Error was: data.text should have required property 'div', data.gender should be equal to one of the allowed values"
        )
      );
    }
  });

  test('update: resource that does not exist', async () => {
    // BUILD
    const id = uuidv4();
    try {
      // OPERATE
      await resourceHandler.update('Patient', id, validPatient);
    } catch (e) {
      // CHECK
      expect(e).toEqual(new ResourceNotFoundError('Patient', id));
    }
  });

  test('patch: Data Service failure', async () => {
    // BUILD
    const id = uuidv4();
    try {
      // OPERATE
      await resourceHandler.patch('Patient', id, validPatient);
    } catch (e) {
      // CHECK
      expect(e).toEqual(dbError);
    }
  });

  test('get: resource that does not exist', async () => {
    // BUILD
    const id = uuidv4();
    try {
      // OPERATE
      await resourceHandler.read('Patient', id);
    } catch (e) {
      // CHECK
      console.log(e);
      expect(e).toEqual(new ResourceNotFoundError('Patient', id));
    }
  });

  test('history: resource that does not exist', async () => {
    // BUILD
    const id = uuidv4();
    const vid = '1';
    try {
      // OPERATE
      await resourceHandler.vRead('Patient', id, vid);
    } catch (e) {
      // CHECK
      expect(e).toEqual(new ResourceVersionNotFoundError('Patient', id, vid));
    }
  });

  test('delete patient that does NOT exist', async () => {
    // BUILD
    const id = uuidv4();
    try {
      // OPERATE
      await resourceHandler.delete('Patient', id);
    } catch (e) {
      // CHECK
      expect(e).toEqual(new ResourceNotFoundError('Patient', id));
    }
  });
});

describe('Testing search', () => {
  const initializeResourceHandler = (searchServiceResponse?: SearchResponse) => {
    ElasticSearchService.typeSearch = jest.fn().mockReturnValue(Promise.resolve(searchServiceResponse));

    const resourceHandler = new ResourceHandler(
      DynamoDbDataService,
      ElasticSearchService,
      stubs.history,
      stubs.passThroughAuthz,
      'https://API_URL.com',
      [new JsonSchemaValidator('4.0.1')]
    );

    return resourceHandler;
  };

  beforeEach(() => {
    // Ensures that for each test, we test the assertions in the catch block
    expect.hasAssertions();
  });

  test('Search for a patient that exist', async () => {
    // BUILD

    stubs.passThroughAuthz.getAllowedResourceTypesForOperation = jest
      .fn()
      .mockResolvedValue(['Patient', 'Practitioner']);

    const resourceHandler = initializeResourceHandler({
      result: {
        numberOfResults: 1,
        message: '',
        entries: [
          {
            fullUrl: 'https://API_URL.com/Patient/xcda',
            resource: validPatient,
            search: {
              mode: 'match'
            }
          }
        ]
      }
    });

    // OPERATE
    const searchResponse: any = await resourceHandler.typeSearch(
      'Patient',
      { name: 'Henry' },
      {},
      dummyRequestContext,
      'https://API_URL.com'
    );

    // CHECK
    expect(stubs.passThroughAuthz.getAllowedResourceTypesForOperation).toHaveBeenCalledWith({
      operation: 'search-type',
      userIdentity: {},
      requestContext: dummyRequestContext
    });
    expect(ElasticSearchService.typeSearch).toHaveBeenCalledWith({
      allowedResourceTypes: ['Patient', 'Practitioner'],
      baseUrl: 'https://API_URL.com',
      queryParams: {
        name: 'Henry'
      },
      resourceType: 'Patient',
      searchFilters: [],
      sessionId: '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a' // hash of user identity
    });
    expect(searchResponse.resourceType).toEqual('Bundle');
    expect(searchResponse.meta).toBeDefined();
    expect(searchResponse.type).toEqual('searchset');
    expect(searchResponse.total).toEqual(1);
    expect(searchResponse.link).toEqual([
      {
        relation: 'self',
        url: 'https://API_URL.com/Patient?name=Henry'
      }
    ]);

    expect(searchResponse.entry).toEqual([
      {
        search: {
          mode: 'match'
        },
        fullUrl: 'https://API_URL.com/Patient/xcda',
        resource: validPatient
      }
    ]);
  });

  test('Search for a patient that does NOT exist', async () => {
    // BUILD
    const resourceHandler = initializeResourceHandler({
      result: {
        numberOfResults: 0,
        message: '',
        entries: []
      }
    });

    // OPERATE
    const searchResponse: any = await resourceHandler.typeSearch(
      'Patient',
      { name: 'Henry' },
      {},
      dummyRequestContext,
      'https://API_URL.com'
    );

    // CHECK
    expect(searchResponse.resourceType).toEqual('Bundle');
    expect(searchResponse.meta).toBeDefined();
    expect(searchResponse.type).toEqual('searchset');
    expect(searchResponse.total).toEqual(0);
    expect(searchResponse.link).toEqual([
      {
        relation: 'self',
        url: 'https://API_URL.com/Patient?name=Henry'
      }
    ]);

    expect(searchResponse.entry).toEqual([]);
  });

  test('Search for a patient fails', async () => {
    // BUILD
    const failureMessage = 'Failure';
    const resourceHandler = initializeResourceHandler();
    ElasticSearchService.typeSearch = jest.fn().mockRejectedValue(new Error('Boom!!'));
    try {
      // OPERATE
      await resourceHandler.typeSearch(
        'Patient',
        { name: 'Henry' },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );
    } catch (e) {
      // CHECK
      expect(e).toEqual(new Error('Boom!!'));
    }
  });

  describe('Pagination', () => {
    test('Pagination with a next page link', async () => {
      // BUILD
      const resourceHandler = initializeResourceHandler({
        result: {
          nextResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1',
          numberOfResults: 2,
          message: '',
          entries: [
            {
              fullUrl: 'https://API_URL.com/Patient/xcda',
              resource: validPatient,
              search: {
                mode: 'match'
              }
            }
          ]
        }
      });

      // OPERATE
      const searchResponse: any = await resourceHandler.typeSearch(
        'Patient',
        {
          name: 'Henry',
          [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 0,
          [SEARCH_PAGINATION_PARAMS.COUNT]: 1
        },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );

      // CHECK
      expect(searchResponse.resourceType).toEqual('Bundle');
      expect(searchResponse.meta).toBeDefined();
      expect(searchResponse.type).toEqual('searchset');
      expect(searchResponse.total).toEqual(2);
      expect(searchResponse.link).toEqual([
        {
          relation: 'self',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1'
        },
        {
          relation: 'next',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1'
        }
      ]);

      expect(searchResponse.entry).toEqual([
        {
          search: {
            mode: 'match'
          },
          fullUrl: 'https://API_URL.com/Patient/xcda',
          resource: validPatient
        }
      ]);
    });
    test('Pagination with a previous page link', async () => {
      // BUILD
      const resourceHandler = initializeResourceHandler({
        result: {
          previousResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
          numberOfResults: 2,
          message: '',
          entries: [
            {
              fullUrl: 'https://API_URL.com/Patient/xcda',
              resource: validPatient,
              search: {
                mode: 'match'
              }
            }
          ]
        }
      });

      // OPERATE
      const searchResponse: any = await resourceHandler.typeSearch(
        'Patient',
        {
          name: 'Henry',
          [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 1,
          [SEARCH_PAGINATION_PARAMS.COUNT]: 1
        },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );

      // CHECK
      expect(searchResponse.resourceType).toEqual('Bundle');
      expect(searchResponse.meta).toBeDefined();
      expect(searchResponse.type).toEqual('searchset');
      expect(searchResponse.total).toEqual(2);
      expect(searchResponse.link).toEqual([
        {
          relation: 'self',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1'
        },
        {
          relation: 'previous',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1'
        }
      ]);

      expect(searchResponse.entry).toEqual([
        {
          search: {
            mode: 'match'
          },
          fullUrl: 'https://API_URL.com/Patient/xcda',
          resource: validPatient
        }
      ]);
    });
    test('Pagination with a previous page link and a next page link', async () => {
      // BUILD
      const resourceHandler = initializeResourceHandler({
        result: {
          nextResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=2&_count=1',
          previousResultUrl: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1',
          numberOfResults: 3,
          message: '',
          entries: [
            {
              fullUrl: 'https://API_URL.com/Patient/xcda',
              resource: validPatient,
              search: {
                mode: 'match'
              }
            }
          ]
        }
      });
      // OPERATE
      const searchResponse: any = await resourceHandler.typeSearch(
        'Patient',
        {
          name: 'Henry',
          [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 1,
          [SEARCH_PAGINATION_PARAMS.COUNT]: 1
        },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );

      // CHECK
      expect(searchResponse.resourceType).toEqual('Bundle');
      expect(searchResponse.meta).toBeDefined();
      expect(searchResponse.type).toEqual('searchset');
      expect(searchResponse.total).toEqual(3);
      expect(searchResponse.link).toEqual([
        {
          relation: 'self',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=1&_count=1'
        },
        {
          relation: 'previous',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=0&_count=1'
        },
        {
          relation: 'next',
          url: 'https://API_URL.com/Patient?name=Henry&_getpagesoffset=2&_count=1'
        }
      ]);

      expect(searchResponse.entry).toEqual([
        {
          search: {
            mode: 'match'
          },
          fullUrl: 'https://API_URL.com/Patient/xcda',
          resource: validPatient
        }
      ]);
    });
  });
});
describe('Testing history', () => {
  const initializeResourceHandler = (searchServiceResponse?: SearchResponse) => {
    stubs.history.typeHistory = jest.fn().mockReturnValue(Promise.resolve(searchServiceResponse));
    stubs.history.instanceHistory = jest.fn().mockReturnValue(Promise.resolve(searchServiceResponse));

    const resourceHandler = new ResourceHandler(
      DynamoDbDataService,
      ElasticSearchService,
      stubs.history,
      stubs.passThroughAuthz,
      'https://API_URL.com',
      [new JsonSchemaValidator('4.0.1')]
    );

    return resourceHandler;
  };

  beforeEach(() => {
    // Ensures that for each test, we test the assertions in the catch block
    expect.hasAssertions();
  });

  test('History for a patient that exist', async () => {
    // BUILD
    const resourceHandler = initializeResourceHandler({
      result: {
        numberOfResults: 1,
        message: '',
        entries: [
          {
            fullUrl: 'https://API_URL.com/Patient/xcda',
            resource: validPatient,
            search: {
              mode: 'match'
            }
          }
        ]
      }
    });

    // OPERATE
    const searchResponse: any = await resourceHandler.typeHistory(
      'Patient',
      { name: 'Henry' },
      {},
      dummyRequestContext,
      'https://API_URL.com'
    );

    // CHECK
    expect(searchResponse.resourceType).toEqual('Bundle');
    expect(searchResponse.meta).toBeDefined();
    expect(searchResponse.type).toEqual('history');
    expect(searchResponse.total).toEqual(1);
    expect(searchResponse.link).toEqual([
      {
        relation: 'self',
        url: 'https://API_URL.com/Patient/_history?name=Henry'
      }
    ]);

    expect(searchResponse.entry).toEqual([
      {
        search: {
          mode: 'match'
        },
        fullUrl: 'https://API_URL.com/Patient/xcda',
        resource: validPatient
      }
    ]);
  });

  test('History for a patient that does NOT exist', async () => {
    // BUILD
    const resourceHandler = initializeResourceHandler({
      result: {
        numberOfResults: 0,
        message: '',
        entries: []
      }
    });

    // OPERATE
    const searchResponse: any = await resourceHandler.typeHistory(
      'Patient',
      { name: 'Henry' },
      {},
      dummyRequestContext,
      'https://API_URL.com'
    );

    // CHECK
    expect(searchResponse.resourceType).toEqual('Bundle');
    expect(searchResponse.meta).toBeDefined();
    expect(searchResponse.type).toEqual('history');
    expect(searchResponse.total).toEqual(0);
    expect(searchResponse.link).toEqual([
      {
        relation: 'self',
        url: 'https://API_URL.com/Patient/_history?name=Henry'
      }
    ]);

    expect(searchResponse.entry).toEqual([]);
  });

  test('History type for a patient fails', async () => {
    // BUILD
    const failureMessage = 'Failure';
    const resourceHandler = initializeResourceHandler();
    stubs.history.typeHistory = jest.fn().mockRejectedValue(new Error('Boom!!'));
    try {
      // OPERATE
      await resourceHandler.typeHistory(
        'Patient',
        { name: 'Henry' },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );
    } catch (e) {
      // CHECK
      expect(e).toEqual(new Error('Boom!!'));
    }
  });

  test('Instance History for a patient returns a Patient', async () => {
    // BUILD
    const resourceHandler = initializeResourceHandler({
      result: {
        numberOfResults: 1,
        message: '',
        entries: [
          {
            fullUrl: 'https://API_URL.com/Patient/id123',
            resource: validPatient,
            search: {
              mode: 'match'
            }
          }
        ]
      }
    });

    // OPERATE
    const searchResponse: any = await resourceHandler.instanceHistory(
      'Patient',
      'id123',
      { name: 'Henry' },
      {},
      dummyRequestContext,
      'https://API_URL.com'
    );

    // CHECK
    expect(searchResponse.resourceType).toEqual('Bundle');
    expect(searchResponse.meta).toBeDefined();
    expect(searchResponse.type).toEqual('history');
    expect(searchResponse.total).toEqual(1);
    expect(searchResponse.link).toEqual([
      {
        relation: 'self',
        url: 'https://API_URL.com/Patient/id123/_history?name=Henry'
      }
    ]);

    expect(searchResponse.entry).toEqual([
      {
        search: {
          mode: 'match'
        },
        fullUrl: 'https://API_URL.com/Patient/id123',
        resource: validPatient
      }
    ]);
  });

  test('Instance History for a patient fails', async () => {
    // BUILD
    const resourceHandler = initializeResourceHandler();
    stubs.history.instanceHistory = jest.fn().mockRejectedValue(new Error('Boom!!'));
    try {
      // OPERATE
      await resourceHandler.instanceHistory(
        'Patient',
        'id123',
        { name: 'Henry' },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );
    } catch (e) {
      // CHECK
      expect(e).toEqual(new Error('Boom!!'));
    }
  });

  describe('Pagination', () => {
    test('Pagination with a next page link', async () => {
      // BUILD
      const resourceHandler = initializeResourceHandler({
        result: {
          nextResultUrl: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=1&_count=1',
          numberOfResults: 2,
          message: '',
          entries: [
            {
              fullUrl: 'https://API_URL.com/Patient/xcda',
              resource: validPatient,
              search: {
                mode: 'match'
              }
            }
          ]
        }
      });

      // OPERATE
      const searchResponse: any = await resourceHandler.typeHistory(
        'Patient',
        {
          name: 'Henry',
          [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 0,
          [SEARCH_PAGINATION_PARAMS.COUNT]: 1
        },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );

      // CHECK
      expect(searchResponse.resourceType).toEqual('Bundle');
      expect(searchResponse.meta).toBeDefined();
      expect(searchResponse.type).toEqual('history');
      expect(searchResponse.total).toEqual(2);
      expect(searchResponse.link).toEqual([
        {
          relation: 'self',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=0&_count=1'
        },
        {
          relation: 'next',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=1&_count=1'
        }
      ]);

      expect(searchResponse.entry).toEqual([
        {
          search: {
            mode: 'match'
          },
          fullUrl: 'https://API_URL.com/Patient/xcda',
          resource: validPatient
        }
      ]);
    });
    test('Pagination with a previous page link', async () => {
      // BUILD
      const resourceHandler = initializeResourceHandler({
        result: {
          previousResultUrl: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=0&_count=1',
          numberOfResults: 2,
          message: '',
          entries: [
            {
              fullUrl: 'https://API_URL.com/Patient/xcda',
              resource: validPatient,
              search: {
                mode: 'match'
              }
            }
          ]
        }
      });

      // OPERATE
      const searchResponse: any = await resourceHandler.typeHistory(
        'Patient',
        {
          name: 'Henry',
          [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 1,
          [SEARCH_PAGINATION_PARAMS.COUNT]: 1
        },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );

      // CHECK
      expect(searchResponse.resourceType).toEqual('Bundle');
      expect(searchResponse.meta).toBeDefined();
      expect(searchResponse.type).toEqual('history');
      expect(searchResponse.total).toEqual(2);
      expect(searchResponse.link).toEqual([
        {
          relation: 'self',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=1&_count=1'
        },
        {
          relation: 'previous',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=0&_count=1'
        }
      ]);

      expect(searchResponse.entry).toEqual([
        {
          search: {
            mode: 'match'
          },
          fullUrl: 'https://API_URL.com/Patient/xcda',
          resource: validPatient
        }
      ]);
    });
    test('Pagination with a previous page link and a next page link', async () => {
      // BUILD
      const resourceHandler = initializeResourceHandler({
        result: {
          nextResultUrl: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=2&_count=1',
          previousResultUrl: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=0&_count=1',
          numberOfResults: 3,
          message: '',
          entries: [
            {
              fullUrl: 'https://API_URL.com/Patient/xcda',
              resource: validPatient,
              search: {
                mode: 'match'
              }
            }
          ]
        }
      });

      // OPERATE
      const searchResponse: any = await resourceHandler.typeHistory(
        'Patient',
        {
          name: 'Henry',
          [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: 1,
          [SEARCH_PAGINATION_PARAMS.COUNT]: 1
        },
        {},
        dummyRequestContext,
        'https://API_URL.com'
      );

      // CHECK
      expect(searchResponse.resourceType).toEqual('Bundle');
      expect(searchResponse.meta).toBeDefined();
      expect(searchResponse.type).toEqual('history');
      expect(searchResponse.total).toEqual(3);
      expect(searchResponse.link).toEqual([
        {
          relation: 'self',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=1&_count=1'
        },
        {
          relation: 'previous',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=0&_count=1'
        },
        {
          relation: 'next',
          url: 'https://API_URL.com/Patient/_history?name=Henry&_getpagesoffset=2&_count=1'
        }
      ]);

      expect(searchResponse.entry).toEqual([
        {
          search: {
            mode: 'match'
          },
          fullUrl: 'https://API_URL.com/Patient/xcda',
          resource: validPatient
        }
      ]);
    });
  });
});

describe('Testing xhtml validation', () => {
  test('valid patient resource is not affected', () => {
    // BUILD & OPERATE
    const validatedPatient = validateXHTMLResource(validPatient);

    // CHECK
    expect(validatedPatient).toBe(true);
  });

  test('invalid patient resource is filtered', () => {
    // BUILD
    const scriptedPatient = {
      ...validPatient,
      name: [
        {
          family: '<script>alert(123);</script>Levin',
          given: ['Henry']
        }
      ]
    };
    scriptedPatient.name[0].family = '<script>alert(123);</script>Levin';
    // OPERATE
    const validatedPatient = validateXHTMLResource(scriptedPatient);

    // CHECK
    expect(validatedPatient).toBe(false);
  });
});
