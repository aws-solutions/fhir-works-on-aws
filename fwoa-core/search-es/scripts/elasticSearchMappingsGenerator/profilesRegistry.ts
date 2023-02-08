/* eslint-disable import/prefer-default-export */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import fs from 'fs';
import { FhirProfiles } from './types';

const buildFullUrl = (resourceType: string) => `http://hl7.org/fhir/StructureDefinition/${resourceType}`;

/**
 * Parses FHIR profiles json files
 * https://www.hl7.org/fhir/definitions.json.zip
 * http://hl7.org/fhir/STU3/definitions.json.zip
 */
export class ProfilesRegistry {
  private readonly structureDefinitions: FhirProfiles.Entry[];

  /**
   * @param pathToFhirDefinitionsFolder - path to the unzipped FHIR definitions folder (most likely downloaded from @link https://www.hl7.org/fhir/definitions.json.zip)
   */
  constructor(pathToFhirDefinitionsFolder: string) {
    const fileNames = [
      `${pathToFhirDefinitionsFolder}/profiles-resources.json`,
      `${pathToFhirDefinitionsFolder}/profiles-types.json`
    ];

    this.structureDefinitions = fileNames.flatMap(
      (fileName: string) => JSON.parse(fs.readFileSync(fileName, { encoding: 'utf8' })).entry
    );
  }

  getTypeForField(resourceType: string, field: string): string | undefined {
    const resource = this.structureDefinitions.find((s) => s.fullUrl === buildFullUrl(resourceType));

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

  getFhirVersion(): string {
    return this.structureDefinitions[0].resource.fhirVersion;
  }
}
