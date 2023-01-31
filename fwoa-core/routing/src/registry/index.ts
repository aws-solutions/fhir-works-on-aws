/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirStructureDefinition } from '../implementationGuides';
import { ResourceCapabilityStatement } from './ResourceCapabilityInterface';

/**
 * This class is the single authority over the supported FHIR StructuredDefinition and their definitions
 */
export class FHIRStructureDefinitionRegistry {
  private readonly capabilityStatement: ResourceCapabilityStatement;

  constructor(compiledImplementationGuides?: any[]) {
    let compiledStructureDefinitions: FhirStructureDefinition[] = [];

    if (compiledImplementationGuides !== undefined) {
      compiledStructureDefinitions = [
        ...compiledImplementationGuides.filter((x) => x.resourceType === 'StructureDefinition')
      ];
    }

    this.capabilityStatement = {};

    compiledStructureDefinitions.forEach((compiledStructureDefinition) => {
      const structuredDefinition = this.capabilityStatement[compiledStructureDefinition.type];

      if (structuredDefinition) {
        this.capabilityStatement[compiledStructureDefinition.type].supportedProfile.push(
          compiledStructureDefinition.url
        );
      } else {
        this.capabilityStatement[compiledStructureDefinition.type] = {
          type: compiledStructureDefinition.type,
          supportedProfile: [compiledStructureDefinition.url]
        };
      }
    });
  }

  /**
   * Retrieve the profiles for a given resource type. Returns undefined if the parameter is not found on the registry.
   * @param resourceType FHIR resource type
   * @return a list of profiles
   */
  getProfiles(resourceType: string): string[] {
    return this.capabilityStatement[resourceType]?.supportedProfile ?? [];
  }

  /**
   * Retrieve a subset of the CapabilityStatement with the resource definitions
   * See https://www.hl7.org/fhir/capabilitystatement.html
   */
  getCapabilities(): ResourceCapabilityStatement {
    return this.capabilityStatement;
  }
}
