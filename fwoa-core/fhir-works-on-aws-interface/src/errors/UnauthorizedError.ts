/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/prefer-default-export
export class UnauthorizedError extends Error {
  readonly isUnauthorizedError: boolean;

  constructor(message = 'Forbidden') {
    // Node Error class requires passing a string message to the parent class
    super(message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
    this.name = this.constructor.name;
    this.isUnauthorizedError = true;
  }
}
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return Boolean(error) && (error as UnauthorizedError).isUnauthorizedError === true;
}
