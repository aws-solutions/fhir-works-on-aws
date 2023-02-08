/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  TypeOperation,
  SystemOperation,
  SearchCapabilityStatement,
  SearchCapabilities,
  Resource
} from '@aws/fhir-works-on-aws-interface';
import {
  OperationCapability,
  OperationCapabilityStatement
} from '../../operationDefinitions/OperationDefinitionRegistry';
import { ResourceCapabilityStatement, ResourceCapability } from '../../registry/ResourceCapabilityInterface';

function makeResourceObject(
  resourceType: string,
  resourceOperations: any[],
  updateCreate: boolean,
  hasTypeSearch: boolean,
  searchCapabilities?: SearchCapabilities,
  resourceCapability?: ResourceCapability,
  operationCapability?: OperationCapability
) {
  const result: any = {
    type: resourceType,
    interaction: resourceOperations,
    versioning: 'versioned',
    readHistory: false,
    updateCreate,
    conditionalCreate: false,
    conditionalRead: 'not-supported',
    conditionalUpdate: false,
    conditionalDelete: 'not-supported'
  };

  if (hasTypeSearch && searchCapabilities !== undefined) {
    Object.assign(result, searchCapabilities);
  }

  if (resourceCapability) {
    Object.assign(result, resourceCapability);
  }

  if (operationCapability) {
    Object.assign(result, operationCapability);
  }

  return result;
}

export function makeOperation(operations: (TypeOperation | SystemOperation)[]) {
  const resourceOperations: any[] = [];

  operations.forEach((operation) => {
    resourceOperations.push({ code: operation });
  });

  return resourceOperations;
}

export function makeGenericResources(
  fhirResourcesToMake: string[],
  operations: TypeOperation[],
  searchCapabilityStatement: SearchCapabilityStatement,
  resourceCapabilityStatement: ResourceCapabilityStatement,
  operationCapabilityStatement: OperationCapabilityStatement,
  updateCreate: boolean
) {
  const resources: any[] = [];

  const resourceOperations: any[] = makeOperation(operations);
  const hasTypeSearch: boolean = operations.includes('search-type');

  fhirResourcesToMake.forEach((resourceType: string) => {
    resources.push(
      makeResourceObject(
        resourceType,
        resourceOperations,
        updateCreate,
        hasTypeSearch,
        searchCapabilityStatement[resourceType],
        resourceCapabilityStatement[resourceType],
        operationCapabilityStatement[resourceType]
      )
    );
  });

  return resources;
}

export async function makeResource(resourceType: string, resource: Resource) {
  const resourceOperations: any[] = makeOperation(resource.operations);
  const hasTypeSearch: boolean = resource.operations.includes('search-type');
  const updateCreate = resource.persistence.updateCreateSupported;
  const capabilities: SearchCapabilityStatement = hasTypeSearch
    ? await resource.typeSearch.getCapabilities()
    : {};

  return makeResourceObject(
    resourceType,
    resourceOperations,
    updateCreate,
    hasTypeSearch,
    capabilities[resourceType]
  );
}
