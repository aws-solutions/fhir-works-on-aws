/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { Router } from 'express';
import ConfigHandler from '../configHandler';
import { OperationDefinitionImplementation } from './types';

export interface OperationCapability {
  operation: {
    name: string;
    definition: string;
    documentation: string;
  }[];
}

export interface OperationCapabilityStatement {
  [resourceType: string]: OperationCapability;
}

export class OperationDefinitionRegistry {
  private readonly operations: OperationDefinitionImplementation[];

  private readonly routers: Router[];

  constructor(configHandler: ConfigHandler, operations: OperationDefinitionImplementation[]) {
    this.operations = operations;

    this.routers = operations.map((operation) => {
      const resourceHandler = configHandler.getResourceHandler(operation.targetResourceType);
      if (!resourceHandler) {
        throw new Error(
          `Failed to initialize operation ${operation.canonicalUrl}. Is your FhirConfig correct?`
        );
      }
      console.log(`Enabling operation ${operation.canonicalUrl} at ${operation.path}`);
      return operation.buildRouter(resourceHandler);
    });
  }

  getOperation(method: string, path: string): OperationDefinitionImplementation | undefined {
    return this.operations.find((o) => o.path === path && o.httpVerbs.includes(method));
  }

  getAllRouters(): Router[] {
    return this.routers;
  }

  getCapabilities(): OperationCapabilityStatement {
    const capabilities: OperationCapabilityStatement = {};

    this.operations.forEach((operation) => {
      if (!capabilities[operation.targetResourceType]) {
        capabilities[operation.targetResourceType] = {
          operation: []
        };
      }
      capabilities[operation.targetResourceType].operation.push({
        name: operation.name,
        definition: operation.canonicalUrl,
        documentation: operation.documentation
      });
    });

    return capabilities;
  }
}
