/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirVersion, ProductInfo } from '@aws/fhir-works-on-aws-interface';

export default function makeStatement(
  rest: any,
  productInfo: ProductInfo,
  url: string,
  fhirVersion: FhirVersion
) {
  const cap: any = {
    resourceType: 'CapabilityStatement',
    name: productInfo.productMachineName ?? 'FhirServerCapabilityStatement',
    title: `${productInfo.productTitle ?? 'Fhir Server'} Capability Statement`,
    description: productInfo.productDescription ?? `A FHIR ${fhirVersion} Server Capability Statement`,
    purpose: productInfo.productPurpose ?? `A statement of this system's capabilities`,
    copyright: productInfo.copyright ?? undefined,
    status: 'active',
    date: new Date().toISOString(),
    publisher: productInfo.orgName,
    kind: 'instance',
    software: {
      name: productInfo.productTitle ?? 'FHIR Server',
      version: productInfo.productVersion ?? '1.0.0'
    },
    implementation: {
      description: productInfo.productDescription ?? `A FHIR ${fhirVersion} Server`,
      url
    },
    fhirVersion,
    format: ['json'],
    rest: [rest]
  };
  // TODO finalize
  if (fhirVersion !== '4.0.1') {
    cap.acceptUnknown = 'no';
  }
  return cap;
}
