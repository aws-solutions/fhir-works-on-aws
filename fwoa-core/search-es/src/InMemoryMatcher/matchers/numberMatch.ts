/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { NumberSearchValue } from '../../FhirQueryParser';
import { applyPrefixRulesToRange, compareNumberToRange } from './common/numericComparison';

// eslint-disable-next-line import/prefer-default-export
export const numberMatch = (value: NumberSearchValue, resourceValue: any): boolean => {
  const { prefix, implicitRange, number } = value;

  if (typeof resourceValue !== 'number') {
    return false;
  }

  return compareNumberToRange(prefix, applyPrefixRulesToRange(prefix, number, implicitRange), resourceValue);
};
