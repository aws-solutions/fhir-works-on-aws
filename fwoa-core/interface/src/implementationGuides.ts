/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface ImplementationGuides {
  /**
   * Compiles the contents of an Implementation Guide into an internal representation used to implement the features specified by it.
   *
   * The FHIR resource types commonly used on Implementation Guides are: StructureDefinition, SearchParameter, CodeSystem, ValueSet, ImplementationGuide, ConceptMap, OperationDefinition, CapabilityStatement.
   *
   * Different implementations of this interface may choose to process only a subset of the above resources.
   *
   * @param input - an array of FHIR resource objects to be compiled.
   * @returns compiled output - The output is not meant to be used by any other entity other than the module that implements this interface.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile(input: any[]): Promise<any>;
}
