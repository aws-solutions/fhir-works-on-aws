/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface ResourceCapability {
  type: string;
  supportedProfile: string[];
}

export interface ResourceCapabilityStatement {
  [resourceType: string]: ResourceCapability;
}
