/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { compareNumberToRange, compareRanges } from './numericComparison';

const prefixes = ['ne', 'eq', 'lt', 'le', 'gt', 'ge', 'sa', 'eb', 'ap'];

describe('compareNumberToRange', () => {
  const resourceValue = 10;
  const ranges = [
    [8, 9],
    [9, 10],
    [9, 11],
    [10, 11],
    [11, 12]
  ];
  test.each(prefixes)('%p', (prefix) => {
    const results = ranges.map(
      ([start, end]) =>
        `(${resourceValue}) ${prefix} (${start}, ${end}) is ${compareNumberToRange(
          prefix,
          { start, end },
          resourceValue
        )}`
    );

    expect(results).toMatchSnapshot();
  });
});

describe('compareRanges', () => {
  const resourceRange = {
    lowerBound: 10,
    upperBound: 20
  };

  const ranges = [
    [8, 9],
    [9, 10],
    [9, 15],
    [9, 20],
    [9, 21],
    [10, 15],
    [10, 20],
    [10, 21],
    [11, 19],
    [15, 20],
    [15, 21],
    [20, 21],
    [21, 22]
  ];

  console.log(ranges);

  test.each(prefixes)('%p', (prefix) => {
    const results = ranges.map(
      ([start, end]) =>
        `(${resourceRange.lowerBound}, ${
          resourceRange.upperBound
        }) ${prefix} (${start}, ${end}) is ${compareRanges(
          prefix,
          { start, end },
          { start: resourceRange.lowerBound, end: resourceRange.upperBound }
        )}`
    );

    expect(results).toMatchSnapshot();
  });
});
