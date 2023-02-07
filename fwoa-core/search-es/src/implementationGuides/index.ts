/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ImplementationGuides } from '@aws/fhir-works-on-aws-interface';
import { uniqBy } from 'lodash';
import { Parser, Grammar } from 'nearley';
import getComponentLogger from '../loggerBuilder';
import fhirPathGrammar from './reducedFHIRPath';
import xPathGrammar from './reducedXPath';

const logger = getComponentLogger();

/**
 * Based on the FHIR SearchParameter. This type only includes the fields that are required for the compile process.
 * See: https://www.hl7.org/fhir/searchparameter.html
 */
interface FhirSearchParam {
  resourceType: 'SearchParameter';
  url: string;
  name: string;
  code: string;
  description: string;
  base: string[];
  type: string;
  expression?: string;
  xpath?: string;
  target?: string[];
}

const isFhirSearchParam = (x: any): x is FhirSearchParam => {
  return (
    typeof x === 'object' &&
    x &&
    x.resourceType === 'SearchParameter' &&
    typeof x.url === 'string' &&
    typeof x.name === 'string' &&
    typeof x.code === 'string' &&
    typeof x.description === 'string' &&
    Array.isArray(x.base) &&
    x.base.every((y: any) => typeof y === 'string') &&
    typeof x.type === 'string' &&
    (x.expression === undefined || typeof x.expression === 'string') &&
    (x.xpath === undefined || typeof x.xpath === 'string') &&
    (x.target === undefined || (Array.isArray(x.target) && x.target.every((y: any) => typeof y === 'string')))
  );
};

// validates any semantic necessities of FHIR Search Parameters
const validateSearchParam = (param: FhirSearchParam) => {
  if (param.type === 'reference') {
    if (!param.target || param.target?.length === 0) {
      throw new Error(
        `Search Parameter of type reference must have a specified target. Error in ${JSON.stringify(
          param,
          null,
          2
        )}`
      );
    }
  }
};

const UNSUPPORTED_SEARCH_PARAMS = [
  'http://hl7.org/fhir/SearchParameter/Bundle-composition', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array
  'http://hl7.org/fhir/SearchParameter/Bundle-message', // Uses "Bundle.entry[0]". We have no way of searching the nth element of an array

  'http://hl7.org/fhir/SearchParameter/Patient-deceased', // Does not define a proper path "Patient.deceased.exists() and Patient.deceased != false"

  'http://hl7.org/fhir/SearchParameter/Organization-phonetic', // Requires custom code for phonetic matching
  'http://hl7.org/fhir/SearchParameter/individual-phonetic' // Requires custom code for phonetic matching
];

const isParamSupported = (searchParam: FhirSearchParam) => {
  if (UNSUPPORTED_SEARCH_PARAMS.includes(searchParam.url)) {
    return false;
  }

  if (searchParam.type === 'composite') {
    logger.warn(`search parameters of type "composite" are not supported. Skipping ${searchParam.url}`);
    return false;
  }

  if (searchParam.type === 'special') {
    // requires custom code. i.e. Location.near is supposed to do a geospatial search.
    logger.warn(`search parameters of type "special" are not supported. Skipping ${searchParam.url}`);
    return false;
  }

  if (!searchParam.expression || !searchParam.xpath) {
    logger.warn(
      `search parameters without both a FHIRPath and an XPath expression are not supported. Skipping ${searchParam.url}`
    );
    return false;
  }
  return true;
};

function mergeParserResults(primaryParser: Parser, secondaryParser: Parser) {
  // this takes advantage of the fact that _.uniq traverses the array in order, giving primaryParser an higher priority
  return uniqBy(
    [
      ...primaryParser.results[0], // nearley returns an array of results. The array always has exactly one element for non ambiguous grammars
      ...secondaryParser.results[0]
    ],
    (x) => `${x.resourceType}.${x.path}`
  );
}

/**
 * Compiles the contents of an Implementation Guide into an internal representation used to build Elasticsearch queries.
 *
 * @param searchParams - an array of FHIR SearchParameters. See: https://www.hl7.org/fhir/searchparameter.html
 */
const compile = async (searchParams: any[]): Promise<any> => {
  const validFhirSearchParams: FhirSearchParam[] = [];
  searchParams.forEach((s) => {
    if (isFhirSearchParam(s)) {
      validateSearchParam(s);
      validFhirSearchParams.push(s);
    } else {
      throw new Error(`The following input is not a search parameter: ${JSON.stringify(s, null, 2)}`);
    }
  });

  const compiledSearchParams = validFhirSearchParams
    .filter(isParamSupported)
    .map((searchParam) => {
      const fhirPathparser = new Parser(Grammar.fromCompiled(fhirPathGrammar));
      const xPathParser = new Parser(Grammar.fromCompiled(xPathGrammar));
      try {
        fhirPathparser.feed(searchParam.expression!);
        xPathParser.feed(searchParam.xpath!);
      } catch (e) {
        throw new Error(
          `The expressions for the following search parameter could not be parsed:
${JSON.stringify(
  {
    name: searchParam.name,
    url: searchParam.url,
    expression: searchParam.expression,
    xpath: searchParam.xpath
  },
  null,
  2
)}
Either it is an invalid FHIRPath expression or it is using FHIRPath features not supported by this compiler.
Original error message was: ${(e as any).message}`
        );
      }

      // fhirPath is given higher priority since it sometimes has more specific conditions due to supporting the "resolve()" expression
      // i.e. for http://hl7.org/fhir/SearchParameter/Invoice-patient the expressions are:
      // Invoice.subject.where(resolve() is Patient)
      // f:Invoice/f:subject
      const compiled = mergeParserResults(fhirPathparser, xPathParser);

      return {
        ...searchParam,
        compiled
      };
    })
    .flatMap((searchParam) => {
      return searchParam.base.map((base: any) => ({
        // Explicitly returning 'code' as 'name'. For the base FHIR resources code and name happen to be the same.
        // This is not true for search parameters from Implementation Guides. However, all the FHIR documentation and
        // the capability statement use "name" to refer to the value of "code"
        name: searchParam.code,
        url: searchParam.url,
        type: searchParam.type,
        description: searchParam.description,
        base,
        target: searchParam.target,
        compiled: searchParam.compiled.filter((x: any) => x.resourceType === base)
      }));
    });

  return compiledSearchParams;
};

// eslint-disable-next-line import/prefer-default-export
export const SearchImplementationGuides: ImplementationGuides = {
  compile
};
