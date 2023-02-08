/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

/**
 * This scripts generates the JSON search mappings files at src/schema based on the FHIR definitions.
 *
 * You can download the latest FHIR definitions from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html
 *
 * Run the script:
 * > ts-node index.ts <pathToFhirDefinitionsFolder>
 */

import { mapValues, uniqBy } from 'lodash';
import fs from 'fs';
import { join, relative } from 'path';
import { CompiledSearchParameter, SearchField } from './types';
import { ProfilesRegistry } from './profilesRegistry';
import { getTypeFromField } from './choiceDataTypes';
import { EDGE_CASES, EXTENSION_FIELDS } from './constants';

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Error. Missing pathToFhirDefinitionsFolder parameter');
  console.error(`Usage: ts-node ${relative(process.cwd(), __filename)} <pathToFhirDefinitionsFolder>`);
  process.exit(1);
}

const pathToFhirDefinitionsFolder = args[0];
const profilesRegistry = new ProfilesRegistry(pathToFhirDefinitionsFolder);

const fhirVersionFromFiles = profilesRegistry.getFhirVersion();
// 3.0.1 downloads are not available on the FHIR website anymore.
// We've been referring to the latest STU3 definitions (3.0.2) for a while but we still use the 3.0.1 string in our codebase
const fhirVersion = fhirVersionFromFiles === '3.0.2' ? '3.0.1' : fhirVersionFromFiles;

// eslint-disable-next-line import/no-dynamic-require
const compiledSearchParameters: CompiledSearchParameter[] = require(`../../src/schema/compiledSearchParameters.${fhirVersion}.json`);

console.log(`Generating mappings for FHIR version ${fhirVersion}`);

const resolveFieldType = (x: SearchField, resourceType: string): SearchField => {
  if (EDGE_CASES?.[resourceType]?.[x.field]) {
    return {
      ...x,
      type: EDGE_CASES[resourceType][x.field]
    };
  }

  const typeFromRegistry = profilesRegistry.getTypeForField(resourceType, x.field);
  if (typeFromRegistry) {
    if (typeFromRegistry === 'BackboneElement') {
      return {
        ...x,
        type: undefined,
        error: 'BackboneElement type is not searchable'
      };
    }
    return {
      ...x,
      type: typeFromRegistry
    };
  }

  const checkMultiType = profilesRegistry.getTypeForField(resourceType, `${x.field}[x]`);
  if (checkMultiType) {
    return {
      ...x,
      type: undefined,
      error: 'Missing choice of data type'
    };
  }

  const inferredTypeFromFieldName = getTypeFromField(x.field);
  if (inferredTypeFromFieldName) {
    return {
      ...x,
      type: inferredTypeFromFieldName
    };
  }

  const parts = x.field.split('.');

  if (parts.length < 2) {
    return {
      ...x,
      type: undefined
    };
  }

  const child = parts.pop()!;
  const parent = parts.join('.');

  const typeFromParent = resolveFieldType({ field: parent }, resourceType);

  const typeFromRecursiveLookUp = resolveFieldType({ field: child }, typeFromParent.type);
  return {
    ...x,
    type: typeFromRecursiveLookUp.type
  };
};

const searchableFields: {
  [resourceType: string]: SearchField[];
} = {};

compiledSearchParameters.forEach((compiledSearchParameter) => {
  searchableFields[compiledSearchParameter.base] = searchableFields[compiledSearchParameter.base] ?? [];

  const fields: { field: string; type?: string }[] = compiledSearchParameter.compiled.flatMap((s) => {
    const output = [{ field: s.path }];
    if (s.condition) {
      output.push({ field: s.condition[0] });
    }
    return output;
  });

  searchableFields[compiledSearchParameter.base].push(...fields);
});

searchableFields.Resource.push(...EXTENSION_FIELDS.map((field) => ({ field })));

const uniqSearchableFields = mapValues(searchableFields, (x) => uniqBy(x, (s) => s.field));

const searchableFieldsWithResolvedTypes = mapValues(uniqSearchableFields, (fieldsArr, resourceType) =>
  fieldsArr
    .map((s) => resolveFieldType(s, resourceType))
    .filter((x) => {
      if (x.error) {
        console.warn(`Skipping ${resourceType}.${x.field} due to error: ${x.error}`);
        return false;
      }
      return true;
    })
);

fs.writeFileSync(
  join(__dirname, '..', '..', 'src', 'schema', `searchMappingsBase.${fhirVersion}.json`),
  JSON.stringify(searchableFieldsWithResolvedTypes, null, 2)
);
