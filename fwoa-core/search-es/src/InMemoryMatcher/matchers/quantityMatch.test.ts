/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { QuantitySearchValue } from '../../FhirQueryParser';
import { quantityMatch } from './quantityMatch';

describe('quantityMatch', () => {
  test('only number', () => {
    const quantitySearchValue: QuantitySearchValue = {
      prefix: 'eq',
      system: '',
      code: '',
      number: 10,
      implicitRange: { start: 9.5, end: 10.5 }
    };

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'SYSTEM',
        code: 'CODE',
        unit: 'U'
      })
    ).toBe(true);

    expect(
      quantityMatch(quantitySearchValue, {
        value: 999,
        system: 'SYSTEM',
        code: 'CODE',
        unit: 'U'
      })
    ).toBe(false);
  });

  test('system and code', () => {
    const quantitySearchValue: QuantitySearchValue = {
      prefix: 'eq',
      system: 'SYSTEM',
      code: 'CODE',
      number: 10,
      implicitRange: { start: 9.5, end: 10.5 }
    };

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'SYSTEM',
        code: 'CODE',
        unit: 'U'
      })
    ).toBe(true);

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'xxxx',
        code: 'CODE',
        unit: 'U'
      })
    ).toBe(false);

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'SYSTEM',
        code: 'xxxx',
        unit: 'U'
      })
    ).toBe(false);
  });

  test('only code', () => {
    const quantitySearchValue: QuantitySearchValue = {
      prefix: 'eq',
      system: '',
      code: 'CODE',
      number: 10,
      implicitRange: { start: 9.5, end: 10.5 }
    };

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'xxxx',
        code: 'CODE',
        unit: 'U'
      })
    ).toBe(true);

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'xxxx',
        code: 'xxxx',
        unit: 'CODE'
      })
    ).toBe(true);

    expect(
      quantityMatch(quantitySearchValue, {
        value: 10,
        system: 'xxxx',
        code: 'xxxx',
        unit: 'xxxx'
      })
    ).toBe(false);
  });
});
