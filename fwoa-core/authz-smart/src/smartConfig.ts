/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { KeyValueMap } from 'fhir-interface';
import { Headers } from 'jwks-rsa';

export type ScopeType = 'patient' | 'user' | 'system';
export type AccessModifier = 'read' | 'write' | '*';
export type IdentityType = 'Patient' | 'Practitioner' | 'Person ' | 'RelatedPerson';

export interface ClinicalSmartScope {
  scopeType: ScopeType;
  resourceType: string;
  accessType: AccessModifier;
}

export interface AccessRule {
  read: (
    | 'read'
    | 'vread'
    | 'history-type'
    | 'history-instance'
    | 'search-type'
    | 'transaction'
    | 'batch'
    | 'search-system'
    | 'history-system'
  )[];
  write: ('transaction' | 'batch' | 'create' | 'update' | 'delete' | 'patch')[];
}

/**
 * Determines what each scope has access to do
 * Scope `patient/Patient.read` maps to `scopeRule.patient.read` operations
 *  @example
 * {
 *      patient: {
 *          read: ['read','search-type'],
 *          write: [],
 *      },
 *      user: {
 *          read: ['read','search-type', 'vread'],
 *          write: ['transaction','update', 'patch', 'create'],
 *      },
 *      system: {
 *          read: ['read','search-type', 'vread'],
 *          write: [],
 *      },
 *  };
 */
export interface ScopeRule {
  patient: AccessRule;
  user: AccessRule;
  system: AccessRule;
}

export interface FhirResource {
  hostname: string;
  resourceType: string;
  id: string;
}

export interface UserIdentity extends KeyValueMap {
  scopes: string[];
  fhirUserObject?: FhirResource;
  patientLaunchContext?: FhirResource;
}

export interface IntrospectionOptions {
  /**
   * Your FHIR server's ID, typically generated by your idp.
   */
  clientId: string;
  /**
   * Your FHIR server's password, typically generated by your idp.
   */
  clientSecret: string;
  /**
   * The introspection url where we will send the access_token to get verified
   * @example http://www.authzserver.com/v1/introspect/
   */
  introspectUrl: string;
}

export interface SMARTConfig {
  version: number;
  /**
   * Within the access_token the scopes are typically sent in the 'scp' or 'scope' key
   */
  scopeKey: string;
  /**
   * Defined more below
   */
  scopeRule: ScopeRule;
  /**
   * Per SMART spec this is the 'aud' key found in the access_token
   *
   * Using the string type is recommended. RegExp can be useful when the audience is not static, such as in multi-tenant setups.
   * Caution must be taken to avoid overly permissive regular expressions (e.g. avoid using .*). Use regular expressions that are as specific as possible to avoid allowing requests from unexpected audiences.
   */
  expectedAudValue: string | RegExp;
  /**
   * Per SMART spec this is the 'iss' key found in the access_token
   */
  expectedIssValue: string;
  /**
   * Path of the claim found in the access_token that represents the requestors FHIR Id. SMART compliant AuthZ servers should use the `fhirUser` claim, but can use a path if needed.
   * @example fhirUser
   * @example ext.addedClaims.fhirUser
   */
  fhirUserClaimPath: 'fhirUser' | 'profile' | string;
  /**
   * Prefix of the path found in the access_token that represents the requestors launch context. The remaining part of the claim will identify the resource type i.e. `launch_response_patient`
   * @example launch_response_
   * @example ext.launch_response_
   */
  launchContextPathPrefix: string;
  /**
   * Json Web Key Set endpoint used to get the key for verifying access_token
   */
  jwksEndpoint?: string;
  /**
   * Headers that will be used for Json Web Key Set endpoint
   */
  jwksHeaders?: Headers;
  /**
   * Token introspection settings; if both introspection and jwksEndpoint are provided tokenIntrospection will be defaulted to.
   */
  tokenIntrospection?: IntrospectionOptions;
}
