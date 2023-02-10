/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { TokenSearchValue } from '../../FhirQueryParser';

// eslint-disable-next-line import/prefer-default-export
export const tokenMatch = (searchValue: TokenSearchValue, resourceValue: any): boolean => {
  const { system, code, explicitNoSystemProperty } = searchValue;

  // CodeableConcept may have several Codings
  if (resourceValue?.coding) {
    if (Array.isArray(resourceValue?.coding)) {
      return resourceValue?.coding.some((coding: any) => tokenMatch(searchValue, coding));
    }
    return tokenMatch(searchValue, resourceValue?.coding);
  }

  const codeValues = [
    resourceValue?.code, // Coding
    resourceValue?.value, // Identifier, ContactPoint
    resourceValue // code, uri, string, boolean
  ];

  const systemValue = resourceValue?.system;

  if (explicitNoSystemProperty && systemValue !== undefined) {
    return false;
  }

  if (system !== undefined && systemValue !== system) {
    return false;
  }

  if (
    code !== undefined &&
    codeValues.every((codeValue) => {
      if (typeof codeValue === 'boolean') {
        return (code === 'true' && !codeValue) || (code === 'false' && codeValue);
      }
      return codeValue !== code;
    })
  ) {
    return false;
  }

  return true;
};
