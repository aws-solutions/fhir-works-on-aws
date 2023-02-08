/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { get, groupBy, mapValues, uniqBy } from 'lodash';

import { MAX_INCLUSION_PARAM_RESULTS } from './constants';
import { Query } from './elasticSearchService';
import { FHIRSearchParametersRegistry } from './FHIRSearchParametersRegistry';
import { getAllValuesForFHIRPath } from './getAllValuesForFHIRPath';

/**
 * @example
 * The following query:
 * https://my-fwoa-server/ImmunizationRecommendation?_include=ImmunizationRecommendation:information:Patient
 * results in:
 * {
 *   type: '_include',
 *   isWildcard: false,
 *   sourceResource: 'ImmunizationRecommendation',
 *   searchParameter: 'information',
 *   path: 'ImmunizationRecommendation.recommendation.supportingPatientInformation'
 *   targetResourceType: 'Patient'
 * }
 *
 * path is the actual object path where the reference value can be found. All valid search params have a path.
 * path is optional since InclusionSearchParameter is first built from the query params and the path is added afterwards if it is indeed a valid search parameter.
 */

export type InclusionSearchParameterType = '_include' | '_revinclude';

export interface InclusionSearchParameter {
  type: InclusionSearchParameterType;
  isWildcard: false;
  isIterate?: true;
  sourceResource: string;
  searchParameter: string;
  path?: string;
  targetResourceType?: string;
}

export interface WildcardInclusionSearchParameter {
  type: InclusionSearchParameterType;
  isWildcard: true;
  isIterate?: true;
}

const expandRevIncludeWildcard = (
  resourceTypes: string[],
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry
): InclusionSearchParameter[] => {
  return resourceTypes.flatMap((resourceType) => {
    return fhirSearchParametersRegistry.getRevIncludeSearchParameters(resourceType).flatMap((searchParam) => {
      return searchParam.target!.map((target) => ({
        type: '_revinclude',
        isWildcard: false,
        sourceResource: searchParam.base,
        searchParameter: searchParam.name,
        path: searchParam.compiled[0].path,
        targetResourceType: target
      }));
    });
  });
};

const expandIncludeWildcard = (
  resourceTypes: string[],
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry
): InclusionSearchParameter[] => {
  return resourceTypes.flatMap((resourceType) => {
    return fhirSearchParametersRegistry.getIncludeSearchParameters(resourceType).flatMap((searchParam) => {
      return searchParam.target!.map((target) => ({
        type: '_include',
        isWildcard: false,
        sourceResource: searchParam.base,
        searchParameter: searchParam.name,
        path: searchParam.compiled[0].path,
        targetResourceType: target
      }));
    });
  });
};

const RELATIVE_URL_REGEX = /^[A-Za-z]+\/[A-Za-z0-9-]+$/;
export const getIncludeReferencesFromResources = (
  includes: InclusionSearchParameter[],
  resources: any[]
): { resourceType: string; id: string }[] => {
  const references = includes.flatMap((include) => {
    return resources
      .filter((resource) => resource.resourceType === include.sourceResource)
      .flatMap((resource) => getAllValuesForFHIRPath(resource, `${include.path}`))
      .flatMap((valueAtPath) => {
        if (Array.isArray(valueAtPath)) {
          return valueAtPath.map((v) => get(v, 'reference'));
        }
        return [get(valueAtPath, 'reference')];
      })
      .filter((reference): reference is string => typeof reference === 'string')
      .filter((reference) => RELATIVE_URL_REGEX.test(reference))
      .map((relativeUrl) => {
        const [resourceType, id] = relativeUrl.split('/');
        return { resourceType, id };
      })
      .filter(
        ({ resourceType }) => !include.targetResourceType || include.targetResourceType === resourceType
      );
  });

  return uniqBy(references, (x) => `${x.resourceType}/${x.id}`);
};

