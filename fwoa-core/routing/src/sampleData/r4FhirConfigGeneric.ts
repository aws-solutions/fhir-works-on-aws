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
    strategy: {},
    authorization: stubs.passThroughAuthz
  },
  server: {
    url: 'http://example.com'
  },
  profile: {
    fhirVersion: '4.0.1',
    systemOperations: [],
    bundle: stubs.bundle,
    systemSearch: stubs.search,
    systemHistory: stubs.history,
    genericResource: {
      operations: ['create', 'read', 'update', 'delete', 'vread', 'history-instance'],
      fhirVersions: ['4.0.1'],
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
