/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import ConfigHandler from '../configHandler';
import { OperationDefinitionRegistry } from './OperationDefinitionRegistry';
import { OperationDefinitionImplementation } from './types';
import { USCoreDocRef } from './USCoreDocRef';

export const initializeOperationRegistry = (configHandler: ConfigHandler) => {
  const { compiledImplementationGuides } = configHandler.config.profile;
  const operations: OperationDefinitionImplementation[] = [];

  // Add the operations to enable on this FHIR server.
  // The recommended approach is to enable operations if the corresponding `OperationDefinition` is found on the `compiledImplementationGuides`,
  // but this file can be updated to use a different enablement criteria or to disable operations altogether.
  if (
    compiledImplementationGuides &&
    compiledImplementationGuides.find(
      (x: any) => x.resourceType === 'OperationDefinition' && x.url === USCoreDocRef.canonicalUrl
    )
  ) {
    operations.push(USCoreDocRef);
  }

  return new OperationDefinitionRegistry(configHandler, operations);
};
