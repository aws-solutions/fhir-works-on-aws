/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { StringLikeSearchValue } from '../../FhirQueryParser';

// eslint-disable-next-line import/prefer-default-export
export const uriMatch = (searchValue: StringLikeSearchValue, resourceValue: any): boolean => {
  return searchValue === resourceValue;
};
