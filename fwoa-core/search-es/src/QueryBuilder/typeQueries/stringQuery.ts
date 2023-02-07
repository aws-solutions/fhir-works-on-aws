/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const escapeQueryString = (string: string) => {
  return string.replace(/\//g, '\\/');
};

const SUPPORTED_MODIFIERS: string[] = ['exact', 'contains'];

// eslint-disable-next-line import/prefer-default-export
export function stringQuery(compiled: CompiledSearchParam, value: string, modifier?: string): any {
  if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
    throw new InvalidSearchParameterError(`Unsupported string search modifier: ${modifier}`);
  }

  if (modifier === 'contains') {
    const fields = [`${compiled.path}`];

    if (compiled.path === 'name') {
      // name is a special parameter.
      // name.* cannot be used in wildcard queries so we specify the fields to search.
      fields.push('name.family', 'name.given', 'name.text', 'name.prefix', 'name.suffix');
    }

    if (compiled.path === 'address') {
      // address is a special parameter.
      // address.* cannot be used in wildcard queries so we specify the fields to search.
      fields.push(
        'address.city',
        'address.country',
        'address.district',
        'address.line',
        'address.postalCode',
        'address.state',
        'address.text'
      );
    }

    const queries = fields.map((field) => ({
      wildcard: {
        [field]: {
          value: `*${value.toLowerCase()}*`
        }
      }
    }));

    if (queries.length === 1) {
      return queries[0];
    }
    return {
      bool: {
        should: queries
      }
    };
  }

  const keywordSuffix = modifier === 'exact' ? '.keyword' : '';
  const fields = [compiled.path + keywordSuffix, `${compiled.path}.*${keywordSuffix}`];

  return {
    multi_match: {
      fields,
      query: escapeQueryString(value),
      lenient: true
    }
  };
}
