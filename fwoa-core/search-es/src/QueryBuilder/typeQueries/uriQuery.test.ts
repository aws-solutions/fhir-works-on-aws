/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';
import { uriQuery } from './uriQuery';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const profileParam = fhirSearchParametersRegistry.getSearchParameter('Patient', '_profile')!.compiled[0];

describe('uriQuery', () => {
  test('simple value', () => {
    expect(
      uriQuery(
        profileParam,
        'http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-ExplanationOfBenefit-Pharmacy',
        true
      )
    ).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "meta.profile.keyword",
                ],
                "lenient": true,
                "query": "http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-ExplanationOfBenefit-Pharmacy",
              },
            }
        `);
  });
  test('simple value; without keyword', () => {
    expect(
      uriQuery(
        profileParam,
        'http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-ExplanationOfBenefit-Pharmacy',
        false
      )
    ).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "meta.profile",
                ],
                "lenient": true,
                "query": "http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-ExplanationOfBenefit-Pharmacy",
              },
            }
        `);
  });
});
