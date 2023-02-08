/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { buildSortClause, parseSortParameter } from './sort';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');

describe('parseSortParameter', () => {
  test('status,-date,category', () => {
    expect(parseSortParameter('status,-date,category')).toMatchInlineSnapshot(`
            Array [
              Object {
                "order": "asc",
                "searchParam": "status",
              },
              Object {
                "order": "desc",
                "searchParam": "date",
              },
              Object {
                "order": "asc",
                "searchParam": "category",
              },
            ]
        `);
  });
});

describe('buildSortClause', () => {
  test('valid date params', () => {
    expect(buildSortClause(fhirSearchParametersRegistry, 'Patient', '-_lastUpdated,birthdate'))
      .toMatchInlineSnapshot(`
            Array [
              Object {
                "meta.lastUpdated": Object {
                  "order": "desc",
                  "unmapped_type": "long",
                },
              },
              Object {
                "meta.lastUpdated.end": Object {
                  "order": "desc",
                  "unmapped_type": "long",
                },
              },
              Object {
                "birthDate": Object {
                  "order": "asc",
                  "unmapped_type": "long",
                },
              },
              Object {
                "birthDate.start": Object {
                  "order": "asc",
                  "unmapped_type": "long",
                },
              },
            ]
        `);
  });

  test('invalid params', () => {
    [
      'notAPatientParam',
      '_lastUpdated,notAPatientParam',
      '+birthdate',
      '#$%/., symbols and stuff',
      'valid params must match a param name from fhirSearchParametersRegistry, so most strings are invalid...',
      'name' // This is actually a valid param but right now we only allow sorting by date params
    ].forEach((p) =>
      expect(() => buildSortClause(fhirSearchParametersRegistry, 'Patient', p)).toThrow(
        InvalidSearchParameterError
      )
    );
  });
});
