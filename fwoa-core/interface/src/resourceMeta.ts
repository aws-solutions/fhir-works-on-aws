/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

// https://www.hl7.org/fhir/datatypes.html#Coding
export interface Coding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

// https://www.hl7.org/fhir/resource.html#Meta
export interface Meta {
  versionId: string;
  lastUpdated: string;
  source?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any | any[];
  security?: Coding | Coding[];
  tag?: Coding | Coding[];
}

export function generateMeta(vid: string, lastUpdatedDate: Date = new Date()): Meta {
  return {
    versionId: vid,
    lastUpdated: lastUpdatedDate.toISOString()
  };
}
