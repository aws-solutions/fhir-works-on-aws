/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/prefer-default-export
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
export class BadRequestError extends Error {
  readonly isBadRequestError: boolean;

  // eslint-disable-next-line @typescript-eslint/typedef
  constructor(message = 'Bad Request') {
    // Node Error class requires passing a string message to the parent class
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
    this.name = this.constructor.name;
    this.isBadRequestError = true;
  }
}
export function isBadRequestError(error: unknown): error is BadRequestError {
  return Boolean(error) && (error as BadRequestError).isBadRequestError === true;
}
