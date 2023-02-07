/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { parseQuantitySearchValue } from './quantityParser';

describe('parseQuantitySearchValue', () => {
  describe('valid inputs', () => {
    test('5.4|http://unitsofmeasure.org|mg', () => {
      expect(parseQuantitySearchValue('5.4|http://unitsofmeasure.org|mg')).toMatchInlineSnapshot(`
                Object {
                  "code": "mg",
                  "implicitRange": Object {
                    "end": 5.45,
                    "start": 5.3500000000000005,
                  },
                  "number": 5.4,
                  "prefix": "eq",
                  "system": "http://unitsofmeasure.org",
                }
            `);
    });
    test('5.40e-3|http://unitsofmeasure.org|g', () => {
      expect(parseQuantitySearchValue('5.40e-3|http://unitsofmeasure.org|g')).toMatchInlineSnapshot(`
                Object {
                  "code": "g",
                  "implicitRange": Object {
                    "end": 0.005405,
                    "start": 0.0053950000000000005,
                  },
                  "number": 0.0054,
                  "prefix": "eq",
                  "system": "http://unitsofmeasure.org",
                }
            `);
    });
    test('5.4||mg', () => {
      expect(parseQuantitySearchValue('5.4||mg')).toMatchInlineSnapshot(`
                Object {
                  "code": "mg",
                  "implicitRange": Object {
                    "end": 5.45,
                    "start": 5.3500000000000005,
                  },
                  "number": 5.4,
                  "prefix": "eq",
                  "system": "",
                }
            `);
    });
    test('5.4', () => {
      expect(parseQuantitySearchValue('5.4')).toMatchInlineSnapshot(`
                Object {
                  "code": "",
                  "implicitRange": Object {
                    "end": 5.45,
                    "start": 5.3500000000000005,
                  },
                  "number": 5.4,
                  "prefix": "eq",
                  "system": "",
                }
            `);
    });
    test('le5.4|http://unitsofmeasure.org|mg', () => {
      expect(parseQuantitySearchValue('le5.4|http://unitsofmeasure.org|mg')).toMatchInlineSnapshot(`
                Object {
                  "code": "mg",
                  "implicitRange": Object {
                    "end": 5.45,
                    "start": 5.3500000000000005,
                  },
                  "number": 5.4,
                  "prefix": "le",
                  "system": "http://unitsofmeasure.org",
                }
            `);
    });
    test('le5.4|http://unitsofmeasure.org|mg with no keyword', () => {
      expect(parseQuantitySearchValue('le5.4|http://unitsofmeasure.org|mg')).toMatchInlineSnapshot(`
                Object {
                  "code": "mg",
                  "implicitRange": Object {
                    "end": 5.45,
                    "start": 5.3500000000000005,
                  },
                  "number": 5.4,
                  "prefix": "le",
                  "system": "http://unitsofmeasure.org",
                }
            `);
    });
  });

  describe('invalid inputs', () => {
    each([
      ['This is not a quantity at all'],
      ['badPrefix100'],
      ['100someSuffix'],
      ['100|a|b|c'],
      ['100xxx|system|code'],
      ['100e-2x|system|code']
    ]).test('%s', (param) => {
      expect(() => parseQuantitySearchValue(param)).toThrow(InvalidSearchParameterError);
    });
  });
});
