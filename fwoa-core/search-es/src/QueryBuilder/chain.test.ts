/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry, SearchParam } from '../FHIRSearchParametersRegistry';
import parseChainedParameters, { getUniqueTarget } from './chain';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');

describe('parseChainedParameters', () => {
  test('valid chained parameters', () => {
    expect(
      parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
        'general-practitioner:PractitionerRole.organization.name': 'HL7'
      })
    ).toMatchInlineSnapshot(`
            Array [
              Object {
                "chain": Array [
                  Object {
                    "resourceType": "Organization",
                    "searchParam": "name",
                  },
                  Object {
                    "resourceType": "PractitionerRole",
                    "searchParam": "organization",
                  },
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "general-practitioner",
                  },
                ],
                "initialValue": Array [
                  "HL7",
                ],
              },
            ]
        `);

    expect(
      parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
        'link:Patient.birthdate': 'gt2021-10-01'
      })
    ).toMatchInlineSnapshot(`
            Array [
              Object {
                "chain": Array [
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "birthdate",
                  },
                  Object {
                    "resourceType": "Patient",
                    "searchParam": "link",
                  },
                ],
                "initialValue": Array [
                  "gt2021-10-01",
                ],
              },
            ]
        `);
  });

  test('invalid params', () => {
    expect(() =>
      parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
        'organization.location.name': 'Hawaii'
      })
    ).toThrow(
      new InvalidSearchParameterError("Invalid search parameter 'location' for resource type Organization")
    );

    expect(() =>
      parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
        'organization.address.name': 'Hawaii'
      })
    ).toThrow(
      new InvalidSearchParameterError(
        "Chained search parameter 'address' for resource type Organization is not a reference."
      )
    );

    expect(() =>
      parseChainedParameters(fhirSearchParametersRegistry, 'Patient', {
        'link.name': 'five-O'
      })
    ).toThrow(
      new InvalidSearchParameterError(
        "Chained search parameter 'link' for resource type Patient points to multiple resource types, please specify."
      )
    );
  });

  test('search param with conditions that narrow down target type', () => {
    expect(
      parseChainedParameters(fhirSearchParametersRegistry, 'DocumentReference', {
        'patient.identifier': '2.16.840.1.113883.3.1579|8889154591540'
      })
    ).toMatchInlineSnapshot(`
          Array [
            Object {
              "chain": Array [
                Object {
                  "resourceType": "Patient",
                  "searchParam": "identifier",
                },
                Object {
                  "resourceType": "DocumentReference",
                  "searchParam": "patient",
                },
              ],
              "initialValue": Array [
                "2.16.840.1.113883.3.1579|8889154591540",
              ],
            },
          ]
      `);
  });

  test('get unique target edge cases', () => {
    const errorCases: SearchParam[] = [
      {
        name: 'patient',
        url: 'http://hl7.org/fhir/SearchParameter/Person-patient',
        type: 'reference',
        description: 'The Person links to this Patient',
        base: 'Person',
        target: ['Patient', 'Practitioner'],
        compiled: [
          {
            resourceType: 'Person',
            path: 'link.target',
            condition: ['link.target', 'resolve', 'Patient']
          },
          {
            resourceType: 'Person',
            path: 'link.target',
            condition: ['link.something', 'resolve', 'Practitioner']
          }
        ]
      },
      {
        name: 'patient',
        url: 'http://hl7.org/fhir/SearchParameter/Person-patient',
        type: 'reference',
        description: 'The Person links to this Patient',
        base: 'Person',
        target: ['Patient', 'Practitioner'],
        compiled: [
          {
            resourceType: 'Person',
            path: 'link.target',
            condition: ['link.target', 'resolve', 'Patient']
          },
          {
            resourceType: 'Person',
            path: 'xxx.target'
          }
        ]
      },
      {
        name: 'patient',
        url: 'http://hl7.org/fhir/SearchParameter/Person-patient',
        type: 'reference',
        description: 'The Person links to this Patient',
        base: 'Person',
        target: ['Patient', 'Practitioner'],
        compiled: [
          {
            resourceType: 'Person',
            path: 'link.target',
            condition: ['link.target', 'resolve', 'Observation']
          },
          {
            resourceType: 'Person',
            path: 'link.target',
            condition: ['link.something', 'resolve', 'Observation']
          }
        ]
      }
    ];

    const successCase: SearchParam = {
      name: 'patient',
      url: 'http://hl7.org/fhir/SearchParameter/Person-patient',
      type: 'reference',
      description: 'The Person links to this Patient',
      base: 'Person',
      target: ['Patient', 'Practitioner'],
      compiled: [
        {
          resourceType: 'Person',
          path: 'link.target',
          condition: ['link.target', 'resolve', 'Patient']
        },
        {
          resourceType: 'Person',
          path: 'link.target',
          condition: ['link.something', 'resolve', 'Patient']
        }
      ]
    };

    expect(getUniqueTarget(successCase)).toMatchInlineSnapshot(`"Patient"`);
    errorCases.forEach((errorCase) => expect(getUniqueTarget(errorCase)).toBeUndefined());
  });
});
