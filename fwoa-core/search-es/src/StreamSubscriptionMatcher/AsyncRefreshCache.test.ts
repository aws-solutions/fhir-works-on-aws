/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { AsyncRefreshCache } from './AsyncRefreshCache';

describe('AsyncRefreshCache', () => {
  test('should cache the result of loadFn', async () => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    const loadFn = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve('initial value'))
      .mockReturnValueOnce(Promise.resolve('latest value'));

    const a = new AsyncRefreshCache<string>(loadFn, 1000);

    await expect(a.get()).resolves.toMatchInlineSnapshot(`"initial value"`);
    await expect(a.get()).resolves.toMatchInlineSnapshot(`"initial value"`);
    expect(loadFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    await expect(a.get()).resolves.toMatchInlineSnapshot(`"latest value"`);
    await expect(a.get()).resolves.toMatchInlineSnapshot(`"latest value"`);
    expect(loadFn).toHaveBeenCalledTimes(2);

    a.stop();
  });

  test('should call loadFn periodically', async () => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    const loadFn = jest.fn(async () => 'hello');

    const a = new AsyncRefreshCache<string>(loadFn, 1000);

    expect(loadFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(loadFn).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1000);
    expect(loadFn).toHaveBeenCalledTimes(3);

    a.stop();
  });
});
