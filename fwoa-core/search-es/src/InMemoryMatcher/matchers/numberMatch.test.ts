/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { numberMatch } from './numberMatch';

describe('numberMatch', () => {
  describe('eq', () => {
    const numberSearchValue = {
      prefix: 'eq',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [99.5, true],
      [100, true],
      [100.5, true],
      [99.4, false],
      [101, false]
    ])('%p eq 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('ne', () => {
    const numberSearchValue = {
      prefix: 'ne',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [99.5, false],
      [100, false],
      [100.5, false],
      [99.4, true],
      [101, true]
    ])('%p ne 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('lt', () => {
    const numberSearchValue = {
      prefix: 'lt',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [90, true],
      [99.9, true],
      [110, false],
      [100, false]
    ])('%p lt 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('le', () => {
    const numberSearchValue = {
      prefix: 'le',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [100, true],
      [99.9, true],
      [110, false]
    ])('%p le 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('gt', () => {
    const numberSearchValue = {
      prefix: 'gt',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [100, false],
      [99.9, false],
      [110, true]
    ])('%p gt 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('ge', () => {
    const numberSearchValue = {
      prefix: 'ge',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [100, true],
      [110, true],
      [99.9, false]
    ])('%p ge 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('eb', () => {
    const numberSearchValue = {
      prefix: 'eb',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [90, true],
      [99.9, true],
      [110, false],
      [100, false]
    ])('%p eb 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });

  describe('sa', () => {
    const numberSearchValue = {
      prefix: 'sa',
      number: 100,
      implicitRange: { start: 99.5, end: 100.5 }
    };
    test.each([
      [100, false],
      [99.9, false],
      [110, true]
    ])('%p sa 100 is %p', async (number, expected) => {
      expect(numberMatch(numberSearchValue, number)).toBe(expected);
    });
  });
});
