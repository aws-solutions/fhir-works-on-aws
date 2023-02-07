/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { parseNumberSearchValue } from '../../FhirQueryParser/typeParsers/numberParser';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';
import { numberQuery } from './numberQuery';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const factorOverrideParam = fhirSearchParametersRegistry.getSearchParameter('ChargeItem', 'factor-override')!
  .compiled[0];

describe('numberQuery', () => {
  describe('valid inputs', () => {
    test('10', () => {
      expect(numberQuery(factorOverrideParam, parseNumberSearchValue('10'))).toMatchInlineSnapshot(`
                Object {
                  "range": Object {
                    "factorOverride": Object {
                      "gte": 9.5,
                      "lte": 10.5,
                    },
                  },
                }
            `);
    });
    test('lt10', () => {
      expect(numberQuery(factorOverrideParam, parseNumberSearchValue('lt10'))).toMatchInlineSnapshot(`
                Object {
                  "range": Object {
                    "factorOverride": Object {
                      "lt": 10,
                    },
                  },
                }
            `);
    });
    test('10.57', () => {
      expect(numberQuery(factorOverrideParam, parseNumberSearchValue('10.57'))).toMatchInlineSnapshot(`
                Object {
                  "range": Object {
                    "factorOverride": Object {
                      "gte": 10.565,
                      "lte": 10.575000000000001,
                    },
                  },
                }
            `);
    });
    test('-8.2', () => {
      expect(numberQuery(factorOverrideParam, parseNumberSearchValue('-8.2'))).toMatchInlineSnapshot(`
                Object {
                  "range": Object {
                    "factorOverride": Object {
                      "gte": -8.25,
                      "lte": -8.149999999999999,
                    },
                  },
                }
            `);
    });
    test('ge8e-1', () => {
      expect(numberQuery(factorOverrideParam, parseNumberSearchValue('8e-1'))).toMatchInlineSnapshot(`
                Object {
                  "range": Object {
                    "factorOverride": Object {
                      "gte": 0.75,
                      "lte": 0.8500000000000001,
                    },
                  },
                }
            `);
    });
  });
  describe('invalid inputs', () => {
    each([['This is not a number at all'], ['badPrefix100'], ['100someSuffix'], ['100|system|code']]).test(
      '%s',
      (param) => {
        expect(() => numberQuery(factorOverrideParam, parseNumberSearchValue(param))).toThrow(
          InvalidSearchParameterError
        );
      }
    );
  });
});
