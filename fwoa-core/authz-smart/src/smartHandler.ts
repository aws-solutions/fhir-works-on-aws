/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import {
  Authorization,
  VerifyAccessTokenRequest,
  AuthorizationBundleRequest,
  AllowedResourceTypesForOperationRequest,
  UnauthorizedError,
  ReadResponseAuthorizedRequest,
  WriteRequestAuthorizedRequest,
  AccessBulkDataJobRequest,
  BatchReadWriteRequest,
  BASE_R4_RESOURCES,
  FhirVersion,
  BASE_STU3_RESOURCES,
  GetSearchFilterBasedOnIdentityRequest,
  SearchFilter,
  clone
} from '@aws/fhir-works-on-aws-interface';
import { JwksClient } from 'jwks-rsa';
import get from 'lodash/get';
import getComponentLogger from './loggerBuilder';
import {
  getFhirResource,
  getFhirUser,
  getJwksClient,
  verifyJwtToken,
  introspectJwtToken,
  hasAccessToResource,
  hasSystemAccess,
  isFhirUserAdmin
} from './smartAuthorizationHelper';
import { SMARTConfig, UserIdentity } from './smartConfig';
import {
  convertScopeToSmartScope,
  FHIR_PATIENT_SCOPE_REGEX,
  FHIR_SYSTEM_SCOPE_REGEX,
  FHIR_USER_SCOPE_REGEX,
  filterOutUnusableScope,
  getScopes,
  getValidOperationsForScopeTypeAndAccessType,
  isScopeSufficient,
  SEARCH_OPERATIONS,
  validateTokenScopes
} from './smartScopeHelper';

const logger = getComponentLogger();

// eslint-disable-next-line import/prefer-default-export
export class SMARTHandler implements Authorization {
  /**
   * If a fhirUser is of these resourceTypes they will be able to READ & WRITE without having to meet the reference criteria
   */
  private readonly adminAccessTypes: string[];

  /**
   * If a fhirUser is of these resourceTypes they will be able to do bulk data operations
   */
  private readonly bulkDataAccessTypes: string[];

  private readonly version: number = 1.0;

  private readonly config: SMARTConfig;

  private readonly apiUrl: string;

  private readonly fhirVersion: FhirVersion;

  private readonly isUserScopeAllowedForSystemExport: boolean;

  private readonly jwksClient?: JwksClient;

  /**
   * @param apiUrl: URL of this FHIR service. Will be used to determine if a requestor is from this FHIR server or not
   * when the request does not include a fhirServiceBaseUrl
   * @param adminAccessTypes: a fhirUser from these resourceTypes they will be able to READ & WRITE without having to meet the reference criteria
   * @param bulkDataAccessTypes: a fhirUser from these resourceTypes they will be able to do bulk data operations
   */
  constructor(
    config: SMARTConfig,
    apiUrl: string,
    fhirVersion: FhirVersion,
    adminAccessTypes = ['Practitioner'],
    bulkDataAccessTypes = ['Practitioner'],
    isUserScopeAllowedForSystemExport = false
  ) {
    if (config.version !== this.version) {
      throw Error('Authorization configuration version does not match handler version');
    }
    this.config = config;
    this.apiUrl = apiUrl;
    this.fhirVersion = fhirVersion;
    this.adminAccessTypes = adminAccessTypes;
    this.bulkDataAccessTypes = bulkDataAccessTypes;
    this.isUserScopeAllowedForSystemExport = isUserScopeAllowedForSystemExport;
    if (this.config.jwksEndpoint && !this.config.tokenIntrospection) {
      this.jwksClient = getJwksClient(this.config.jwksEndpoint, this.config.jwksHeaders);
    }
  }

