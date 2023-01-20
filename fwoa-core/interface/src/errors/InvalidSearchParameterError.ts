/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/prefer-default-export
export class InvalidSearchParameterError extends Error {
  readonly isInvalidSearchParameterError: boolean;

  constructor(message: string) {
    // Node Error class requires passing a string message to the parent class
    super(message);
    Object.setPrototypeOf(this, InvalidSearchParameterError.prototype);
    this.isInvalidSearchParameterError = true;
    this.name = this.constructor.name;
  }
}
export function isInvalidSearchParameterError(error: unknown): error is InvalidSearchParameterError {
  return Boolean(error) && (error as InvalidSearchParameterError).isInvalidSearchParameterError === true;
}
