/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { unflatten } from 'flat';
import { mapValues } from 'lodash';
import searchMappingsBaseV3 from '../schema/searchMappingsBase.3.0.1.json';
import searchMappingsBaseV4 from '../schema/searchMappingsBase.4.0.1.json';
import { CUSTOM_MAPPINGS } from './customMappings';
import { fhirToESMapping } from './fhirTypeToESMapping';

interface SearchMappingsBase {
  [resourceType: string]: { field: string; type: string }[];
}
/**
 * Get the search mappings for ALL resource types
 * @param fhirVersion
 */
// eslint-disable-next-line import/prefer-default-export
export const getSearchMappings = (
  fhirVersion: string
): {
  [resourceType: string]: any;
} => {
  let searchMappings: SearchMappingsBase;
  switch (fhirVersion) {
    case '3.0.1':
      searchMappings = searchMappingsBaseV3;
      break;
    case '4.0.1':
      searchMappings = searchMappingsBaseV4;
      break;
    default:
      throw new Error(`search mappings are not available for FHIR version ${fhirVersion}`);
  }

  const searchableFieldsMappings = mapValues(searchMappings, (fieldsArr) =>
    fieldsArr.map(fhirToESMapping).filter((x) => x.mapping !== undefined)
  );

  const flatMappings = mapValues(searchableFieldsMappings, (fieldsArr) =>
    fieldsArr.reduce((acc, field) => {
      const fieldWithIntermediateProperties = field.field.split('.').join('.properties.');
      acc[fieldWithIntermediateProperties] = field.mapping;
      return acc;
    }, {} as any)
  );

  const mappings = mapValues(flatMappings, (x) => unflatten(x) as any);

  // All resourceTypes inherit the fields from Resource
  const resourceMappings = mappings.Resource;
  delete mappings.Resource;

  const mergedMappings = mapValues(mappings, (x) => ({
    ...x,
    ...resourceMappings,
    ...CUSTOM_MAPPINGS
  }));

  return mapValues(mergedMappings, (x) => ({
    dynamic: false,
    properties: x
  }));
};
