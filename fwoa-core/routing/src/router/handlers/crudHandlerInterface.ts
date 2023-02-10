/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { KeyValueMap, RequestContext } from '@aws/fhir-works-on-aws-interface';

export default interface CrudHandlerInterface {
  create(resourceType: string, resource: any, tenantId?: string): any;
  update(resourceType: string, id: string, resource: any, tenantId?: string): any;
  patch(resourceType: string, id: string, resource: any, tenantId?: string): any;
  read(resourceType: string, id: string, tenantId?: string): any;
  vRead(resourceType: string, id: string, vid: string, tenantId?: string): any;
  delete(resourceType: string, id: string, tenantId?: string): any;
  typeSearch(
    resourceType: string,
    searchParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ): any;
  typeHistory(
    resourceType: string,
    searchParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ): any;
  instanceHistory(
    resourceType: string,
    id: string,
    searchParams: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ): any;
}
