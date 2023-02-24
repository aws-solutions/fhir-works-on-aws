/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { TypeOperation, SystemOperation } from 'test-e3776dcf-341e-4fc7-bfc6-762082f295fa';

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
