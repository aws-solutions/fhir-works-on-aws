/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { ReferenceSearchValue } from '../../FhirQueryParser/typeParsers/referenceParser';
import { CompiledSearchParam } from '../../FHIRSearchParametersRegistry';

const SUPPORTED_MODIFIERS: string[] = [];

// eslint-disable-next-line import/prefer-default-export
export function referenceQuery(
  compiled: CompiledSearchParam,
  value: ReferenceSearchValue,
  useKeywordSubFields: boolean,
  baseUrl: string,
  searchParamName: string,
  target: string[] = [],
  modifier?: string
): any {
  if (modifier && !SUPPORTED_MODIFIERS.includes(modifier)) {
    throw new InvalidSearchParameterError(`Unsupported reference search modifier: ${modifier}`);
  }

  let references: string[] = [];
  switch (value.referenceType) {
    case 'idOnly':
      references = target.flatMap((targetType: string) => {
        return [`${baseUrl}/${targetType}/${value.id}`, `${targetType}/${value.id}`];
      });
      break;
    case 'relative':
      references.push(`${value.resourceType}/${value.id}`);
      references.push(`${baseUrl}/${value.resourceType}/${value.id}`);
      break;
    case 'url':
      if (value.fhirServiceBaseUrl === baseUrl) {
        references.push(`${value.resourceType}/${value.id}`);
      }
      references.push(`${value.fhirServiceBaseUrl}/${value.resourceType}/${value.id}`);
      break;
    case 'unparseable':
      references.push(value.rawValue);
      break;
    default:
      // eslint-disable-next-line no-case-declarations
      const exhaustiveCheck: never = value;
      return exhaustiveCheck;
  }

  const keywordSuffix = useKeywordSubFields ? '.keyword' : '';
  return {
    terms: { [`${compiled.path}.reference${keywordSuffix}`]: references }
  };
}