export const getRevincludeReferencesFromResources = (
  revIncludeParameters: InclusionSearchParameter[],
  resources: any[]
): { references: string[]; revinclude: InclusionSearchParameter }[] => {
  return revIncludeParameters
    .map((revinclude) => {
      const references = resources
        .filter(
          (resource) =>
            revinclude.targetResourceType === undefined ||
            resource.resourceType === revinclude.targetResourceType
        )
        .map((resource) => `${resource.resourceType}/${resource.id}`);
      return { revinclude, references };
    })
    .filter(({ references }) => references.length > 0);
};

export const buildIncludeQuery = (
  resourceType: string,
  resourceIds: string[],
  filterRulesForActiveResources: any[]
): Query => ({
  resourceType,
  queryRequest: {
    size: MAX_INCLUSION_PARAM_RESULTS,
    body: {
      query: {
        bool: {
          filter: [
            {
              terms: {
                id: resourceIds
              }
            },
            ...filterRulesForActiveResources
          ]
        }
      }
    }
  }
});

export const buildRevIncludeQuery = (
  revIncludeSearchParameter: InclusionSearchParameter,
  references: string[],
  filterRulesForActiveResources: any[],
  useKeywordSubFields: boolean
): Query => {
  const keywordSuffix = useKeywordSubFields ? '.keyword' : '';
  const { sourceResource, path } = revIncludeSearchParameter;
  return {
    resourceType: sourceResource,
    queryRequest: {
      size: MAX_INCLUSION_PARAM_RESULTS,
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: {
                  [`${path}.reference${keywordSuffix}`]: references
                }
              },
              ...filterRulesForActiveResources
            ]
          }
        }
      }
    }
  };
};

export const buildIncludeQueries = (
  inclusionSearchParameters: (InclusionSearchParameter | WildcardInclusionSearchParameter)[],
  resources: any[],
  filterRulesForActiveResources: any[],
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
  iterate?: true
): Query[] => {
  const allIncludeParameters = inclusionSearchParameters.filter(
    (param) => param.type === '_include' && param.isIterate === iterate
  ) as InclusionSearchParameter[];

  const includeParameters = allIncludeParameters.some((x) => x.isWildcard)
    ? expandIncludeWildcard(
        [
          ...resources.reduce(
            (acc: Set<string>, resource) => acc.add(resource.resourceType),
            new Set() as Set<string>
          )
        ],
        fhirSearchParametersRegistry
      )
    : allIncludeParameters;

  const resourceReferences: { resourceType: string; id: string }[] = getIncludeReferencesFromResources(
    includeParameters,
    resources
  );

  const resourceTypeToIds: { [resourceType: string]: string[] } = mapValues(
    groupBy(resourceReferences, (resourcReference) => resourcReference.resourceType),
    (arr) => arr.map((x) => x.id)
  );

  return Object.entries(resourceTypeToIds).map(([resourceType, ids]) => {
    return buildIncludeQuery(resourceType, ids, filterRulesForActiveResources);
  });
};

export const buildRevIncludeQueries = (
  inclusionSearchParameters: (InclusionSearchParameter | WildcardInclusionSearchParameter)[],
  resources: any[],
  filterRulesForActiveResources: any[],
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry,
  useKeywordSubFields: boolean,
  iterate?: true
): Query[] => {
  const allRevincludeParameters = inclusionSearchParameters.filter(
    (param) => param.type === '_revinclude' && param.isIterate === iterate
  ) as InclusionSearchParameter[];

  const revIncludeParameters = allRevincludeParameters.some((x) => x.isWildcard)
    ? expandRevIncludeWildcard(
        [
          ...resources.reduce(
            (acc: Set<string>, resource) => acc.add(resource.resourceType),
            new Set() as Set<string>
          )
        ],
        fhirSearchParametersRegistry
      )
    : allRevincludeParameters;

  const revincludeReferences = getRevincludeReferencesFromResources(revIncludeParameters, resources);

  return revincludeReferences.map(({ revinclude, references }) =>
    buildRevIncludeQuery(revinclude, references, filterRulesForActiveResources, useKeywordSubFields)
  );
};
