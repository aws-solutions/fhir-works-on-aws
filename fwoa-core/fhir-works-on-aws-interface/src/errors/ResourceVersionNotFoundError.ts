/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line import/prefer-default-export
export class ResourceVersionNotFoundError extends Error {
  readonly isResourceVersionNotFoundError: boolean;

  readonly resourceType: string;

  readonly id: string;

  readonly version: string;

  constructor(resourceType: string, id: string, version: string, message?: string) {
    const msg = message || `Version "${version}" is not valid for resource ${resourceType}/${id}`;
    // Node Error class requires passing a string message to the parent class
    super(msg);
    Object.setPrototypeOf(this, ResourceVersionNotFoundError.prototype);
    this.resourceType = resourceType;
    this.id = id;
    this.version = version;
    this.name = this.constructor.name;
    this.isResourceVersionNotFoundError = true;
  }
}
export function isResourceVersionNotFoundError(error: unknown): error is ResourceVersionNotFoundError {
  return Boolean(error) && (error as ResourceVersionNotFoundError).isResourceVersionNotFoundError === true;
}
