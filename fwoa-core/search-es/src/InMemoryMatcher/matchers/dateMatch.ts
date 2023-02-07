/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { isValid, parseISO } from 'date-fns';
import { DateSearchValue } from '../../FhirQueryParser';

import { compareNumberToRange, compareRanges } from './common/numericComparison';

// eslint-disable-next-line import/prefer-default-export
export const dateMatch = (searchValue: DateSearchValue, resourceValue: any): boolean => {
  const { prefix, range } = searchValue;
  const numericSearchRange = {
    start: range.start.getTime(),
    end: range.end.getTime()
  };

  if (typeof resourceValue === 'string') {
    const parsedDate = parseISO(resourceValue);
    if (!isValid(parsedDate)) {
      return false;
    }

    return compareNumberToRange(prefix, numericSearchRange, parsedDate.getTime());
  }

  if (typeof resourceValue?.start === 'string' && typeof resourceValue?.end === 'string') {
    const startDate = parseISO(resourceValue.start);
    if (!isValid(startDate)) {
      return false;
    }

    const endDate = parseISO(resourceValue.end);
    if (!isValid(endDate)) {
      return false;
    }

    return compareRanges(prefix, numericSearchRange, {
      start: startDate.getTime(),
      end: endDate.getTime()
    });
  }

  return false;
};
