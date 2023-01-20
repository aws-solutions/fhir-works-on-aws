/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/prefer-default-export
export class InvalidResourceError extends Error {
  readonly isInvalidResourceError: boolean;

  // eslint-disable-next-line @typescript-eslint/typedef
  constructor(message = 'Invalid Resource') {
    // Node Error class requires passing a string message to the parent class
    super(message);
    Object.setPrototypeOf(this, InvalidResourceError.prototype);
    this.isInvalidResourceError = true;
    this.name = this.constructor.name;
  }
}
export function isInvalidResourceError(error: unknown): error is InvalidResourceError {
  return Boolean(error) && (error as InvalidResourceError).isInvalidResourceError === true;
}
