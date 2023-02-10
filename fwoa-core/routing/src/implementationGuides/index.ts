/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ImplementationGuides } from '@aws/fhir-works-on-aws-interface';

/**
 * Based on the FHIR StructuredDefinition. This type only includes the fields that are required for the compile process.
 * See: http://www.hl7.org/fhir/structuredefinition.html
 */
export interface FhirStructureDefinition {
  resourceType: 'StructureDefinition';
  url: string;
  name: string;
  description: string;
  baseDefinition: string;
  type: string;
}

/**
 * Based on the FHIR OperationDefinition. This type only includes the fields that are required for the compile process.
 * See: https://www.hl7.org/fhir/operationdefinition.html
 */
export interface FhirOperationDefinition {
  resourceType: 'OperationDefinition';
  url: string;
  name: string;
  description: string;
}

/**
 * This class compiles StructuredDefinitions from IG packages
 */
export class RoutingImplementationGuides implements ImplementationGuides {
  /**
   * Compiles the contents of an Implementation Guide into an internal representation used to build the Capability Statement
   *
   * @param resources - an array of FHIR resources. See: https://www.hl7.org/fhir/profiling.html
   */
  // eslint-disable-next-line class-methods-use-this
  async compile(resources: any[]): Promise<any> {
    const validDefinitions: (FhirStructureDefinition | FhirOperationDefinition)[] = [];
    resources.forEach((s) => {
      if (
        RoutingImplementationGuides.isFhirStructureDefinition(s) ||
        RoutingImplementationGuides.isFhirOperationDefinition(s)
      ) {
        validDefinitions.push(s);
      } else {
        throw new Error(
          `The following input is not a StructureDefinition nor a OperationDefinition: ${s.type} ${s.name}`
        );
      }
    });

    return validDefinitions.map((fhirDefinition) => {
      switch (fhirDefinition.resourceType) {
        case 'StructureDefinition':
          return {
            name: fhirDefinition.name,
            url: fhirDefinition.url,
            type: fhirDefinition.type,
            resourceType: fhirDefinition.resourceType,
            description: fhirDefinition.description,
            baseDefinition: fhirDefinition.baseDefinition
          };
        case 'OperationDefinition':
          return {
            name: fhirDefinition.name,
            url: fhirDefinition.url,
            resourceType: fhirDefinition.resourceType,
            description: fhirDefinition.description
          };
        default:
          // this should never happen
          throw new Error('Unexpected error');
      }
    });
  }

  private static isFhirStructureDefinition(x: any): x is FhirStructureDefinition {
    return (
      typeof x === 'object' &&
      x &&
      x.resourceType === 'StructureDefinition' &&
      typeof x.url === 'string' &&
      typeof x.name === 'string' &&
      typeof x.description === 'string' &&
      typeof x.baseDefinition === 'string' &&
      typeof x.type === 'string'
    );
  }

  private static isFhirOperationDefinition(x: any): x is FhirOperationDefinition {
    return (
      typeof x === 'object' &&
      x &&
      x.resourceType === 'OperationDefinition' &&
      typeof x.url === 'string' &&
      typeof x.name === 'string' &&
      typeof x.description === 'string'
    );
  }
}
