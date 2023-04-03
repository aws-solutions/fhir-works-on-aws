/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import {
  BulkDataAuth,
  SystemOperation,
  TypeOperation,
  UnauthorizedError
} from '@aws/fhir-works-on-aws-interface';
import getComponentLogger from './loggerBuilder';
import { AccessModifier, ClinicalSmartScope, ScopeRule, ScopeType } from './smartConfig';

const logger = getComponentLogger();

export const SEARCH_OPERATIONS: (TypeOperation | SystemOperation)[] = [
  'search-type',
  'search-system',
  'history-type',
  'history-instance',
  'history-system'
];

export const FHIR_SCOPE_REGEX =
  /^(?<scopeType>patient|user|system)\/(?<scopeResourceType>[A-Z][a-zA-Z]+|\*)\.(?<accessType>read|write|\*)$/;

export const FHIR_PATIENT_SCOPE_REGEX =
  /^(?<scopeType>patient)\/(?<scopeResourceType>[A-Z][a-zA-Z]+|\*)\.(?<accessType>read|write|\*)$/;

export const FHIR_USER_SCOPE_REGEX =
  /^(?<scopeType>user)\/(?<scopeResourceType>[A-Z][a-zA-Z]+|\*)\.(?<accessType>read|write|\*)$/;

export const FHIR_SYSTEM_SCOPE_REGEX =
  /^(?<scopeType>system)\/(?<scopeResourceType>[A-Z][a-zA-Z]+|\*)\.(?<accessType>read|write|\*)$/;

export function convertScopeToSmartScope(scope: string): ClinicalSmartScope {
  const matchClinicalScope = scope.match(FHIR_SCOPE_REGEX);
  if (matchClinicalScope) {
    const { scopeType, scopeResourceType, accessType } = matchClinicalScope.groups!;

    return {
      scopeType: <ScopeType>scopeType,
      resourceType: scopeResourceType,
      accessType: <AccessModifier>accessType
    };
  }

  throw new Error('Not a SmartScope');
}

export function getValidOperationsForScopeTypeAndAccessType(
  scopeType: ScopeType,
  accessType: AccessModifier,
  scopeRule: ScopeRule
): (TypeOperation | SystemOperation)[] {
  let validOperations: (TypeOperation | SystemOperation)[] = [];
  if (accessType === '*' || accessType === 'read') {
    validOperations = scopeRule[scopeType].read;
  }
  if (accessType === '*' || accessType === 'write') {
    validOperations = validOperations.concat(scopeRule[scopeType].write);
  }
  return validOperations;
}

function getValidOperationsForScope(
  smartScope: ClinicalSmartScope,
  scopeRule: ScopeRule,
  reqOperation: TypeOperation | SystemOperation,
  reqResourceType?: string
): (TypeOperation | SystemOperation)[] {
  let validOperations: (TypeOperation | SystemOperation)[] = [];
  const { scopeType, resourceType, accessType } = smartScope;
  if (reqResourceType) {
    if (resourceType === '*' || resourceType === reqResourceType) {
      validOperations = getValidOperationsForScopeTypeAndAccessType(scopeType, accessType, scopeRule);
    }
  }
  // 'search-system' and 'history-system' request operation requires '*' for scopeResourceType
  else if (
    (['search-system', 'history-system'].includes(reqOperation) && resourceType === '*') ||
    ['transaction', 'batch'].includes(reqOperation)
  ) {
    validOperations = getValidOperationsForScopeTypeAndAccessType(scopeType, accessType, scopeRule);
  }

  return validOperations;
}

export function getScopes(scopes: string | string[]): string[] {
  if (Array.isArray(scopes)) {
    return scopes;
  }
  if (typeof scopes === 'string') {
    return scopes.split(' ');
  }
  return [];
}

