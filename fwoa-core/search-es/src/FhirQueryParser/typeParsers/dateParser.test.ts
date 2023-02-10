/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { parseDateSearchValue } from './dateParser';

describe('parseDateSearchValue', () => {
  describe('valid inputs', () => {
    test('YYYY', () => {
      expect(parseDateSearchValue('2020')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-12-31T23:59:59.999Z,
                    "start": 2020-01-01T00:00:00.000Z,
                  },
                }
            `);
    });
    test('YYYY-MM', () => {
      expect(parseDateSearchValue('2020-02')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-29T23:59:59.999Z,
                    "start": 2020-02-01T00:00:00.000Z,
                  },
                }
            `);
    });
    test('YYYY-MM-DD', () => {
      expect(parseDateSearchValue('2020-02-02')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T23:59:59.999Z,
                    "start": 2020-02-02T00:00:00.000Z,
                  },
                }
            `);
    });
    test('YYYY-MM-DDT:hh:mm', () => {
      expect(parseDateSearchValue('2020-02-02T07:07')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:59.999Z,
                    "start": 2020-02-02T07:07:00.000Z,
                  },
                }
            `);
    });
    test('YYYY-MM-DDT:hh:mm:ss', () => {
      expect(parseDateSearchValue('2020-02-02T07:07:07')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:07.999Z,
                    "start": 2020-02-02T07:07:07.000Z,
                  },
                }
            `);
    });
    test('YYYY-MM-DDT:hh:mm:ss.sss', () => {
      expect(parseDateSearchValue('2020-02-02T07:07:07.777')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:07.777Z,
                    "start": 2020-02-02T07:07:07.777Z,
                  },
                }
            `);
    });
    test('YYYY-MM-DDT:hh:mm:ssZ', () => {
      expect(parseDateSearchValue('2020-02-02T07:07:07Z')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T07:07:07.999Z,
                    "start": 2020-02-02T07:07:07.000Z,
                  },
                }
            `);
    });
    test('YYYY-MM-DDT:hh:mm:ss+hh:mm', () => {
      expect(parseDateSearchValue('2020-02-02T07:07:07+07:00')).toMatchInlineSnapshot(`
                Object {
                  "prefix": "eq",
                  "range": Object {
                    "end": 2020-02-02T00:07:07.999Z,
                    "start": 2020-02-02T00:07:07.000Z,
                  },
                }
            `);
    });
  });

  describe('invalid inputs', () => {
    each([
      ['badpre2020-02-02'],
      ['This is not a date at all'],
      ['2020-99'],
      ['2020-99-99'],
      ['2020/02/02'],
      ['2020-02-02T07'],
      ['2020-02-02T07:07:07someSuffix'],
      ['2020-02-02someSuffix']
    ]).test('%s', (param) => {
      expect(() => parseDateSearchValue(param)).toThrow(InvalidSearchParameterError);
    });
  });
});
