import {
  Authorization,
  BulkDataAccess,
  Bundle,
  FhirConfig,
  History,
  Persistence,
  Search,
  stubs as fwoaStubs
} from 'test-e3776dcf-341e-4fc7-bfc6-762082f295fa';

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
      oauthPolicy: {
        authorizationEndpoint: 'http://example.com/authorization',
        tokenEndpoint: 'http://example.com/oauth2/token'
      },
      service: 'OAuth'
    },
    authorization: stubs.passThroughAuthz
  },
  server: {
    url: 'http://example.com'
  },
  profile: {
    fhirVersion: '3.0.1',
    systemOperations: ['transaction'],
    bundle: stubs.bundle,
    systemSearch: stubs.search,
    systemHistory: stubs.history,
    genericResource: {
      operations: ['read', 'create', 'update', 'vread', 'search-type'],
      excludedR4Resources: ['Organization', 'Account', 'Patient'],
      excludedSTU3Resources: ['ActivityDefinition', 'AllergyIntolerance'],
      fhirVersions: ['4.0.1', '3.0.1'],
      persistence: stubs.persistence,
      typeSearch: stubs.search,
      typeHistory: stubs.history
    }
  }
});

const configFn = (overrideStubs?: any) => {
  return config({ ...fwoaStubs, ...overrideStubs });
};

export default configFn;
