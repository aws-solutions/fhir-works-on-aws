/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
export class TooManyConcurrentExportRequestsError extends Error {
  readonly isTooManyConcurrentExportRequestsError: boolean;

  // eslint-disable-next-line @typescript-eslint/typedef
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
