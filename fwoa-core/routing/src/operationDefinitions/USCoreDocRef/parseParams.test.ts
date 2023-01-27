/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { parsePostParams, parseQueryParams } from './parseParams';

describe('parseQueryParams', () => {
  describe('valid params', () => {
    test('all params', () => {
      expect(
        parseQueryParams({
          patient: 'patient/111',
          start: '1990',
          end: '2000',
          'on-demand': 'true'
        })
      ).toMatchInlineSnapshot(`
                Object {
                  "end": "2000",
                  "onDemand": true,
                  "patient": "patient/111",
                  "start": "1990",
                }
            `);
    });

    test('some params', () => {
      expect(
        parseQueryParams({
          patient: 'patient/111',
          start: '1990'
        })
      ).toMatchInlineSnapshot(`
                Object {
                  "patient": "patient/111",
                  "start": "1990",
                }
            `);
    });

    test('patient only', () => {
      expect(
        parseQueryParams({
          patient: 'patient/111'
        })
      ).toMatchInlineSnapshot(`
                Object {
                  "patient": "patient/111",
                }
            `);
    });
  });

  describe('invalid params', () => {
    test('unknown param', () => {
      expect(() =>
        parseQueryParams({ patient: 'Patient/111', someUnknownParam: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"params/someUnknownParam Invalid parameter: \\"someUnknownParam\\""`
      );
    });

    test('missing patient', () => {
      expect(() => parseQueryParams({ start: '1990' })).toThrowErrorMatchingInlineSnapshot(
        `"params should have required property 'patient'"`
      );
    });

    test('bad types', () => {
      expect(() =>
        parseQueryParams({ patient: 23, start: ['1990', '1991'] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"params/patient should be string, params/start should be string"`
      );
    });

    test('bad on-demand', () => {
      expect(() =>
        parseQueryParams({ patient: 'Patient/111', 'on-demand': 'notABoolean' })
      ).toThrowErrorMatchingInlineSnapshot(`"params/on-demand should be true or false"`);
    });
  });
});

describe('parsePostParams', () => {
  describe('valid params', () => {
    test('only patient', () => {
      expect(
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'patient',
              valueId: 'Patient/123'
            }
          ]
        })
      ).toMatchInlineSnapshot(`
                Object {
                  "patient": "Patient/123",
                }
            `);
    });

    test('all params', () => {
      expect(
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'patient',
              valueId: 'Patient/123'
            },
            {
              name: 'codeableConcept',
              valueCodeableConcept: {
                coding: {
                  system: 'http://example.org',
                  code: 'code',
                  display: 'test'
                }
              }
            },
            {
              name: 'start',
              valueDate: '1990'
            },
            {
              name: 'end',
              valueDate: '2000'
            },
            {
              name: 'on-demand',
              valueBoolean: true
            }
          ]
        })
      ).toMatchInlineSnapshot(`
                Object {
                  "end": "2000",
                  "onDemand": true,
                  "patient": "Patient/123",
                  "start": "1990",
                  "type": Object {
                    "code": "code",
                    "system": "http://example.org",
                  },
                }
            `);
    });

    test('some params', () => {
      expect(
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'patient',
              valueId: 'Patient/123'
            },
            {
              name: 'start',
              valueDate: '1990'
            },
            {
              name: 'end',
              valueDate: '2000'
            }
          ]
        })
      ).toMatchInlineSnapshot(`
                Object {
                  "end": "2000",
                  "patient": "Patient/123",
                  "start": "1990",
                }
            `);
    });
  });

  describe('invalid params', () => {
    test('nonsense', () => {
      expect(() =>
        parsePostParams({
          someKey: 'someValue',
          someOtherKey: ['someOtherValue']
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"params/someKey is not a valid property, params/someOtherKey is not a valid property, params should have required property 'resourceType', params should have required property 'parameter'"`
      );
    });

    test('no params', () => {
      expect(() =>
        parsePostParams({
          resourceType: 'Parameters',
          parameter: []
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"params/parameter must be an array of parameters with names and types as specified on http://www.hl7.org/fhir/us/core/OperationDefinition-docref.html"`
      );
    });

    test('missing patient', () => {
      expect(() =>
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'start',
              valueDate: '1990'
            }
          ]
        })
      ).toThrowErrorMatchingInlineSnapshot(`"patient parameter is required"`);
    });

    test('duplicate param name', () => {
      expect(() =>
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'patient',
              valueId: 'Patient/111'
            },
            {
              name: 'patient',
              valueId: 'Patient/222'
            }
          ]
        })
      ).toThrowErrorMatchingInlineSnapshot(`"parameter names cannot repeat"`);
    });

    test('bad param name', () => {
      expect(() =>
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'patient',
              valueId: 'Patient/123'
            },
            {
              name: 'SomeBadName',
              valueDate: 'a'
            }
          ]
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"params/parameter must be an array of parameters with names and types as specified on http://www.hl7.org/fhir/us/core/OperationDefinition-docref.html"`
      );
    });

    test('type mismatch', () => {
      expect(() =>
        parsePostParams({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'patient',
              valueDate: '2000'
            }
          ]
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"params/parameter must be an array of parameters with names and types as specified on http://www.hl7.org/fhir/us/core/OperationDefinition-docref.html"`
      );
    });
  });
});
