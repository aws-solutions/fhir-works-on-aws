"use strict";
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This scripts generates the JSON search mappings files at src/schema based on the FHIR definitions.
 *
 * You can download the latest FHIR definitions from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html
 *
 * Run the script:
 * > ts-node index.ts <pathToFhirDefinitionsFolder>
 */
const lodash_1 = require("lodash");
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const profilesRegistry_1 = require("./profilesRegistry");
const choiceDataTypes_1 = require("./choiceDataTypes");
const constants_1 = require("./constants");
const args = process.argv.slice(2);
if (!args[0]) {
  console.error("Error. Missing pathToFhirDefinitionsFolder parameter");
  console.error(
    `Usage: ts-node ${(0, path_1.relative)(
      process.cwd(),
      __filename
    )} <pathToFhirDefinitionsFolder>`
  );
  process.exit(1);
}
const pathToFhirDefinitionsFolder = args[0];
const profilesRegistry = new profilesRegistry_1.ProfilesRegistry(
  pathToFhirDefinitionsFolder
);
const fhirVersionFromFiles = profilesRegistry.getFhirVersion();
// 3.0.1 downloads are not available on the FHIR website anymore.
// We've been referring to the latest STU3 definitions (3.0.2) for a while but we still use the 3.0.1 string in our codebase
const fhirVersion =
  fhirVersionFromFiles === "3.0.2" ? "3.0.1" : fhirVersionFromFiles;
// eslint-disable-next-line import/no-dynamic-require
const compiledSearchParameters = require(`../../src/schema/compiledSearchParameters.${fhirVersion}.json`);
console.log(`Generating mappings for FHIR version ${fhirVersion}`);
const resolveFieldType = (x, resourceType) => {
  var _a;
  if (
    (_a =
      constants_1.EDGE_CASES === null || constants_1.EDGE_CASES === void 0
        ? void 0
        : constants_1.EDGE_CASES[resourceType]) === null || _a === void 0
      ? void 0
      : _a[x.field]
  ) {
    return {
      ...x,
      type: constants_1.EDGE_CASES[resourceType][x.field],
    };
  }
  const typeFromRegistry = profilesRegistry.getTypeForField(
    resourceType,
    x.field
  );
  if (typeFromRegistry) {
    if (typeFromRegistry === "BackboneElement") {
      return {
        ...x,
        type: undefined,
        error: "BackboneElement type is not searchable",
      };
    }
    return {
      ...x,
      type: typeFromRegistry,
    };
  }
  const checkMultiType = profilesRegistry.getTypeForField(
    resourceType,
    `${x.field}[x]`
  );
  if (checkMultiType) {
    return {
      ...x,
      type: undefined,
      error: "Missing choice of data type",
    };
  }
  const inferredTypeFromFieldName = (0, choiceDataTypes_1.getTypeFromField)(
    x.field
  );
  if (inferredTypeFromFieldName) {
    return {
      ...x,
      type: inferredTypeFromFieldName,
    };
  }
  const parts = x.field.split(".");
  if (parts.length < 2) {
    return {
      ...x,
      type: undefined,
    };
  }
  const child = parts.pop();
  const parent = parts.join(".");
  const typeFromParent = resolveFieldType({ field: parent }, resourceType);
  const typeFromRecursiveLookUp = resolveFieldType(
    { field: child },
    typeFromParent.type
  );
  return {
    ...x,
    type: typeFromRecursiveLookUp.type,
  };
};
const searchableFields = {};
compiledSearchParameters.forEach((compiledSearchParameter) => {
  var _a;
  searchableFields[compiledSearchParameter.base] =
    (_a = searchableFields[compiledSearchParameter.base]) !== null &&
    _a !== void 0
      ? _a
      : [];
  const fields = compiledSearchParameter.compiled.flatMap((s) => {
    const output = [{ field: s.path }];
    if (s.condition) {
      output.push({ field: s.condition[0] });
    }
    return output;
  });
  searchableFields[compiledSearchParameter.base].push(...fields);
});
searchableFields.Resource.push(
  ...constants_1.EXTENSION_FIELDS.map((field) => ({ field }))
);
const uniqSearchableFields = (0, lodash_1.mapValues)(searchableFields, (x) =>
  (0, lodash_1.uniqBy)(x, (s) => s.field)
);
const searchableFieldsWithResolvedTypes = (0, lodash_1.mapValues)(
  uniqSearchableFields,
  (fieldsArr, resourceType) =>
    fieldsArr
      .map((s) => resolveFieldType(s, resourceType))
      .filter((x) => {
        if (x.error) {
          console.warn(
            `Skipping ${resourceType}.${x.field} due to error: ${x.error}`
          );
          return false;
        }
        return true;
      })
);
fs_1.default.writeFileSync(
  (0, path_1.join)(
    __dirname,
    "..",
    "..",
    "src",
    "schema",
    `searchMappingsBase.${fhirVersion}.json`
  ),
  JSON.stringify(searchableFieldsWithResolvedTypes, null, 2)
);
//# sourceMappingURL=index.js.map
