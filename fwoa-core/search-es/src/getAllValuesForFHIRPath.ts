/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

// eslint-disable-next-line import/prefer-default-export
import { isPresent } from './tsUtils';

/**
 * Gets all values in the given FHIRPath. This function properly handles intermediate array fields.
 *
 * FHIRPath can be misleading since it does not explicitly states the cardinality of fields.
 * e.g. for "Encounter.location.location", "Encounter.location" is an array, so you would access the 1st value as "Encounter.location[0].location"
 *
 * Note: This function can be further optimized by knowing beforehand which fields are arrays. That info can be derived from the FHIR StructureDefinitions
 *
 * @param resource - FHIR resource
 * @param path - path to look for
 *
 * @return array of all values located in the given path.
 */
// eslint-disable-next-line import/prefer-default-export
export const getAllValuesForFHIRPath = (resource: any, path: string): any[] => {
  const pathParts = path.split('.');

  let values: any[] = [resource];
  let pathTraversed = '';

  pathParts.forEach((pathPart) => {
    pathTraversed = pathTraversed === '' ? pathPart : `${pathTraversed}.${pathPart}`;
    values = values.flatMap((value) => value[pathPart]).filter(isPresent);
  });

  return values;
};
