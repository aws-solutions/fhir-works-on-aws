/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';

export interface TokenSearchValue {
  system?: string;
  code?: string;
  explicitNoSystemProperty: boolean;
}

// eslint-disable-next-line import/prefer-default-export
export const parseTokenSearchValue = (param: string): TokenSearchValue => {
  if (param === '|') {
    throw new InvalidSearchParameterError(`Invalid token search parameter: ${param}`);
  }
  const parts = param.split('|');
  if (parts.length > 2) {
    throw new InvalidSearchParameterError(`Invalid token search parameter: ${param}`);
  }
  let system;
  let code;
  let explicitNoSystemProperty = false;
  if (parts.length === 1) {
    [code] = parts;
  } else {
    [system, code] = parts;
    if (system === '') {
      system = undefined;
      explicitNoSystemProperty = true;
    }
    if (code === '') {
      code = undefined;
    }
  }
  return { system, code, explicitNoSystemProperty };
};
