/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import {
  DateSearchValue,
  NumberSearchValue,
  ParsedFhirQueryParams,
  QuantitySearchValue,
  QueryParam,
  StringLikeSearchValue,
  TokenSearchValue
} from '../FhirQueryParser';
import { ReferenceSearchValue } from '../FhirQueryParser/typeParsers/referenceParser';
import { CompiledSearchParam } from '../FHIRSearchParametersRegistry';
import { getAllValuesForFHIRPath } from '../getAllValuesForFHIRPath';
import { dateMatch } from './matchers/dateMatch';
import { numberMatch } from './matchers/numberMatch';
import { quantityMatch } from './matchers/quantityMatch';
import { referenceMatch } from './matchers/referenceMatcher';
import { stringMatch } from './matchers/stringMatch';
import { tokenMatch } from './matchers/tokenMatch';
import { uriMatch } from './matchers/uriMatch';

const typeMatcher = (
  queryParam: QueryParam,
  compiledSearchParam: CompiledSearchParam,
  searchValue: unknown,
  resourceValue: any,
  { fhirServiceBaseUrl }: { fhirServiceBaseUrl?: string } = {}
): boolean => {
  const { searchParam, modifier } = queryParam;

  switch (searchParam.type) {
    case 'string':
      return stringMatch(compiledSearchParam, searchValue as StringLikeSearchValue, resourceValue, modifier);
    case 'date':
      return dateMatch(searchValue as DateSearchValue, resourceValue);
    case 'number':
      return numberMatch(searchValue as NumberSearchValue, resourceValue);
    case 'quantity':
      return quantityMatch(searchValue as QuantitySearchValue, resourceValue);
    case 'reference':
      return referenceMatch(searchValue as ReferenceSearchValue, resourceValue, {
        target: searchParam.target,
        fhirServiceBaseUrl
      });
    case 'token':
      return tokenMatch(searchValue as TokenSearchValue, resourceValue);
    case 'composite':
      break;
    case 'special':
      break;
    case 'uri':
      return uriMatch(searchValue as StringLikeSearchValue, resourceValue);
    default:
      // eslint-disable-next-line no-case-declarations
      const exhaustiveCheck: never = searchParam.type;
      return exhaustiveCheck;
  }

  return false;
};

function evaluateCompiledCondition(condition: string[] | undefined, resource: any): boolean {
  if (condition === undefined) {
    return true;
  }

  const resourceValues = getAllValuesForFHIRPath(resource, condition[0]);

  if (condition[1] === '=') {
    return resourceValues.some((resourceValue) => resourceValue === condition[2]);
  }

  if (condition[1] === 'resolve') {
    const resourceType = condition[2];
    return resourceValues.some((resourceValue) => {
      const referenceField = resourceValue?.reference;
      return (
        resourceValue?.type === resourceType ||
        (typeof referenceField === 'string' && referenceField.startsWith(`${resourceType}/`))
      );
    });
  }

  return false;
}

function evaluateQueryParam(
  queryParam: QueryParam,
  resource: any,
  { fhirServiceBaseUrl }: { fhirServiceBaseUrl?: string } = {}
): boolean {
  return queryParam.parsedSearchValues.some((parsedSearchValue) =>
    queryParam.searchParam.compiled.some(
      (compiled) =>
        evaluateCompiledCondition(compiled.condition, resource) &&
        getAllValuesForFHIRPath(resource, compiled.path).some((resourceValue) =>
          typeMatcher(queryParam, compiled, parsedSearchValue, resourceValue, {
            fhirServiceBaseUrl
          })
        )
    )
  );
}

/**
 * checks if the given resource is matched by a FHIR search query
 * @param parsedFhirQueryParams - parsed FHIR search query
 * @param resource - FHIR resource to be matched
 * @param options.fhirServiceBaseUrl - URL of the FHIR served where the FHIR resource is located.
 * The URL is used to translate relative references into full URLs and vice versa
 */
// eslint-disable-next-line import/prefer-default-export
export function matchParsedFhirQueryParams(
  parsedFhirQueryParams: ParsedFhirQueryParams,
  resource: any,
  { fhirServiceBaseUrl }: { fhirServiceBaseUrl?: string } = {}
): boolean {
  if (parsedFhirQueryParams.resourceType !== resource?.resourceType) {
    return false;
  }

  return parsedFhirQueryParams.searchParams.every((queryParam) =>
    evaluateQueryParam(queryParam, resource, { fhirServiceBaseUrl })
  );
}
