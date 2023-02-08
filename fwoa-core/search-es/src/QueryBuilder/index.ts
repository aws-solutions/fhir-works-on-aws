/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { TypeSearchRequest } from '@aws/fhir-works-on-aws-interface';
import { isEmpty } from 'lodash';
import {
  DateSearchValue,
  NumberSearchValue,
  ParsedFhirQueryParams,
  parseQuery,
  QuantitySearchValue,
  QueryParam,
  TokenSearchValue
} from '../FhirQueryParser';
import { ReferenceSearchValue } from '../FhirQueryParser/typeParsers/referenceParser';
import {
  CompiledSearchParam,
  FHIRSearchParametersRegistry,
  SearchParam
} from '../FHIRSearchParametersRegistry';
import { dateQuery } from './typeQueries/dateQuery';
import { numberQuery } from './typeQueries/numberQuery';
import { quantityQuery } from './typeQueries/quantityQuery';
import { referenceQuery } from './typeQueries/referenceQuery';
import { stringQuery } from './typeQueries/stringQuery';
import { tokenQuery } from './typeQueries/tokenQuery';
import { uriQuery } from './typeQueries/uriQuery';

function typeQueryWithConditions(
  searchParam: SearchParam,
  compiledSearchParam: CompiledSearchParam,
  searchValue: unknown,
  useKeywordSubFields: boolean,
  baseUrl: string,
  modifier?: string
): any {
  let typeQuery: any;
  switch (searchParam.type) {
    case 'string':
      typeQuery = stringQuery(compiledSearchParam, searchValue as string, modifier);
      break;
    case 'date':
      typeQuery = dateQuery(compiledSearchParam, searchValue as DateSearchValue, modifier);
      break;
    case 'token':
      typeQuery = tokenQuery(
        compiledSearchParam,
        searchValue as TokenSearchValue,
        useKeywordSubFields,
        modifier
      );
      break;
    case 'number':
      typeQuery = numberQuery(compiledSearchParam, searchValue as NumberSearchValue, modifier);
      break;
    case 'quantity':
      typeQuery = quantityQuery(
        compiledSearchParam,
        searchValue as QuantitySearchValue,
        useKeywordSubFields,
        modifier
      );
      break;
    case 'reference':
      typeQuery = referenceQuery(
        compiledSearchParam,
        searchValue as ReferenceSearchValue,
        useKeywordSubFields,
        baseUrl,
        searchParam.name,
        searchParam.target,
        modifier
      );
      break;
    case 'uri':
      typeQuery = uriQuery(compiledSearchParam, searchValue as string, useKeywordSubFields, modifier);
      break;
    case 'composite':
    case 'special':
    default:
      typeQuery = stringQuery(compiledSearchParam, searchValue as string, modifier);
  }
  // In most cases conditions are used for fields that are an array of objects
  // Ideally we should be using a nested query, but that'd require to update the index mappings.
  //
  // Simply using an array of bool.must is good enough for most cases. The result will contain the correct documents, however it MAY contain additional documents
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/nested.html
  if (compiledSearchParam.condition !== undefined) {
    return {
      bool: {
        must: [
          typeQuery,
          {
            multi_match: {
              fields: [compiledSearchParam.condition[0], `${compiledSearchParam.condition[0]}.*`],
              query: compiledSearchParam.condition[2],
              lenient: true
            }
          }
        ]
      }
    };
  }
  return typeQuery;
}

function searchParamQuery(
  searchParam: SearchParam,
  splitSearchValue: unknown[],
  useKeywordSubFields: boolean,
  baseUrl: string,
  modifier?: string
): any {
  // const splitSearchValue = getOrSearchValues(searchValue);
  let queryList = [];
  for (let i = 0; i < splitSearchValue.length; i += 1) {
    queryList.push(
      searchParam.compiled.map((compiled) =>
        typeQueryWithConditions(
          searchParam,
          compiled,
          splitSearchValue[i],
          useKeywordSubFields,
          baseUrl,
          modifier
        )
      )
    );
  }
  // flatten array of arrays of results into one array with results
  queryList = queryList.flat(1);
  if (queryList.length === 1) {
    return queryList[0];
  }
  return {
    bool: {
      should: queryList
    }
  };
}

// eslint-disable-next-line import/prefer-default-export
export const buildQueryForAllSearchParameters = (
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
  request: TypeSearchRequest,
  searchParams: QueryParam[],
  useKeywordSubFields: boolean,
  additionalFilters: any[] = [],
  chainedParameterQuery: any = {}
): any => {
  const esQuery = searchParams.map((queryParam) => {
    return searchParamQuery(
      queryParam.searchParam,
      queryParam.parsedSearchValues,
      useKeywordSubFields,
      request.baseUrl,
      queryParam.modifier
    );
  });

  if (!isEmpty(chainedParameterQuery)) {
    const parsedFhirQueryForChainedParams: ParsedFhirQueryParams = parseQuery(
      fhirSearchParametersRegistry,
      request.resourceType,
      chainedParameterQuery
    );
    const ESChainedParamQuery = parsedFhirQueryForChainedParams.searchParams.map((queryParam) => {
      return searchParamQuery(
        queryParam.searchParam,
        queryParam.parsedSearchValues,
        useKeywordSubFields,
        request.baseUrl,
        queryParam.modifier
      );
    });
    esQuery.push({
      bool: {
        should: ESChainedParamQuery
      }
    });
  }
  return {
    bool: {
      filter: additionalFilters,
      must: esQuery
    }
  };
};

export { buildSortClause } from './sort';
