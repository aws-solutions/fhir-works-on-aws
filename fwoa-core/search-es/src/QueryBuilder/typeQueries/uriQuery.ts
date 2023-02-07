/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export function uriQuery(
  compiled: CompiledSearchParam,
  value: string,
  useKeywordSubFields: boolean,
  modifier?: string
): any {
  if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
    throw new InvalidSearchParameterError(`Unsupported URI search modifier: ${modifier}`);
  }
  const keywordSuffix = useKeywordSubFields ? '.keyword' : '';

  return {
    multi_match: {
      fields: [`${compiled.path}${keywordSuffix}`],
      query: value,
      lenient: true
    }
  };
}
