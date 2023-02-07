import { SmartStrategy } from '@aws/fhir-works-on-aws-interface';
import { camelToSnakeCase, getWellKnownUriResponse } from './wellKnownUriHandler';

describe('camelToSnakeCase', () => {
  test('one word', () => {
    expect(camelToSnakeCase('red')).toEqual('red');
  });
  test('one word: mis-capitalized', () => {
    expect(camelToSnakeCase('Red')).toEqual('red');
  });
  test('two words', () => {
    expect(camelToSnakeCase('redAnimal')).toEqual('red_animal');
  });
  test('three words', () => {
    expect(camelToSnakeCase('redAnimalHouse')).toEqual('red_animal_house');
  });
});

describe('getWellKnownUriResponse', () => {
  test('required SMART strategy fields', () => {
    // BUILD
    const smartStrategy: SmartStrategy = {
      authorizationEndpoint: 'http://fake_endpoint.com/auth',
      tokenEndpoint: 'http://fake_endpoint.com/token',
      capabilities: ['launch-ehr', 'client-public']
    };

    // OPERATE
    const response = getWellKnownUriResponse(smartStrategy);

    // CHECK
    expect(response).toEqual({
      authorization_endpoint: 'http://fake_endpoint.com/auth',
      token_endpoint: 'http://fake_endpoint.com/token',
      capabilities: ['launch-ehr', 'client-public']
    });
  });

  test('all fields', () => {
    // BUILD
    const smartStrategy: SmartStrategy = {
      authorizationEndpoint: 'http://fake_endpoint.com/auth',
      tokenEndpoint: 'http://fake_endpoint.com/token',
      introspectionEndpoint: 'http://fake_endpoint.com/introspect',
      revocationEndpoint: 'http://fake_endpoint.com/revocation',
      registrationEndpoint: 'http://fake_endpoint.com/registration',
      managementEndpoint: 'http://fake_endpoint.com/management',
      capabilities: ['launch-ehr', 'client-public'],
      scopesSupported: ['openid', 'profile'],
      responseTypesSupported: ['code', 'code id_token'],
      tokenEndpointAuthMethodsSupported: ['client_secret_basic']
    };

    // OPERATE
    const response = getWellKnownUriResponse(smartStrategy);

    // CHECK
    expect(response).toEqual({
      authorization_endpoint: 'http://fake_endpoint.com/auth',
      token_endpoint: 'http://fake_endpoint.com/token',
      introspection_endpoint: 'http://fake_endpoint.com/introspect',
      revocation_endpoint: 'http://fake_endpoint.com/revocation',
      registration_endpoint: 'http://fake_endpoint.com/registration',
      management_endpoint: 'http://fake_endpoint.com/management',
      capabilities: ['launch-ehr', 'client-public'],
      scopes_supported: ['openid', 'profile'],
      response_types_supported: ['code', 'code id_token'],
      token_endpoint_auth_methods_supported: ['client_secret_basic']
    });
  });
});
