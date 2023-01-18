/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Authorization } from './authorization';
import { BulkDataAccess } from './bulkDataAccess';
import { Bundle } from './bundle';
import {
  ConfigVersion,
  FhirVersion,
  R4Resource,
  STU3Resource,
  SystemOperation,
  TypeOperation
} from './constants';
import { History } from './history';
import { Persistence } from './persistence';
import { Search } from './search';
import { Validator } from './validator';

/**
 * http://www.hl7.org/fhir/smart-app-launch/conformance/index.html#using-cs
 */
export interface OAuthStrategy {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  introspectionEndpoint?: string;
  revocationEndpoint?: string;
  registrationEndpoint?: string;
  managementEndpoint?: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export type tokenEndpointAuthMethod = 'client_secret_basic' | 'client_secret_post' | 'private_key_jwt';

/**
 * http://www.hl7.org/fhir/smart-app-launch/conformance/index.html#using-well-known
 */
export interface SmartStrategy extends OAuthStrategy {
  /**
   * array of strings representing SMART capabilities
   * https://www.hl7.org/fhir/valueset-smart-capabilities.html
   */
  capabilities: (
    | 'launch-ehr'
    | 'launch-standalone'
    | 'client-public'
    | 'client-confidential-symmetric'
    | 'sso-openid-connect'
    | 'context-passthrough-banner'
    | 'context-passthrough-style'
    | 'context-ehr-patient'
    | 'context-ehr-encounter'
    | 'context-standalone-patient'
    | 'context-standalone-encounter'
    | 'permission-offline'
    | 'permission-patient'
    | 'permission-user'
    | string
  )[];
  /**
   * array of scopes a client may request
   */
  scopesSupported?: string[];
  /**
   * array of OAuth2 response_type values that are supported
   */
  responseTypesSupported?: string[];
  /**
   * array of client authentication methods supported by the token endpoint.
   */
  tokenEndpointAuthMethodsSupported?: tokenEndpointAuthMethod[];
  /**
   * array of the supported JSON web signature algorithms for the token endpoint
   */
  tokenEndpointAuthSigningAlgValuesSupported?: string[];
  /**
   * URL of the dynamic client registration endpoint
   */
  registrationEndpoint?: string;
}

export interface Strategy {
  oauthPolicy?: OAuthStrategy | SmartStrategy;
  /**
   * http://hl7.org/fhir/ValueSet/restful-security-service
   */
  service?: 'OAuth' | 'SMART-on-FHIR' | 'NTLM' | 'Basic' | 'Kerberos' | 'Certificates';
}

export interface Auth {
  strategy: Strategy;
  authorization: Authorization;
}

export interface Server {
  url: string;
}

export interface Resource {
  operations: TypeOperation[];
  fhirVersions: FhirVersion[];
  persistence: Persistence;
  typeHistory: History;
  typeSearch: Search;
}

export interface GenericResource extends Resource {
  excludedR4Resources?: R4Resource[];
  excludedSTU3Resources?: STU3Resource[];
}

export interface Resources {
  [resourceName: string]: Resource;
}

export interface Profile {
  fhirVersion: FhirVersion;
  systemOperations: SystemOperation[];
  systemSearch: Search;
  systemHistory: History;
  bundle: Bundle;
  bulkDataAccess?: BulkDataAccess;
  genericResource?: GenericResource;
  resources?: Resources;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compiledImplementationGuides?: any;
}
/**
 * Used in the generation of the CapabilityStatement
 */
export interface ProductInfo {
  /**
   * Name of the organization publishing and operating the solution
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.publisher
   */
  orgName: string;
  /**
   * An identifier that is used to identify this version of the capability statement.
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.version
   */
  productVersion?: string;
  /**
   * A short, descriptive, user-friendly title for the capability statement.
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.title
   */
  productTitle?: string;
  /**
   * A description of the capability statement from a consumer's perspective.
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.description
   */
  productDescription?: string;
  /**
   * An identifier for the module to be used by machine processing applications such as code generation.
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.name
   */
  productMachineName?: string;
  /**
   * An explanation of the need and design of the capability statement.
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.purpose
   */
  productPurpose?: string;
  /**
   * A copyright statement relating to the capability statement.
   * See: https://www.hl7.org/fhir/capabilitystatement-definitions.html#CapabilityStatement.copyright
   */
  copyright?: string;
}

export interface MultiTenancyConfig {
  /**
   * Enable multi-tenancy.
   * This value is always true. To disable multi tenancy, remove the `multiTenancyConfig` altogether.
   */
  enableMultiTenancy: true;
  /**
   * When enabled, the tenantId is included on the server url to make it unique for each tenant. i.e. `<baseUrl>/tenant/<tenantId>`
   */
  useTenantSpecificUrl: boolean;
  /**
   * Path where the tenantId value is located on the JWT access token. For simple claims the path is simply the claim name.
   * @example "tenantId"
   * @example "nested.object.tenantId"
   */
  tenantIdClaimPath: string;
}

export interface FhirConfig {
  configVersion: ConfigVersion;
  productInfo: ProductInfo;
  auth: Auth;
  server: Server;
  profile: Profile;
  validators: Validator[];
  multiTenancyConfig?: MultiTenancyConfig;
}