  async verifyAccessToken(request: VerifyAccessTokenRequest): Promise<UserIdentity> {
    let decodedToken: any;
    if (this.config.tokenIntrospection) {
      decodedToken = await introspectJwtToken(
        request.accessToken,
        this.config.expectedAudValue,
        this.config.expectedIssValue,
        this.config.tokenIntrospection
      );
    } else if (this.jwksClient) {
      decodedToken = await verifyJwtToken(
        request.accessToken,
        this.config.expectedAudValue,
        this.config.expectedIssValue,
        this.jwksClient
      );
    } else {
      throw Error(
        `Authorization configuration not properly set up. Either 'tokenIntrospection' or 'jwksEndpoint' must be present`
      );
    }

    const fhirUserClaim = get(decodedToken, this.config.fhirUserClaimPath);
    const patientContextClaim = get(decodedToken, `${this.config.launchContextPathPrefix}patient`);
    const fhirServiceBaseUrl = request.fhirServiceBaseUrl ?? this.apiUrl;

    // get just the scopes that apply to this request
    const scopes = getScopes(decodedToken[this.config.scopeKey]);
    validateTokenScopes(scopes, patientContextClaim, fhirUserClaim);
    const usableScopes = filterOutUnusableScope(
      scopes,
      this.config.scopeRule,
      request.operation,
      this.isUserScopeAllowedForSystemExport,
      request.resourceType,
      request.bulkDataAuth,
      patientContextClaim,
      fhirUserClaim
    );
    if (!usableScopes.length) {
      logger.warn('User supplied scopes are insufficient', {
        usableScopes,
        operation: request.operation,
        resourceType: request.resourceType
      });
      throw new UnauthorizedError('access_token does not have permission for requested operation');
    }
    const userIdentity: UserIdentity = clone(decodedToken);

    if (request.bulkDataAuth) {
      if (!userIdentity.sub) {
        logger.error('A JWT token is without a `sub` claim; we cannot process the bulk action without one.');
        throw new UnauthorizedError('User does not have permission for requested operation');
      }
      if (
        !usableScopes.some((scope: string) => {
          return FHIR_SYSTEM_SCOPE_REGEX.test(scope);
        })
      ) {
        // if requestor is relying on the "user" scope we need to verify they are coming from the correct endpoint & resourceType
        const fhirUser = getFhirUser(fhirUserClaim);
        if (
          fhirUser.hostname !== fhirServiceBaseUrl ||
          !this.bulkDataAccessTypes.includes(fhirUser.resourceType)
        ) {
          throw new UnauthorizedError('User does not have permission for requested operation');
        }
      }
    }

    if (fhirUserClaim && usableScopes.some((scope) => FHIR_USER_SCOPE_REGEX.test(scope))) {
      userIdentity.fhirUserObject = getFhirUser(fhirUserClaim);
    }
    if (patientContextClaim && usableScopes.some((scope) => FHIR_PATIENT_SCOPE_REGEX.test(scope))) {
      userIdentity.patientLaunchContext = getFhirResource(patientContextClaim, fhirServiceBaseUrl);
    }
    userIdentity.scopes = scopes;
    userIdentity.usableScopes = usableScopes;
    return userIdentity;
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  async isAccessBulkDataJobAllowed(request: AccessBulkDataJobRequest): Promise<void> {
    if (request.userIdentity.sub !== request.jobOwnerId) {
      throw new UnauthorizedError('User does not have permission to access this Bulk Data Export job');
    }
  }

  async getSearchFilterBasedOnIdentity(
    request: GetSearchFilterBasedOnIdentityRequest
  ): Promise<SearchFilter[]> {
    const references: Set<string> = new Set();
    const ids: Set<string> = new Set();
    const { fhirUserObject, patientLaunchContext, usableScopes } = request.userIdentity;
    const fhirServiceBaseUrl = request.fhirServiceBaseUrl ?? this.apiUrl;

    if (hasSystemAccess(usableScopes, '', 'read')) {
      return [];
    }

    if (fhirUserObject) {
      const { hostname, resourceType, id } = fhirUserObject;
      if (isFhirUserAdmin(fhirUserObject, this.adminAccessTypes, fhirServiceBaseUrl)) {
        // if an admin do not add limiting search filters
        return [];
      }
      references.add(`${hostname}/${resourceType}/${id}`);
      if (hostname === fhirServiceBaseUrl) {
        references.add(`${resourceType}/${id}`);
      }
      if (request.resourceType && request.resourceType === resourceType) {
        ids.add(id);
      }
    }

    if (patientLaunchContext) {
      const { hostname, resourceType, id } = patientLaunchContext;
      references.add(`${hostname}/${resourceType}/${id}`);
      if (hostname === fhirServiceBaseUrl) {
        references.add(`${resourceType}/${id}`);
      }
      if (request.resourceType && request.resourceType === resourceType) {
        ids.add(id);
      }
    }

    // Create a SearchFilter to limit access to only resources that are referring to the requesting user and/or context
    const filters: SearchFilter[] = [];
    if (references.size > 0) {
      filters.push({
        key: '_references',
        value: [...references],
        comparisonOperator: '==',
        logicalOperator: 'OR'
      });
    }
    if (ids.size > 0) {
      filters.push({
        key: 'id',
        value: [...ids],
        comparisonOperator: '==',
        logicalOperator: 'OR'
      });
    }

    return filters;
  }

  async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<void> {
    const { scopes, fhirUserObject, patientLaunchContext } = request.userIdentity;
    const usableScopes: string[] = scopes.filter(
      (scope: string) =>
        (patientLaunchContext && FHIR_PATIENT_SCOPE_REGEX.test(scope)) ||
        (fhirUserObject && FHIR_USER_SCOPE_REGEX.test(scope)) ||
        FHIR_SYSTEM_SCOPE_REGEX.test(scope)
    );

    // Are the scopes the request have good enough for every entry in the bundle?
    request.requests.forEach((req: BatchReadWriteRequest) => {
      if (
        !usableScopes.some((scope: string) =>
          isScopeSufficient(
            scope,
            this.config.scopeRule,
            req.operation,
            this.isUserScopeAllowedForSystemExport,
            req.resourceType
          )
        )
      ) {
        logger.error('User supplied scopes are insufficient', {
          usableScopes,
          operation: req.operation,
          resourceType: req.resourceType
        });
        throw new UnauthorizedError('An entry within the Bundle is not authorized');
      }
    });

    // Ensure the requestor has access to write this request
    const authWritePromises: Promise<void>[] = request.requests.map((req) => {
      if (['create', 'update', 'patch', 'delete'].includes(req.operation)) {
        return this.isWriteRequestAuthorized(<WriteRequestAuthorizedRequest>{
          userIdentity: { ...request.userIdentity, usableScopes },
          operation: req.operation,
          resourceBody: req.resource,
          fhirServiceBaseUrl: request.fhirServiceBaseUrl
        });
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(authWritePromises);
    } catch (e) {
      throw new UnauthorizedError('An entry within the Bundle is not authorized');
    }
  }

  async getAllowedResourceTypesForOperation(
    request: AllowedResourceTypesForOperationRequest
  ): Promise<string[]> {
    let allowedResources: string[] = [];
    const allResourceTypes: string[] = this.fhirVersion === '4.0.1' ? BASE_R4_RESOURCES : BASE_STU3_RESOURCES;
    for (let i = 0; i < request.userIdentity.scopes.length; i += 1) {
      const scope = request.userIdentity.scopes[i];
      try {
        // We only get allowedResourceTypes for ClinicalSmartScope
        const clinicalSmartScope = convertScopeToSmartScope(scope);
        const validOperations = getValidOperationsForScopeTypeAndAccessType(
          clinicalSmartScope.scopeType,
          clinicalSmartScope.accessType,
          this.config.scopeRule
        );
        if (validOperations.includes(request.operation)) {
          const scopeResourceType = clinicalSmartScope.resourceType;
          if (scopeResourceType === '*') {
            return allResourceTypes;
          }
          if (allResourceTypes.includes(scopeResourceType)) {
            allowedResources = allowedResources.concat(scopeResourceType);
          }
        }
      } catch (e) {
        // Caused by trying to convert non-SmartScope to SmartScope, for example converting scope 'openid' or 'profile'
        logger.debug((e as any).message);
      }
    }
    allowedResources = [...new Set(allowedResources)];
    return allowedResources;
  }

  async authorizeAndFilterReadResponse(request: ReadResponseAuthorizedRequest): Promise<any> {
    const { fhirUserObject, patientLaunchContext, usableScopes, scopes } = request.userIdentity;
    const fhirServiceBaseUrl = request.fhirServiceBaseUrl ?? this.apiUrl;

    const { operation, readResponse } = request;
    // If request is a search iterate over every response object
    // Must use all scopes, since a search may return more resourceTypes than just found in usableScopes
    if (SEARCH_OPERATIONS.includes(operation)) {
      const entries: any[] = (readResponse.entry ?? []).filter(
        (entry: { resource: any }) =>
          // Are the scopes the request have good enough for this entry?
          scopes.some((scope: string) =>
            isScopeSufficient(
              scope,
              this.config.scopeRule,
              operation,
              this.isUserScopeAllowedForSystemExport,
              entry.resource.resourceType
            )
          ) && // Does the user have permissions for this entry?
          hasAccessToResource(
            fhirUserObject,
            patientLaunchContext,
            entry.resource,
            scopes,
            this.adminAccessTypes,
            fhirServiceBaseUrl,
            this.fhirVersion,
            'read'
          )
      );
      let numTotal: number = readResponse.total;
      if (!numTotal) {
        numTotal = entries.length;
      } else {
        numTotal -= readResponse.entry.length - entries.length;
      }
      return { ...readResponse, entry: entries, total: numTotal };
    }
    // If request is != search treat the readResponse as just a resource
    if (
      hasAccessToResource(
        fhirUserObject,
        patientLaunchContext,
        readResponse,
        usableScopes,
        this.adminAccessTypes,
        fhirServiceBaseUrl,
        this.fhirVersion,
        'read'
      )
    ) {
      return readResponse;
    }

    throw new UnauthorizedError('User does not have permission for requested resource');
  }

  async isWriteRequestAuthorized(request: WriteRequestAuthorizedRequest): Promise<void> {
    const { fhirUserObject, patientLaunchContext, usableScopes } = request.userIdentity;
    const fhirServiceBaseUrl = request.fhirServiceBaseUrl ?? this.apiUrl;
    if (
      hasAccessToResource(
        fhirUserObject,
        patientLaunchContext,
        request.resourceBody,
        usableScopes,
        this.adminAccessTypes,
        fhirServiceBaseUrl,
        this.fhirVersion,
        'write'
      )
    ) {
      return;
    }

    throw new UnauthorizedError('User does not have permission for requested operation');
  }
}
