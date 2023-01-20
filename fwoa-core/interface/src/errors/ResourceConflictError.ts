/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/prefer-default-export
export class ResourceConflictError extends Error {
  readonly isResourceConflictError: boolean;

  readonly resourceType: string;

  readonly id: string;

  constructor(resourceType: string, id: string, message?: string) {
    const msg = message || `Resource ${resourceType}/${id} is conflicting`;
    // Node Error class requires passing a string message to the parent class.
    super(msg);
    Object.setPrototypeOf(this, ResourceConflictError.prototype);
    this.resourceType = resourceType;
    this.id = id;
    this.name = this.constructor.name;
    this.isResourceConflictError = true;
  }
}
export function isResourceConflictError(error: unknown): error is ResourceConflictError {
  return Boolean(error) && (error as ResourceConflictError).isResourceConflictError === true;
}
