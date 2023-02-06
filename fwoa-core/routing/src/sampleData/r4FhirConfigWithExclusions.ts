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
      oauthPolicy: {
        authorizationEndpoint: 'http://example.com/authorization',
        tokenEndpoint: 'http://example.com/oauth2/token'
      },
      service: 'SMART-on-FHIR'
    },
    authorization: stubs.passThroughAuthz
  },
  server: {
    url: 'http://example.com'
  },
  //
  // Add any profiles you want to support.  Each profile can support multiple fhirVersions
  // This 'resource*' defaults to ALL resources not called out in excludedResources or resources array
  //
  profile: {
    fhirVersion: '4.0.1',
    systemOperations: ['search-system'],
    bundle: stubs.bundle,
    systemSearch: stubs.search,
    systemHistory: stubs.history,
    genericResource: {
      operations: ['read', 'history-instance', 'history-type'],
      excludedR4Resources: ['Organization', 'Account', 'Patient'],
      fhirVersions: ['4.0.1'],
      persistence: stubs.persistence,
      typeSearch: stubs.search,
      typeHistory: stubs.history
    },
    resources: {
      AllergyIntolerance: {
        operations: ['create', 'update'],
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