function isSmartScopeSufficientForBulkDataAccess(
  bulkDataAuth: BulkDataAuth,
  smartScope: ClinicalSmartScope,
  scopeRule: ScopeRule,
  isUserScopeAllowedForSystemExport: boolean
) {
  const { scopeType, accessType, resourceType } = smartScope;
  const hasReadPermissions = getValidOperationsForScopeTypeAndAccessType(
    scopeType,
    accessType,
    scopeRule
  ).includes('read');
  const hasSufficientScopeType = isUserScopeAllowedForSystemExport
    ? ['system', 'user'].includes(scopeType)
    : ['system'].includes(scopeType);
  if (bulkDataAuth.operation === 'initiate-export') {
    let bulkDataRequestHasCorrectScope = false;
    if (bulkDataAuth.exportType === 'system') {
      bulkDataRequestHasCorrectScope = hasSufficientScopeType && resourceType === '*' && hasReadPermissions;
    } else if (bulkDataAuth.exportType === 'group') {
      bulkDataRequestHasCorrectScope =
        ['system'].includes(scopeType) && hasReadPermissions && resourceType === '*';
    }
    return bulkDataRequestHasCorrectScope;
  }
  return (
    ['get-status-export', 'cancel-export'].includes(bulkDataAuth.operation) &&
    hasSufficientScopeType &&
    hasReadPermissions
  );
}

export function isScopeSufficient(
  scope: string,
  scopeRule: ScopeRule,
  reqOperation: TypeOperation | SystemOperation,
  isUserScopeAllowedForSystemExport: boolean,
  reqResourceType?: string,
  bulkDataAuth?: BulkDataAuth
): boolean {
  try {
    const smartScope = convertScopeToSmartScope(scope);
    if (bulkDataAuth) {
      return isSmartScopeSufficientForBulkDataAccess(
        bulkDataAuth,
        smartScope,
        scopeRule,
        isUserScopeAllowedForSystemExport
      );
    }
    const validOperations: (TypeOperation | SystemOperation)[] = getValidOperationsForScope(
      smartScope,
      scopeRule,
      reqOperation,
      reqResourceType
    );
    return validOperations.includes(reqOperation);
  } catch (e) {
    // Caused by trying to convert non-SmartScope to SmartScope, for example converting non-SMART scope 'openid'
    logger.debug((e as any).message);
  }
  return false;
}

export function rejectInvalidScopeCombination(scopes: string[]): void {
  if (
    scopes.some((scope: string) => FHIR_SYSTEM_SCOPE_REGEX.test(scope)) &&
    (scopes.some((scope: string) => FHIR_PATIENT_SCOPE_REGEX.test(scope)) ||
      scopes.some((scope: string) => FHIR_USER_SCOPE_REGEX.test(scope)))
  ) {
    throw new UnauthorizedError('Scopes defined in access_token are not a valid combination');
  }
}

/**
 * Remove scopes that do not have the required information to be useful or unused scopes. For example:
 * - Without the `fhirUser` claim the 'user' scopes cannot be validated
 * - Without the `launch_response_patient` claim the 'patient' scopes cannot be validated
 * - Scopes like profile, launch or fhirUser will be filtered out as well
 */
export function filterOutUnusableScope(
  scopes: string[],
  scopeRule: ScopeRule,
  reqOperation: TypeOperation | SystemOperation,
  isUserScopeAllowedForSystemExport: boolean,
  reqResourceType?: string,
  bulkDataAuth?: BulkDataAuth,
  patientContext?: string,
  fhirUser?: string
): string[] {
  const filteredScopes: string[] = scopes.filter(
    (scope: string) =>
      ((patientContext && FHIR_PATIENT_SCOPE_REGEX.test(scope)) ||
        (fhirUser && FHIR_USER_SCOPE_REGEX.test(scope)) ||
        FHIR_SYSTEM_SCOPE_REGEX.test(scope)) &&
      isScopeSufficient(
        scope,
        scopeRule,
        reqOperation,
        isUserScopeAllowedForSystemExport,
        reqResourceType,
        bulkDataAuth
      )
  );

  return filteredScopes;
}

export function validateTokenScopes(scopes: string[], patientContext?: string, fhirUser?: string): void {
  rejectInvalidScopeCombination(scopes);
  if (scopes.some((scope: string) => scope.startsWith('patient/')) && !patientContext) {
    throw new UnauthorizedError('Invalid patient scopes in token.');
  }
  if (scopes.some((scope: string) => scope.startsWith('user/')) && !fhirUser) {
    throw new UnauthorizedError('Invalid user scopes in token.');
  }
}
