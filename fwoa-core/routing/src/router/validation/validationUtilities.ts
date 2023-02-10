/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidResourceError, TypeOperation, Validator } from '@aws/fhir-works-on-aws-interface';
import { validateXHTMLResource } from '../handlers/utils';

export async function validateResource(
  validators: Validator[],
  resourceType: string,
  resource: any,
  params: { tenantId?: string; typeOperation?: TypeOperation } = {}
): Promise<void> {
  if (resourceType !== resource.resourceType) {
    throw new InvalidResourceError(`not a valid '${resourceType}'`);
  }
  if (process.env.VALIDATE_XHTML === 'true' && !validateXHTMLResource(resource)) {
    throw new InvalidResourceError(`invalid resource html present in ${resourceType}`);
  }
  for (let i = 0; i < validators.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await validators[i].validate(resource, params);
  }
}
