/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';

export const parseSearchModifiers = (
  searchParameter: string
): {
  parameterName: string;
  modifier?: string;
} => {
  const modifier = searchParameter.split(':');
  // split was unsuccessful, there is no modifier
  if (modifier.length === 1) {
    return { parameterName: modifier[0], modifier: undefined };
  }
  return { parameterName: modifier[0], modifier: modifier[1] };
};

export const normalizeQueryParams = (queryParams: any): { [key: string]: string[] } => {
  const normalizedQueryParams: { [key: string]: string[] } = {};

  Object.entries(queryParams).forEach(([searchParameter, searchValue]) => {
    if (typeof searchValue === 'string') {
      normalizedQueryParams[searchParameter] = [searchValue];
      return;
    }
    if (Array.isArray(searchValue) && searchValue.every((s) => typeof s === 'string')) {
      normalizedQueryParams[searchParameter] = searchValue;
      return;
    }

    // This may occur if the router has advanced querystring parsing enabled
    // e.g. {{API_URL}}/Patient?name[key]=Smith may be parsed into {"name":{"key":"Smith"}}
    throw new InvalidSearchParameterError(`Invalid search parameter: '${searchParameter}'`);
  });

  return normalizedQueryParams;
};

export const isChainedParameter = (parameterKey: string) => {
  const regex = new RegExp('[A-Za-z][.][A-Za-z]');
  return regex.test(parameterKey);
};
