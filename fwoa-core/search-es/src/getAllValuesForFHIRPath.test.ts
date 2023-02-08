/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { getAllValuesForFHIRPath } from './getAllValuesForFHIRPath';

describe('getAllValuesForFHIRPath', () => {
  test('simple path', () => {
    const values = getAllValuesForFHIRPath({ a: { b: { c: 1 } } }, 'a.b.c');
    expect(values).toMatchInlineSnapshot(`
            Array [
              1,
            ]
        `);
  });

  test('intermediate array', () => {
    const values = getAllValuesForFHIRPath({ a: [{ b: { c: 1 } }, { b: { c: 2 } }] }, 'a.b.c');
    expect(values).toMatchInlineSnapshot(`
            Array [
              1,
              2,
            ]
        `);
  });

  test('all arrays', () => {
    const values = getAllValuesForFHIRPath({ a: [{ b: { c: [1, 2] } }, { b: { c: [3, 4] } }] }, 'a.b.c');
    expect(values).toMatchInlineSnapshot(`
            Array [
              1,
              2,
              3,
              4,
            ]
        `);
  });

  test('non-existent path', () => {
    const values = getAllValuesForFHIRPath({ a: { b: { c: 1 } } }, 'some.path.x');
    expect(values).toMatchInlineSnapshot(`Array []`);
  });

  test('empty resource', () => {
    const values = getAllValuesForFHIRPath({}, 'a.b.c');
    expect(values).toMatchInlineSnapshot(`Array []`);
  });
});
