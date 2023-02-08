/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { isEmpty } from 'lodash';
import { QuantitySearchValue } from '../../FhirQueryParser';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';
import { prefixRangeNumber } from './common/prefixRange';

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export const quantityQuery = (
  compiledSearchParam: CompiledSearchParam,
  value: QuantitySearchValue,
  useKeywordSubFields: boolean,
  modifier?: string
): any => {
  if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
    throw new InvalidSearchParameterError(`Unsupported quantity search modifier: ${modifier}`);
  }
  const { prefix, implicitRange, number, system, code } = value;
  const queries = [prefixRangeNumber(prefix, number, implicitRange, `${compiledSearchParam.path}.value`)];
  const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

  if (!isEmpty(system) && !isEmpty(code)) {
    queries.push({
      multi_match: {
        fields: [`${compiledSearchParam.path}.code${keywordSuffix}`],
        query: code,
        lenient: true
      }
    });

    queries.push({
      multi_match: {
        fields: [`${compiledSearchParam.path}.system${keywordSuffix}`],
        query: system,
        lenient: true
      }
    });
  } else if (!isEmpty(code)) {
    // when there is no system, search either the code (code) or the stated human unit (unit)
    // https://www.hl7.org/fhir/search.html#quantity
    queries.push({
      multi_match: {
        fields: [
          `${compiledSearchParam.path}.code${keywordSuffix}`,
          `${compiledSearchParam.path}.unit${keywordSuffix}`
        ],
        query: code,
        lenient: true
      }
    });
  }

  if (queries.length === 1) {
    return queries[0];
  }
  return {
    bool: {
      must: queries
    }
  };
};
