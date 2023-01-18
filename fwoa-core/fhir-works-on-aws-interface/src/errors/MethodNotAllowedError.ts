/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/prefer-default-export
export class MethodNotAllowedError extends Error {
  readonly isMethodNotAllowed: boolean;

  // eslint-disable-next-line @typescript-eslint/typedef
  constructor(message = 'Method Not Allowed') {
    // Node Error class requires passing a string message to the parent class
    super(message);
    Object.setPrototypeOf(this, MethodNotAllowedError.prototype);
    this.name = this.constructor.name;
    this.isMethodNotAllowed = true;
  }
}
export function isMethodNotAllowed(error: unknown): error is MethodNotAllowedError {
  return Boolean(error) && (error as MethodNotAllowedError).isMethodNotAllowed === true;
}
