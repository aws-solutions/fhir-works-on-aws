/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { parseTokenSearchValue } from './tokenParser';

describe('parseTokenSearchValue', () => {
  describe('valid inputs', () => {
    test('code', () => {
      expect(parseTokenSearchValue('code')).toMatchInlineSnapshot(`
                Object {
                  "code": "code",
                  "explicitNoSystemProperty": false,
                  "system": undefined,
                }
            `);
    });
    test('system|code', () => {
      expect(parseTokenSearchValue('system|code')).toMatchInlineSnapshot(`
                Object {
                  "code": "code",
                  "explicitNoSystemProperty": false,
                  "system": "system",
                }
            `);
    });
    test('|code', () => {
      expect(parseTokenSearchValue('|code')).toMatchInlineSnapshot(`
                Object {
                  "code": "code",
                  "explicitNoSystemProperty": true,
                  "system": undefined,
                }
            `);
    });
    test('system|', () => {
      expect(parseTokenSearchValue('system|')).toMatchInlineSnapshot(`
                Object {
                  "code": undefined,
                  "explicitNoSystemProperty": false,
                  "system": "system",
                }
            `);
    });
    test('http://acme.org/patient|2345', () => {
      expect(parseTokenSearchValue('http://acme.org/patient|2345')).toMatchInlineSnapshot(`
                Object {
                  "code": "2345",
                  "explicitNoSystemProperty": false,
                  "system": "http://acme.org/patient",
                }
            `);
    });
    test('empty string', () => {
      expect(parseTokenSearchValue('')).toMatchInlineSnapshot(`
                Object {
                  "code": "",
                  "explicitNoSystemProperty": false,
                  "system": undefined,
                }
            `);
    });
  });

  describe('invalid inputs', () => {
    // there are actually very few invalid inputs since almost any string can potentially be a code
    test('a|b|c', () => {
      expect(() => parseTokenSearchValue('a|b|c')).toThrow(InvalidSearchParameterError);
    });
    test('|', () => {
      expect(() => parseTokenSearchValue('|')).toThrow(InvalidSearchParameterError);
    });
  });
});
