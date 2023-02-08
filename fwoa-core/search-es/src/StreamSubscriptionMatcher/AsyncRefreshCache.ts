/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
/**
 * Periodically calls an async fn and keeps its latest response value cached.
 */
// eslint-disable-next-line import/prefer-default-export
export class AsyncRefreshCache<T> {
  private values: Promise<T>;

  // eslint-disable-next-line no-undef
  private readonly interval: NodeJS.Timeout;

  /**
   * @param loadFn - async function to be called periodically
   * @param period - wait time in seconds before calling `loadFn` again
   */
  constructor(loadFn: () => Promise<T>, period = 3000) {
    this.values = loadFn();
    this.interval = setInterval(() => {
      this.values = loadFn();
    }, period);
  }

  async get(): Promise<T> {
    return this.values;
  }

  stop() {
    clearInterval(this.interval);
  }
}
