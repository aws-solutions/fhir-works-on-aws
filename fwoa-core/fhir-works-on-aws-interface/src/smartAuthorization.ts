/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
export interface SmartAuthorization {
  /**
   * Retrieve SMART scopes that are supported by the Auth server
   * http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/index.html#quick-start
   * @returns a list of scopes supported by the Auth server
   */
  getSupportedSMARTScopes(): Promise<string[]>;
}
