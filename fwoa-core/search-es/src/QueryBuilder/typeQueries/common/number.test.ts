/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { parseNumber } from './number';

describe('parseNumber', () => {
  describe('valid inputs', () => {
    each([
      ['-100', 5e-1],
      ['100', 5e-1],
      ['+100', 5e-1],
      ['10.0', 5e-2],
      ['+10.0', 5e-2],
      ['-10.0', 5e-2],
      ['1e2', 5e1],
      ['+1e2', 5e1],
      ['-1e2', 5e1],
      ['1.0e2', 5],
      ['1.0E2', 5],
      ['5.4', 5e-2],
      ['5.40e-3', 5e-6],
      ['5.4e-3', 5e-5],
      // Below cases  are not truly scientific notation but we allow them since they are valid numbers.
      ['10e1', 5],
      ['100e0', 5e-1],
      ['54.0e-4', 5e-6]
    ]).test('%s', (string: string, delta: number) => {
      const result = parseNumber(string);
      expect(result.number).toBeCloseTo(Number(string), 7);
      expect(result.implicitRange.end).toBeCloseTo(Number(string) + delta, 8);
      expect(result.implicitRange.start).toBeCloseTo(Number(string) - delta, 8);
    });
  });

  describe('invalid inputs', () => {
    each([
      ['not a number at all'],
      ['  100  '],
      ['1.2.3'],
      ['1,2'],
      ['+-1'],
      ['1+1'],
      ['1.3e12xx'],
      ['1.3a12']
    ]).test('%s', (string: string) => {
      expect(() => parseNumber(string)).toThrow(InvalidSearchParameterError);
    });
  });
});
