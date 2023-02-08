/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { stringMatch } from './stringMatch';

const COMPILED_SEARCH_PARAM: CompiledSearchParam = {
  path: 'someField',
  resourceType: 'someResource'
};

describe('stringMatch', () => {
  test('matches string', () => {
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello')).toBe(true);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello world')).toBe(true);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello-world')).toBe(true);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'something else')).toBe(false);
  });

  test('modifier :exact', () => {
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello', 'exact')).toBe(true);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello world', 'exact')).toBe(false);
  });

  test('modifier :contains', () => {
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'XXXXXhelloXXXX', 'contains')).toBe(true);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'something else', 'contains')).toBe(false);
  });

  test('unsupported modifier', () => {
    expect(() =>
      stringMatch(COMPILED_SEARCH_PARAM, 'hello', 'hello', 'unknownModifier')
    ).toThrowErrorMatchingInlineSnapshot(`"The modifier \\":unknownModifier\\" is not supported"`);
  });

  test('not a string', () => {
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', [])).toBe(false);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', {})).toBe(false);
    expect(stringMatch(COMPILED_SEARCH_PARAM, 'hello', 23.1)).toBe(false);
  });

  describe('special cases', () => {
    describe('name', () => {
      test.each(['family', 'given', 'text', 'prefix', 'suffix'])('%p field', (field) => {
        const compiledNameParam = {
          path: 'name',
          resourceType: 'someResource'
        };
        expect(
          stringMatch(compiledNameParam, 'John', {
            [field]: 'John'
          })
        ).toBe(true);

        expect(
          stringMatch(compiledNameParam, 'John', {
            [field]: ['John']
          })
        ).toBe(true);
      });
    });

    describe('address', () => {
      test.each(['city', 'country', 'district', 'line', 'postalCode', 'state', 'text'])(
        '%p field',
        (field) => {
          const compiledNameParam = {
            path: 'address',
            resourceType: 'someResource'
          };
          expect(
            stringMatch(compiledNameParam, 'somePlace', {
              [field]: 'somePlace'
            })
          ).toBe(true);

          expect(
            stringMatch(compiledNameParam, 'somePlace', {
              [field]: ['somePlace']
            })
          ).toBe(true);
        }
      );
    });
  });
});
