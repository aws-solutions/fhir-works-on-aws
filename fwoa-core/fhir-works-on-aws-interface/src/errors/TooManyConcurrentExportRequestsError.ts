/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export class TooManyConcurrentExportRequestsError extends Error {
  readonly isTooManyConcurrentExportRequestsError: boolean;

  constructor(message = 'Too Many Concurrent Export Requests') {
    // Node Error class requires passing a string message to the parent class
    super(message);
    Object.setPrototypeOf(this, TooManyConcurrentExportRequestsError.prototype);
    this.isTooManyConcurrentExportRequestsError = true;
    this.name = this.constructor.name;
  }
}
export function isTooManyConcurrentExportRequestsError(
  error: unknown
): error is TooManyConcurrentExportRequestsError {
  return (
    Boolean(error) &&
    (error as TooManyConcurrentExportRequestsError).isTooManyConcurrentExportRequestsError === true
  );
}
