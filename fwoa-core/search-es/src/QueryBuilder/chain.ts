// eslint-disable-next-line import/prefer-default-export
import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { COMPILED_CONDITION_OPERATOR_RESOLVE, NON_SEARCHABLE_PARAMETERS } from '../constants';
import { parseSearchModifiers, normalizeQueryParams, isChainedParameter } from '../FhirQueryParser/util';
import { FHIRSearchParametersRegistry, SearchParam } from '../FHIRSearchParametersRegistry';

export interface ChainParameter {
  chain: { resourceType: string; searchParam: string }[];
  initialValue: string[];
}

export function getUniqueTarget(fhirSearchParam: SearchParam): string | undefined {
  if (!fhirSearchParam.target) {
    return undefined;
  }
  if (fhirSearchParam.target.length === 1) {
    return fhirSearchParam.target[0];
  }
  let target: string | undefined;
  for (let i = 0; i < fhirSearchParam.compiled.length; i += 1) {
    // check compiled[].condition for resolution
    const compiled = fhirSearchParam.compiled[i]; // we can use ! since we checked length before
    // condition's format is defined in `../FHIRSearchParamtersRegistry/index.ts`
    if (compiled.condition && compiled.condition[1] === COMPILED_CONDITION_OPERATOR_RESOLVE) {
      if (!target) {
        // eslint-disable-next-line prefer-destructuring
        target = compiled.condition[2];
      } else if (target !== compiled.condition[2]) {
        // case where two compiled resolve to different resource types
        return undefined;
      }
    } else {
      // if there is no resolve condition, we have multiple resources pointed to.
      return undefined;
    }
  }
  // case for resolution to resource type that isn't contained in the target group
  if (target && !fhirSearchParam.target.includes(target)) {
    return undefined;
  }
  return target;
}

const parseChainedParameters = (
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
  resourceType: string,
  queryParams: any
): ChainParameter[] => {
  const parsedChainedParam: ChainParameter[] = Object.entries(normalizeQueryParams(queryParams))
    .filter(
      ([searchParameter]) =>
        !NON_SEARCHABLE_PARAMETERS.includes(searchParameter) && isChainedParameter(searchParameter)
    )
    .flatMap(([searchParameter, searchValues]) => {
      // Validate chain and add resource type
      const chain = searchParameter.split('.');
      const lastChain: string = chain.pop() as string;
      let currentResourceType = resourceType;
      const organizedChain: { resourceType: string; searchParam: string }[] = [];
      chain.forEach((currentSearchParam) => {
        const searchModifier = parseSearchModifiers(currentSearchParam);
        const fhirSearchParam = fhirSearchParametersRegistry.getSearchParameter(
          currentResourceType,
          searchModifier.parameterName
        );
        if (fhirSearchParam === undefined) {
          throw new InvalidSearchParameterError(
            `Invalid search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType}`
          );
        }
        if (fhirSearchParam.type !== 'reference') {
          throw new InvalidSearchParameterError(
            `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} is not a reference.`
          );
        }
        let nextResourceType;
        if (searchModifier.modifier) {
          if (fhirSearchParam.target?.includes(searchModifier.modifier)) {
            organizedChain.push({
              resourceType: currentResourceType,
              searchParam: searchModifier.parameterName
            });
            nextResourceType = searchModifier.modifier;
          } else {
            throw new InvalidSearchParameterError(
              `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} does not point to resource type ${searchModifier.modifier}.`
            );
          }
        } else {
          const target = getUniqueTarget(fhirSearchParam);
          if (!target) {
            throw new InvalidSearchParameterError(
              `Chained search parameter '${searchModifier.parameterName}' for resource type ${currentResourceType} points to multiple resource types, please specify.`
            );
          }
          organizedChain.push({
            resourceType: currentResourceType,
            searchParam: searchModifier.parameterName
          });
          nextResourceType = target;
        }
        currentResourceType = nextResourceType;
      });
      organizedChain.push({
        resourceType: currentResourceType,
        searchParam: lastChain
      });
      return {
        chain: organizedChain.reverse(),
        initialValue: searchValues
      };
    });
  return parsedChainedParam;
};

export default parseChainedParameters;
