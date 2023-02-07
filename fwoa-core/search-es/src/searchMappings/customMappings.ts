/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

/**
 * This mappings will be applied to ALL resource types (they override any existing mappings).
 */
// eslint-disable-next-line import/prefer-default-export
export const CUSTOM_MAPPINGS = {
  id: {
    type: 'keyword',
    index: true
  },
  resourceType: {
    type: 'keyword',
    index: true
  },
  _references: {
    type: 'keyword',
    index: true
  },
  documentStatus: {
    type: 'keyword',
    index: true
  },
  _tenantId: {
    type: 'keyword',
    index: true
  }
};
