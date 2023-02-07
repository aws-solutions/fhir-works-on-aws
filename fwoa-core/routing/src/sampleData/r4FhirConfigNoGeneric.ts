import {
  Authorization,
  BulkDataAccess,
  Bundle,
  FhirConfig,
  History,
  Persistence,
  Search,
  stubs as fwoaStubs
} from '@aws/fhir-works-on-aws-interface';

const config = (stubs: {
  bundle: Bundle;
  search: Search;
  history: History;
  passThroughAuthz: Authorization;
  persistence: Persistence;
  bulkDataAccess: BulkDataAccess;
}): FhirConfig => ({
  configVersion: 1,
  validators: [],
  productInfo: {
    orgName: 'Organization Name'
  },
  auth: {
    strategy: {
      service: 'Basic'
    },
    authorization: stubs.passThroughAuthz
  },
  server: {
    url: 'http://example.com'
  },
  profile: {
    fhirVersion: '4.0.1',
    systemOperations: ['search-system', 'batch', 'history-system'],
    bundle: stubs.bundle,
    systemSearch: stubs.search,
    systemHistory: stubs.history,
    resources: {
      AllergyIntolerance: {
        operations: ['create', 'update'],
        fhirVersions: ['3.0.1'],
        persistence: stubs.persistence,
        typeSearch: stubs.search,
        typeHistory: stubs.history
      },
      Organization: {
        operations: ['create', 'update', 'patch'],
        fhirVersions: ['3.0.1', '4.0.1'],
        persistence: stubs.persistence,
        typeSearch: stubs.search,
        typeHistory: stubs.history
      },
      Account: {
        operations: ['create', 'update'],
        fhirVersions: ['4.0.1'],
        persistence: stubs.persistence,
        typeSearch: stubs.search,
        typeHistory: stubs.history
      },
      Patient: {
        operations: ['create', 'update', 'search-type'],
        fhirVersions: ['4.0.1'],
        persistence: stubs.persistence,
        typeSearch: stubs.search,
        typeHistory: stubs.history
      }
    }
  }
});

const configFn = (overrideStubs?: any) => {
  return config({ ...fwoaStubs, ...overrideStubs });
};

export default configFn;
