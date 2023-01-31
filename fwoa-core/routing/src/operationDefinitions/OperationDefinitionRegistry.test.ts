/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { Router } from 'express';
import ConfigHandler from '../configHandler';
import ResourceHandler from '../router/handlers/resourceHandler';
import { OperationDefinitionRegistry } from './OperationDefinitionRegistry';
import { OperationDefinitionImplementation } from './types';

const fakeRouter = jest.fn() as unknown as Router;
const fakeOperation: OperationDefinitionImplementation = {
  canonicalUrl: 'https://fwoa.com/operation/fakeOperation',
  name: 'fakeOperation',
  documentation: 'The documentation for the fakeOperation',
  httpVerbs: ['GET'],
  path: '/Patient/fakeOperation',
  targetResourceType: 'Patient',
  requestInformation: {
    operation: 'read',
    resourceType: 'Patient'
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  buildRouter: (resourceHandler: ResourceHandler) => fakeRouter
};
describe('OperationDefinitionRegistry', () => {
  test('getAllRouters', () => {
    const configHandlerMock = {
      getResourceHandler: jest.fn().mockReturnValue({})
    };

    const operationDefinitionRegistry = new OperationDefinitionRegistry(
      configHandlerMock as unknown as ConfigHandler,
      [fakeOperation]
    );

    expect(operationDefinitionRegistry.getAllRouters()).toHaveLength(1);
    expect(operationDefinitionRegistry.getAllRouters()[0]).toBe(fakeRouter);
  });

  test('getOperation', () => {
    const configHandlerMock = {
      getResourceHandler: jest.fn().mockReturnValue({})
    };

    const operationDefinitionRegistry = new OperationDefinitionRegistry(
      configHandlerMock as unknown as ConfigHandler,
      [fakeOperation]
    );

    expect(operationDefinitionRegistry.getOperation('PATCH', '/Patient/fakeOperation')).toBeUndefined();
    expect(operationDefinitionRegistry.getOperation('GET', '/Patient/someOtherOperation')).toBeUndefined();

    expect(operationDefinitionRegistry.getOperation('GET', '/Patient/fakeOperation')).toBe(fakeOperation);
  });

  test('getCapabilities', () => {
    const configHandlerMock = {
      getResourceHandler: jest.fn().mockReturnValue({})
    };

    const operationDefinitionRegistry = new OperationDefinitionRegistry(
      configHandlerMock as unknown as ConfigHandler,
      [fakeOperation]
    );

    expect(operationDefinitionRegistry.getCapabilities()).toMatchInlineSnapshot(`
            Object {
              "Patient": Object {
                "operation": Array [
                  Object {
                    "definition": "https://fwoa.com/operation/fakeOperation",
                    "documentation": "The documentation for the fakeOperation",
                    "name": "fakeOperation",
                  },
                ],
              },
            }
        `);
  });

  test('ResourceHandler not available', () => {
    const configHandlerMock = {
      getResourceHandler: jest.fn().mockReturnValue(undefined)
    };

    expect(
      () => new OperationDefinitionRegistry(configHandlerMock as unknown as ConfigHandler, [fakeOperation])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Failed to initialize operation https://fwoa.com/operation/fakeOperation. Is your FhirConfig correct?"`
    );
  });
});
