/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FHIRStructureDefinitionRegistry } from './index';

const IGCompiledStructureDefinition = [
  {
    name: 'C4BBPatient',
    url: 'http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-Patient',
    type: 'Patient',
    resourceType: 'StructureDefinition',
    description:
      'This profile builds upon the US Core Patient profile. It is used to convey information about the patient who received the services described on the claim.',
    baseDefinition: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
  },
  {
    name: 'C4BBCoverage',
    url: 'http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-Coverage',
    type: 'Coverage',
    resourceType: 'StructureDefinition',
    description:
      'Data that reflect a payer’s coverage that was effective as of the date of service or the date of admission of the claim.',
    baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Coverage'
  }
];

describe('FHIRStructureDefinitionRegistry', () => {
  test('getCapabilities snapshot', () => {
    expect(new FHIRStructureDefinitionRegistry(IGCompiledStructureDefinition).getCapabilities())
      .toMatchInlineSnapshot(`
            Object {
              "Coverage": Object {
                "supportedProfile": Array [
                  "http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-Coverage",
                ],
                "type": "Coverage",
              },
              "Patient": Object {
                "supportedProfile": Array [
                  "http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-Patient",
                ],
                "type": "Patient",
              },
            }
        `);
  });

  test('getProfiles snapshot', () => {
    expect(new FHIRStructureDefinitionRegistry(IGCompiledStructureDefinition).getProfiles('Patient'))
      .toMatchInlineSnapshot(`
            Array [
              "http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-Patient",
            ]
        `);
  });
});
