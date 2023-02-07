/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import getOrSearchValues from './searchOR';

describe('getOrSearchValues', () => {
  test('Emily\\\\\\,Smith', () => {
    expect(getOrSearchValues('Emily\\\\\\,Smith')).toMatchInlineSnapshot(`
            Array [
              "Emily\\\\\\\\,Smith",
            ]
        `);
  });

  test('Emily,Smith,Jon', () => {
    expect(getOrSearchValues('Emily,Smith,Jon')).toMatchInlineSnapshot(`
            Array [
              "Emily",
              "Smith",
              "Jon",
            ]
        `);
  });

  test(',Emily Smith', () => {
    expect(getOrSearchValues(',Emily Smith')).toMatchInlineSnapshot(`
            Array [
              "Emily Smith",
            ]
        `);
  });

  test('Emily,Smith,', () => {
    expect(getOrSearchValues('Emily,Smith,')).toMatchInlineSnapshot(`
            Array [
              "Emily",
              "Smith",
            ]
        `);
  });

  test('\\,Emily Smith', () => {
    expect(getOrSearchValues('\\,Emily Smith')).toMatchInlineSnapshot(`
            Array [
              ",Emily Smith",
            ]
        `);
  });

  test('Emily,Smith\\,', () => {
    expect(getOrSearchValues('Emily,Smith\\,')).toMatchInlineSnapshot(`
            Array [
              "Emily",
              "Smith,",
            ]
        `);
  });
});
