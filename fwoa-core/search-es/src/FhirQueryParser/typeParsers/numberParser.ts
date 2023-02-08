/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { parseNumber } from '../../QueryBuilder/typeQueries/common/number';

export interface NumberSearchValue {
  prefix: string;
  number: number;
  implicitRange: {
    start: number;
    end: number;
  };
}

const NUMBER_SEARCH_PARAM_REGEX = /^(?<prefix>eq|ne|lt|gt|ge|le|sa|eb|ap)?(?<numberString>[\d.+-eE]+)$/;
export const parseNumberSearchValue = (param: string): NumberSearchValue => {
  const match = param.match(NUMBER_SEARCH_PARAM_REGEX);
  if (match === null) {
    throw new InvalidSearchParameterError(`Invalid number search parameter: ${param}`);
  }

  const { numberString } = match.groups!;

  // If no prefix is present, the prefix eq is assumed.
  // https://www.hl7.org/fhir/search.html#prefix
  const prefix = match.groups!.prefix ?? 'eq';

  const fhirNumber = parseNumber(numberString);
  return {
    prefix,
    ...fhirNumber
  };
};
