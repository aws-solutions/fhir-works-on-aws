/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { RoutingImplementationGuides } from './index';

describe('RoutingImplementationGuides', () => {
  describe(`compile`, () => {
    test(`valid input`, async () => {
      const compiled = new RoutingImplementationGuides().compile([
        {
          resourceType: 'StructureDefinition',
          id: 'CARIN-BB-Organization',
          url: 'http://hl7.org/fhir/us/carin/StructureDefinition/carin-bb-organization',
          version: '0.1.0',
          name: 'CARINBBOrganization',
          title: 'CARIN Blue Button Organization Profile',
          status: 'active',
          date: '2019-12-23T19:40:59+00:00',
          publisher: 'CARIN Alliance',
          description:
            'This profile builds on the USCoreOrganization Profile. It includes additional constraints relevant for the use cases addressed by this IG.',
          fhirVersion: '4.0.1',
          kind: 'resource',
          abstract: false,
          type: 'Organization',
          baseDefinition: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-organization',
          derivation: 'constraint'
        },
        {
          resourceType: 'OperationDefinition',
          id: 'docref',
          url: 'http://hl7.org/fhir/us/core/OperationDefinition/docref',
          version: '3.1.1',
          name: 'USCoreFetchDocumentReferences',
          title: 'US Core Fetch DocumentReferences',
          status: 'active',
          kind: 'operation',
          date: '2019-05-21',
          publisher: 'US Core Project',
          description:
            'This operation is used to return all the references to documents related to a patient...',
          code: 'docref',
          system: false,
          type: true,
          instance: false,
          parameter: []
        }
      ]);

      await expect(compiled).resolves.toMatchInlineSnapshot(`
                        Array [
                          Object {
                            "baseDefinition": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-organization",
                            "description": "This profile builds on the USCoreOrganization Profile. It includes additional constraints relevant for the use cases addressed by this IG.",
                            "name": "CARINBBOrganization",
                            "resourceType": "StructureDefinition",
                            "type": "Organization",
                            "url": "http://hl7.org/fhir/us/carin/StructureDefinition/carin-bb-organization",
                          },
                          Object {
                            "description": "This operation is used to return all the references to documents related to a patient...",
                            "name": "USCoreFetchDocumentReferences",
                            "resourceType": "OperationDefinition",
                            "url": "http://hl7.org/fhir/us/core/OperationDefinition/docref",
                          },
                        ]
                    `);
    });

    test(`invalid input`, async () => {
      const compiled = new RoutingImplementationGuides().compile([
        {
          foo: 'bar'
        }
      ]);
      await expect(compiled).rejects.toThrowError();
    });
  });
});
