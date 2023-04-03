/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  captureFullUrlParts,
  dateTimeWithTimeZoneRegExp,
  captureResourceTypeRegExp,
  captureResourceIdRegExp
} from './regExpressions';

describe('captureFullUrlParts', () => {
  test('Capture rootUrl, resourceType, id, versionId', () => {
    const url = 'https://API_URL.com/Observation/123/_history/1';

    const actualMatch = url.match(captureFullUrlParts);

    const expectedMatch = [
      'https://API_URL.com/Observation/123/_history/1',
      'https://API_URL.com/',
      'Observation',
      '123',
      '/_history/1'
    ];

    for (let i = 0; i < expectedMatch.length; i += 1) {
      // @ts-ignore
      expect(actualMatch[i]).toEqual(expectedMatch[i]);
    }
  });

  test('Capture rootUrl, resourceType, id', () => {
    const url = 'https://API_URL.com/Observation/123';

    const actualMatch = url.match(captureFullUrlParts);

    const expectedMatch = [
      'https://API_URL.com/Observation/123',
      'https://API_URL.com/',
      'Observation',
      '123',
      undefined
    ];

    // @ts-ignore
    expect([...actualMatch]).toEqual([...expectedMatch]);
  });

  test('Capture resourceType, id', () => {
    const url = 'Observation/123';

    const actualMatch = url.match(captureFullUrlParts);

    const expectedMatch = ['Observation/123', undefined, 'Observation', '123', undefined];

    // @ts-ignore
    expect([...actualMatch]).toEqual([...expectedMatch]);
  });

  test('dateTimeWithTimeZoneRegExp', () => {
    const utcTimeZone = '2020-09-02T00:00:00Z';
    const estTimeZone = '2020-09-02T00:00:00-05:00';
    const invalidUtcTimeZone = '2020-09-02T00:00:00R';
    const timeWithoutTimeZone = '2020-09-02T00:00:00';
    const invalidStringTimeStart = '/2020-09-02T00:00:00Z';
    const invalidStringTimeEnd = '2020-09-02T00:00:00Z"';
    const invalidStringTimeMid = '2020-09-02/T00:00:00Z';

    expect(dateTimeWithTimeZoneRegExp.test(utcTimeZone)).toBeTruthy();
    expect(dateTimeWithTimeZoneRegExp.test(estTimeZone)).toBeTruthy();
    expect(dateTimeWithTimeZoneRegExp.test(invalidUtcTimeZone)).toBeFalsy();
    expect(dateTimeWithTimeZoneRegExp.test(timeWithoutTimeZone)).toBeFalsy();
    expect(dateTimeWithTimeZoneRegExp.test(invalidStringTimeStart)).toBeFalsy();
    expect(dateTimeWithTimeZoneRegExp.test(invalidStringTimeEnd)).toBeFalsy();
    expect(dateTimeWithTimeZoneRegExp.test(invalidStringTimeMid)).toBeFalsy();
  });
});

describe('captureResourceTypeRegExp', () => {
  test('Success match', () => {
    const resourceString = `Patient/12345678`;
    const actualMatch = resourceString.match(captureResourceTypeRegExp);

    const expectedMatch = ['Patient/12345678', 'Patient'];

    for (let i = 0; i < expectedMatch.length; i += 1) {
      // @ts-ignore
      expect(actualMatch[i]).toEqual(expectedMatch[i]);
    }
  });
  test('Success match with initial slash', () => {
    const resourceString = `/Patient/12345678`;
    const actualMatch = resourceString.match(captureResourceTypeRegExp);

    const expectedMatch = ['/Patient/12345678', 'Patient'];

    for (let i = 0; i < expectedMatch.length; i += 1) {
      // @ts-ignore
      expect(actualMatch[i]).toEqual(expectedMatch[i]);
    }
  });
  test('Extra long resource type fail to match', () => {
    const resourceString = `${'Patient'.repeat(30)}/12345678`;
    expect(resourceString.match(captureResourceTypeRegExp)).toBeNull();
  });
});

describe('captureResourceIdRegExp', () => {
  test('Success match with initial slash', () => {
    const resourceString = `/Patient/12345678`;
    const actualMatch = resourceString.match(captureResourceIdRegExp);

    const expectedMatch = ['/Patient/12345678', '12345678'];

    for (let i = 0; i < expectedMatch.length; i += 1) {
      // @ts-ignore
      expect(actualMatch[i]).toEqual(expectedMatch[i]);
    }
  });
  test('Success match', () => {
    const resourceString = `Patient/12345678`;
    const actualMatch = resourceString.match(captureResourceIdRegExp);

    const expectedMatch = ['Patient/12345678', '12345678'];

    for (let i = 0; i < expectedMatch.length; i += 1) {
      // @ts-ignore
      expect(actualMatch[i]).toEqual(expectedMatch[i]);
    }
  });
  test('Extra long resource id fail to match', () => {
    const resourceString = `Patient/${'12345678'.repeat(14)}`;
    expect(resourceString.match(captureResourceTypeRegExp)).toBeNull();
  });
});
