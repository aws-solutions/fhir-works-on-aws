/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { TypeOperation, SystemOperation } from '@aws/fhir-works-on-aws-interface';

export interface Rule {
  operations: (TypeOperation | SystemOperation)[];
  resources: string[]; // This will be able to support any type of resource
}

export interface GroupRule {
  [groupName: string]: Rule;
}

export interface RBACConfig {
  version: number;
  groupRules: GroupRule;
}
