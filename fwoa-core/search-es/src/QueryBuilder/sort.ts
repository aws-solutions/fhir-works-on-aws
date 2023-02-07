/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';

interface SortParameter {
  order: 'asc' | 'desc';
  searchParam: string;
}

export const parseSortParameter = (param: string): SortParameter[] => {
  const parts = param.split(',');
  return parts.map((s) => {
    const order = s.startsWith('-') ? 'desc' : 'asc';
    return {
      order,
      searchParam: s.replace(/^-/, '')
    };
  });
};

const elasticsearchSort = (field: string, order: 'asc' | 'desc') => ({
  [field]: {
    order,
    // unmapped_type makes queries more fault tolerant. Since we are using dynamic mapping there's no guarantee
    // that the mapping exists at query time. This ignores the unmapped field instead of failing
    unmapped_type: 'long'
  }
});

// eslint-disable-next-line import/prefer-default-export
export const buildSortClause = (
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
  resourceType: string,
  sortQueryParam: string | string[]
): any[] => {
  if (Array.isArray(sortQueryParam)) {
    throw new InvalidSearchParameterError('_sort parameter cannot be used multiple times on a search query');
  }
  const sortParams = parseSortParameter(sortQueryParam);

  return sortParams.flatMap((sortParam) => {
    const searchParameter = fhirSearchParametersRegistry.getSearchParameter(
      resourceType,
      sortParam.searchParam
    );
    if (searchParameter === undefined) {
      throw new InvalidSearchParameterError(
        `Unknown _sort parameter value: ${sortParam.searchParam}. Sort parameters values must use a valid Search Parameter`
      );
    }
    if (searchParameter.type !== 'date') {
      throw new InvalidSearchParameterError(
        `Invalid _sort parameter: ${sortParam.searchParam}. Only date type parameters can currently be used for sorting`
      );
    }
    return searchParameter.compiled.flatMap((compiledParam) => {
      return [
        elasticsearchSort(compiledParam.path, sortParam.order),

        // Date search params may target fields of type Period, so we add a sort clause for them.
        // The FHIR spec does not fully specify how to sort by Period, but it makes sense that the most recent
        // record is the one with the most recent "end" date and vice versa.
        elasticsearchSort(
          sortParam.order === 'desc' ? `${compiledParam.path}.end` : `${compiledParam.path}.start`,
          sortParam.order
        )
      ];
    });
  });
};
