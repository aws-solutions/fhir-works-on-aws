/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { parseSearchModifiers } from './util';

describe('getSearchModifiers', () => {
  test('name:exact', () => {
    expect(parseSearchModifiers('name:exact')).toMatchInlineSnapshot(`
        Object {
          "modifier": "exact",
          "parameterName": "name",
        }
        `);
  });

  test('name', () => {
    expect(parseSearchModifiers('name')).toMatchInlineSnapshot(`
            Object {
              "modifier": undefined,
              "parameterName": "name",
            }
        `);
  });

  test('name:contains', () => {
    expect(parseSearchModifiers('name:contains')).toMatchInlineSnapshot(`
        Object {
          "modifier": "contains",
          "parameterName": "name",
        }
        `);
  });

  test('name:', () => {
    expect(parseSearchModifiers('name:')).toMatchInlineSnapshot(`
        Object {
          "modifier": "",
          "parameterName": "name",
        }
        `);
  });
});
