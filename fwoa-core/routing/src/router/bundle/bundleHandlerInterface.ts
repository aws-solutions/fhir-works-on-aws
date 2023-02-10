/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { KeyValueMap, RequestContext } from '@aws/fhir-works-on-aws-interface';

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
