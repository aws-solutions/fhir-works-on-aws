/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { parseNumberSearchValue } from './numberParser';

describe('parseNumberSearchValue', () => {
  describe('valid inputs', () => {
    test('10', () => {
      expect(parseNumberSearchValue('10')).toMatchInlineSnapshot(`
                Object {
                  "implicitRange": Object {
                    "end": 10.5,
                    "start": 9.5,
                  },
                  "number": 10,
                  "prefix": "eq",
                }
            `);
    });
    test('lt10', () => {
      expect(parseNumberSearchValue('lt10')).toMatchInlineSnapshot(`
                Object {
                  "implicitRange": Object {
                    "end": 10.5,
                    "start": 9.5,
                  },
                  "number": 10,
                  "prefix": "lt",
                }
            `);
    });
    test('10.57', () => {
      expect(parseNumberSearchValue('10.57')).toMatchInlineSnapshot(`
                Object {
                  "implicitRange": Object {
                    "end": 10.575000000000001,
                    "start": 10.565,
                  },
                  "number": 10.57,
                  "prefix": "eq",
                }
            `);
    });
    test('-8.2', () => {
      expect(parseNumberSearchValue('-8.2')).toMatchInlineSnapshot(`
                Object {
                  "implicitRange": Object {
                    "end": -8.149999999999999,
                    "start": -8.25,
                  },
                  "number": -8.2,
                  "prefix": "eq",
                }
            `);
    });
    test('ge8e-1', () => {
      expect(parseNumberSearchValue('8e-1')).toMatchInlineSnapshot(`
                Object {
                  "implicitRange": Object {
                    "end": 0.8500000000000001,
                    "start": 0.75,
                  },
                  "number": 0.8,
                  "prefix": "eq",
                }
            `);
    });
  });
  describe('invalid inputs', () => {
    each([['This is not a number at all'], ['badPrefix100'], ['100someSuffix'], ['100|system|code']]).test(
      '%s',
      (param) => {
        expect(() => parseNumberSearchValue(param)).toThrow(InvalidSearchParameterError);
      }
    );
  });
});
