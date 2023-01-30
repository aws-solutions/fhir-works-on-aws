"use strict";
/* eslint-disable import/prefer-default-export */
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
exports.ProfilesRegistry = void 0;
const fs_1 = __importDefault(require("fs"));
const buildFullUrl = (resourceType) =>
  `http://hl7.org/fhir/StructureDefinition/${resourceType}`;
/**
 * Parses FHIR profiles json files
 * https://www.hl7.org/fhir/definitions.json.zip
 * http://hl7.org/fhir/STU3/definitions.json.zip
 */
class ProfilesRegistry {
  /**
   * @param pathToFhirDefinitionsFolder - path to the unzipped FHIR definitions folder (most likely downloaded from @link https://www.hl7.org/fhir/definitions.json.zip)
   */
  constructor(pathToFhirDefinitionsFolder) {
    const fileNames = [
      `${pathToFhirDefinitionsFolder}/profiles-resources.json`,
      `${pathToFhirDefinitionsFolder}/profiles-types.json`,
    ];
    this.structureDefinitions = fileNames.flatMap(
      (fileName) =>
        JSON.parse(fs_1.default.readFileSync(fileName, { encoding: "utf8" }))
          .entry
    );
  }
  getTypeForField(resourceType, field) {
    const resource = this.structureDefinitions.find(
      (s) => s.fullUrl === buildFullUrl(resourceType)
    );
    if (resource === undefined) {
      return undefined;
    }
    const profileField = resource.resource.snapshot.element.find(
      (el) => el.id === `${resourceType}.${field}`
    );
    if (profileField === undefined) {
      return undefined;
    }
    if (profileField.type === undefined) {
      return undefined;
    }
    return profileField.type[0].code;
  }
  getFhirVersion() {
    return this.structureDefinitions[0].resource.fhirVersion;
  }
}
exports.ProfilesRegistry = ProfilesRegistry;
//# sourceMappingURL=profilesRegistry.js.map
