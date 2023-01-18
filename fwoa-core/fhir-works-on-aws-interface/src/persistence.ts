/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { GenericResponse } from './genericResponse';

export interface CreateResourceRequest {
  resourceType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
  id?: string;
  tenantId?: string;
}

export interface UpdateResourceRequest {
  id: string;
  resourceType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
  vid?: string; // used in version aware update
  tenantId?: string;
}

export interface PatchResourceRequest {
  id: string;
  resourceType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
  vid?: string; // used in version aware patch
  tenantId?: string;
}

export interface ReadResourceRequest {
  id: string;
  resourceType: string;
  tenantId?: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface vReadResourceRequest {
  id: string;
  vid: string;
  resourceType: string;
  tenantId?: string;
}

export interface DeleteResourceRequest {
  id: string;
  resourceType: string;
  tenantId?: string;
}

export interface ConditionalDeleteResourceRequest {
  resourceType: string;
  tenantId?: string;
}

export interface Persistence {
  readonly updateCreateSupported: boolean;

  /**
   * Create a new FHIR resource
   */
  createResource(request: CreateResourceRequest): Promise<GenericResponse>;

  /**
   * Conditionally create a new FHIR resource
   * For conditional information: https://www.hl7.org/fhir/http.html#ccreate
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditionalCreateResource(request: CreateResourceRequest, queryParams: any): Promise<GenericResponse>;

  /**
   * Update a FHIR resource; Note this method may support 'Update as Create' where it is
   * a 'create' that allows the client to supply the resourceId. This behavior should be
   * dependent on the supplied updateCreateSupported parameter
   */
  updateResource(request: UpdateResourceRequest): Promise<GenericResponse>;

  /**
   * Conditionally update a FHIR resource; Note this method may support 'Update as Create' where it is
   * a 'create' that allows the client to supply the resourceId. This behavior should be
   * dependent on the supplied updateCreateSupported parameter
   * For conditional information: https://www.hl7.org/fhir/http.html#cond-update
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditionalUpdateResource(request: UpdateResourceRequest, queryParams: any): Promise<GenericResponse>;

  /**
   * Patch updates specified attributes of the resource.
   * Useful when a client is minimizing bandwidth, or in scenarios with partial resource access
   */
  patchResource(request: PatchResourceRequest): Promise<GenericResponse>;

  /**
   * Conditionally patch attributes of a specified resource.
   * Useful when a client is minimizing bandwidth, or in scenarios with partial resource access
   * For conditional information: https://www.hl7.org/fhir/http.html#patch
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditionalPatchResource(request: PatchResourceRequest, queryParams: any): Promise<GenericResponse>;

  /**
   * Operation that accesses the current contents of a resource
   */
  readResource(request: ReadResourceRequest): Promise<GenericResponse>;

  /**
   * Performs a version specific read of the resource
   */
  vReadResource(request: vReadResourceRequest): Promise<GenericResponse>;

  /**
   * Delete interaction means that subsequent non-version specific reads cannot be found and that the resource is no
   * longer found through search interactions
   *
   * For servers that maintain a version history, the delete interaction does not remove a resource's
   * version history. From a version history respect, deleting a resource is the equivalent of creating
   * a special kind of history entry that has no content and is marked as deleted.
   *
   * NOTE: implementors are free to completely delete the resource and it's history if policy or business rules make this
   * the appropriate action to take.
   */
  deleteResource(request: DeleteResourceRequest): Promise<GenericResponse>;

  /**
   * Delete interaction means that subsequent non-version specific reads cannot be found and that the resource is no
   * longer found through search interactions
   *
   * For servers that maintain a version history, the delete interaction does not remove a resource's
   * version history. From a version history respect, deleting a resource is the equivalent of creating
   * a special kind of history entry that has no content and is marked as deleted.
   *
   * For conditional information: https://www.hl7.org/fhir/http.html#3.1.0.7.1
   *
   * NOTE: implementors are free to completely delete the resource and it's history if policy or business rules make this
   * the appropriate action to take.
   */
  conditionalDeleteResource(
    request: ConditionalDeleteResourceRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryParams: any
  ): Promise<GenericResponse>;

  /**
   * Returns an array of all active Subscriptions.
   * If tenantId is supplied, this method will only return Subscriptions owned by that tenant.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActiveSubscriptions(params: { tenantId?: string }): Promise<Record<string, any>[]>;
}
