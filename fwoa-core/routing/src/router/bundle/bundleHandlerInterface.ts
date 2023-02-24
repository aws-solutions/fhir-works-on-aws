/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { KeyValueMap, RequestContext } from 'test-e3776dcf-341e-4fc7-bfc6-762082f295fa';

export default interface BundleHandlerInterface {
  processBatch(
    resource: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ): any;
  processTransaction(
    resource: any,
    userIdentity: KeyValueMap,
    requestContext: RequestContext,
    serverUrl: string,
    tenantId?: string
  ): any;
}
