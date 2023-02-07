import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { uniq } from 'lodash';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { InclusionSearchParameter, WildcardInclusionSearchParameter } from '../searchInclusions';

export const inclusionParameterFromString = (
  s: string
): Omit<InclusionSearchParameter, 'type'> | Omit<WildcardInclusionSearchParameter, 'type'> => {
  if (s === '*') {
    return { isWildcard: true };
  }
  const INCLUSION_PARAM_REGEX =
    /^(?<sourceResource>[A-Za-z]+):(?<searchParameter>[A-Za-z-]+)(?::(?<targetResourceType>[A-Za-z]+))?$/;
  const match = s.match(INCLUSION_PARAM_REGEX);
  if (match === null) {
    throw new InvalidSearchParameterError(`Invalid include/revinclude search parameter: ${s}`);
  }
  const { sourceResource, searchParameter, targetResourceType } = match.groups!;
  return {
    isWildcard: false,
    sourceResource,
    searchParameter,
    targetResourceType
  };
};

export const parseInclusionParams = (
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
  searchParameter: string,
  value: string[]
): (InclusionSearchParameter | WildcardInclusionSearchParameter)[] => {
  return uniq(value).map((v) => {
    const inclusionParam = inclusionParameterFromString(v);
    const colonIndex =
      searchParameter.indexOf(':') === -1 ? searchParameter.length : searchParameter.indexOf(':');
    const type = searchParameter.substring(0, colonIndex) as '_include' | '_revinclude';
    const isIterate = searchParameter.substring(colonIndex + 1) === 'iterate' ? true : undefined;
    if (!inclusionParam.isWildcard) {
      const searchParam = fhirSearchParametersRegistry.getReferenceSearchParameter(
        inclusionParam.sourceResource,
        inclusionParam.searchParameter,
        inclusionParam.targetResourceType
      );
      if ('error' in searchParam) {
        throw new InvalidSearchParameterError(
          `Invalid include/revinclude search parameter: ${searchParam.error}`
        );
      }
      inclusionParam.path = searchParam.compiled[0].path;
    }
    return {
      type,
      ...(isIterate && { isIterate }),
      ...inclusionParam
    };
  });
};
