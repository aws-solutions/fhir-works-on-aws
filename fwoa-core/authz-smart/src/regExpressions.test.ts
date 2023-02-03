/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FHIR_USER_REGEX, FHIR_RESOURCE_REGEX } from './smartAuthorizationHelper';
import { FHIR_SCOPE_REGEX } from './smartScopeHelper';

describe('CLINICAL_SCOPE_REGEX', () => {
  const testCases = [
    ['patient', 'Patient', 'read'],
    ['user', 'Patient', 'read'],
    ['patient', 'Patient', 'write'],
    ['patient', 'Patient', '*'],
    ['patient', 'Observation', 'read'],
    ['patient', 'FakeResource', 'write'],
    ['patient', '*', 'write'],
    ['system', '*', 'write'],
    ['system', 'Patient', 'read']
  ];
  test.each(testCases)(
    'CASE: %p/%p.%p; expect: matches',
    async (scopeType, scopeResourceType, accessType) => {
      const expectedStr = `${scopeType}/${scopeResourceType}.${accessType}`;
      const actualMatch = expectedStr.match(FHIR_SCOPE_REGEX);
      expect(actualMatch).toBeTruthy();
      expect(actualMatch!.groups).toBeTruthy();
      expect(actualMatch!.groups!.scopeType).toEqual(scopeType);
      expect(actualMatch!.groups!.scopeResourceType).toEqual(scopeResourceType);
      expect(actualMatch!.groups!.accessType).toEqual(accessType);
    }
  );
  const uniqueTestCases = [
    ['patient.Patient/read'],
    ['plain old wrong'],
    ['patient/Patient.read patient/Patient.read'],
    ['launch/patient'],
    ['patient.Patient/read '],
    ['patient/uncapitalizedResource.write'],
    ['fake/Patient.write'],
    ['patient/Patient.fake'],
    ['patient/Patient1.*'],
    ['/Patient.read'],
    ['patient/.read'],
    ['patient/Patient.'],
    ['system']
  ];
  test.each(uniqueTestCases)('CASE: %p; expect: no match', async (scope) => {
    const actualMatch = scope.match(FHIR_SCOPE_REGEX);
    expect(actualMatch).toBeFalsy();
  });
});

describe('FHIR_USER_REGEX', () => {
  const testCases = [
    ['https://fhir.server.com/dev', 'Patient', 'id'],
    ['http://fhir.server.com/dev', 'Patient', 'id'],
    ['http://fhir.server.com/dev-.:/%/$/2', 'Patient', 'id'],
    ['http://localhost/projectname', 'Patient', 'id'],
    ['http://127.0.0.1/project_name', 'Patient', 'id'],
    ['https://127.0.0.1:8080/project_name', 'Patient', 'id'],
    ['https://fhir.server.com/dev', 'Practitioner', 'id'],
    ['https://fhir.server.com/dev', 'RelatedPerson', 'id'],
    ['https://fhir.server.com/dev', 'Person', 'id'],
    ['https://fhir.server.com/dev', 'Patient', 'idID1234-123.aBc']
  ];
  test.each(testCases)('CASE: %p/%p/%p; expect: matches', async (hostname, resourceType, id) => {
    const expectedStr = `${hostname}/${resourceType}/${id}`;
    const actualMatch = expectedStr.match(FHIR_USER_REGEX);
    expect(actualMatch).toBeTruthy();
    expect(actualMatch!.groups).toBeTruthy();
    expect(actualMatch!.groups!.hostname).toEqual(hostname);
    expect(actualMatch!.groups!.resourceType).toEqual(resourceType);
    expect(actualMatch!.groups!.id).toEqual(id);
  });
  const uniqueTestCases = [
    ['patient/Patient.read'],
    ['launch/encounter'],
    ['just-an-id-1234'],
    ['Patient'],
    ['https://fhir.server.com/dev/'],
    ['Patient/id'],
    ['https://fhir.server.com/dev//id'],
    ['https://fhir.server.com/dev/Patient/'],
    ['fhir.server.com/dev/Patient/id'],
    ['https://fhir.server.com/devPatient/id'],
    ['127.0.0.1/project_namePatient/id'],
    ['https://fhir.server.com/dev/Observation/id'],
    ['https://fhir.server.com/dev/Patient/i_d'],
    ['https://fhir.server.com/dev/Patient/i#d'],
    ['https://fhir.server.com/dev/Patient/id '],
    [' https://fhir.server.com/dev/Patient/id']
  ];
  test.each(uniqueTestCases)('CASE: %p; expect: no match', async (scope) => {
    const actualMatch = scope.match(FHIR_USER_REGEX);
    expect(actualMatch).toBeFalsy();
  });
});
describe('FHIR_RESOURCE_REGEX', () => {
  const testCases = [
    ['https://fhir.server.com/dev', 'Patient', 'id'],
    ['http://fhir.server.com/dev-.:/%/$/2', 'Observation', 'id'],
    ['http://localhost/projectname', 'Encounter', 'id'],
    ['https://127.0.0.1:8080/project_name', 'Patient', 'id'],
    ['https://fhir.server.com/dev', 'Patient', 'idID1234-123.aBc'],
    ['', 'Patient', 'id'],
    ['', 'Encounter', 'id']
  ];
  test.each(testCases)('CASE: %p/%p/%p; expect: matches', async (hostname, resourceType, id) => {
    let expectedStr = `${resourceType}/${id}`;
    if (hostname) expectedStr = `${hostname}/${expectedStr}`;
    const actualMatch = expectedStr.match(FHIR_RESOURCE_REGEX);
    expect(actualMatch).toBeTruthy();
    expect(actualMatch!.groups).toBeTruthy();
    expect(actualMatch!.groups!.resourceType).toEqual(resourceType);
    expect(actualMatch!.groups!.id).toEqual(id);
    if (hostname) {
      expect(actualMatch!.groups!.hostname).toEqual(hostname);
    } else {
      expect(actualMatch!.groups!.hostname).toBeFalsy();
    }
  });
  const uniqueTestCases = [
    ['fhir.server.com/dev/Patient/id'],
    ['https://127.0.0.1/project_namePatient/id'],
    ['patient/Patient.read'],
    ['launch/encounter'],
    ['just-an-id-1234'],
    ['Patient'],
    ['https://fhir.server.com/dev/']
  ];
  test.each(uniqueTestCases)('CASE: %p; expect: no match', async (scope) => {
    const actualMatch = scope.match(FHIR_RESOURCE_REGEX);
    expect(actualMatch).toBeFalsy();
  });
});
