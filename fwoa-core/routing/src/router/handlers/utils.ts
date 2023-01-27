/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { createHash } from 'crypto';
import sanitizeHTML, { defaults } from 'sanitize-html';

export const hash = (o: any): any => createHash('sha256').update(JSON.stringify(o)).digest('hex');

export const validateXHTMLResource = (resource: any): boolean => {
  // we want to ignore the text field as it requires unencoded html as per the FHIR spec
  // https://www.hl7.org/fhir/datatypes-definitions.html#HumanName.text (for example)
  const originalResource = JSON.stringify({ ...resource, text: {} });
  const validatedResource = sanitizeHTML(originalResource, {
    allowedAttributes: {
      ...defaults.allowedAttributes,
      div: ['xmlns']
    }
  });
  return originalResource === validatedResource;
};
