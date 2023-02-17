/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { BulkDataAuth, ExportType, UnauthorizedError } from '@aws/fhir-works-on-aws-interface';
import { ScopeRule, ScopeType } from './smartConfig';
import {
  isScopeSufficient,
  convertScopeToSmartScope,
  filterOutUnusableScope,
  getScopes,
  getValidOperationsForScopeTypeAndAccessType,
  rejectInvalidScopeCombination,
  validateTokenScopes
} from './smartScopeHelper';

const emptyScopeRule = (): ScopeRule => ({
  patient: {
    read: [],
    write: []
  },
  user: {
    read: [],
    write: []
  },
  system: {
    read: [],
    write: []
  }
});
const isScopeSufficientCases: ScopeType[][] = [['user'], ['patient'], ['system']];
const exportTypes: ExportType[][] = [['group'], ['system']];
const exportOperations: ('cancel-export' | 'get-status-export')[][] = [
  ['cancel-export'],
  ['get-status-export']
];
describe.each(isScopeSufficientCases)('ScopeType: %s: isScopeSufficient', (scopeType: ScopeType) => {
  test('scope is sufficient to read Observation: Scope with resourceType "Observation" should be able to read "Observation" resources', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];

    expect(
      isScopeSufficient(`${scopeType}/Observation.read`, clonedScopeRule, 'read', false, 'Observation')
    ).toEqual(true);
  });

  test('scope is sufficient to read Observation: Scope with resourceType "*" should be able to read "Observation" resources', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];

    expect(isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', false, 'Observation')).toEqual(
      true
    );
  });

  test('scope is NOT sufficient to read Observation because scopeRule does not allow read operation', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['search-type'];

    expect(
      isScopeSufficient(`${scopeType}/Medication.read`, clonedScopeRule, 'read', false, 'Observation')
    ).toEqual(false);
  });

  test('scope is NOT sufficient to read Observation because resourceType does not match', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];

    expect(
      isScopeSufficient(`${scopeType}/Medication.read`, clonedScopeRule, 'read', false, 'Observation')
    ).toEqual(false);
  });

  test('scope is sufficient for system bulk data access with "user" || "system" scopeType but not "patient" scopeType', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];
    const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export', exportType: 'system' };

    // Only scopeType of user has bulkDataAccess
    expect(
      isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', true, undefined, bulkDataAuth)
    ).toEqual(scopeType !== 'patient');
  });

  test('scope is sufficient for system bulk data access with "user" scopeType but not "patient" and "system" scopeType', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];
    const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export', exportType: 'system' };

    // Only scopeType of user has bulkDataAccess
    expect(
      isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', false, undefined, bulkDataAuth)
    ).toEqual(scopeType === 'system');
  });

  test('scope is NOT sufficient for system bulk data access: Scope needs to have resourceType "*"', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];

    const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export', exportType: 'system' };
    expect(
      isScopeSufficient(
        `${scopeType}/Observation.read`,
        clonedScopeRule,
        'read',
        false,
        undefined,
        bulkDataAuth
      )
    ).toEqual(false);
  });

  test('scope is sufficient to do a search-system', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['search-system'];

    expect(isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'search-system', false)).toEqual(true);
  });
  test('scope is sufficient to do a history-system', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['history-system'];

    expect(isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'history-system', false)).toEqual(true);
  });
  test('scope is sufficient to do a transaction', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].write = ['transaction'];

    expect(isScopeSufficient(`${scopeType}/*.write`, clonedScopeRule, 'transaction', false)).toEqual(true);
  });
  test('scope is sufficient to do a batch', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].write = ['batch'];

    expect(isScopeSufficient(`${scopeType}/*.write`, clonedScopeRule, 'batch', false)).toEqual(true);
  });
  test('scope is insufficient to do a transaction', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];
    clonedScopeRule[scopeType].write = ['create'];

    expect(isScopeSufficient(`${scopeType}/*.*`, clonedScopeRule, 'transaction', false)).toEqual(false);
  });
  test('invalid; `read` scope with no resourceType', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule[scopeType].read = ['read'];

    expect(isScopeSufficient(`${scopeType}/Patient.*`, clonedScopeRule, 'read', false)).toEqual(false);
  });

  describe('BulkDataAuth', () => {
    test('scope is sufficient for `system` initiate-export with "user" || "system" scopeType but not "patient" scopeType', () => {
      const clonedScopeRule = emptyScopeRule();
      clonedScopeRule[scopeType].read = ['read'];
      const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export', exportType: 'system' };

      // Only scopeType of user has bulkDataAccess
      expect(
        isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', true, undefined, bulkDataAuth)
      ).toEqual(scopeType !== 'patient');
    });
    test('initiate-export: exportType is undefined; should fail', () => {
      const clonedScopeRule = emptyScopeRule();
      clonedScopeRule[scopeType].read = ['read'];
      const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export' };

      // Only scopeType of user has bulkDataAccess
      expect(
        isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', true, undefined, bulkDataAuth)
      ).toEqual(false);
    });

    test('scope is NOT sufficient for `system` initiate-export: Scope needs to have resourceType "*"', () => {
      const clonedScopeRule = emptyScopeRule();
      clonedScopeRule[scopeType].read = ['read'];

      const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export', exportType: 'system' };
      expect(
        isScopeSufficient(
          `${scopeType}/Observation.read`,
          clonedScopeRule,
          'read',
          false,
          undefined,
          bulkDataAuth
        )
      ).toEqual(false);
    });

    test('scope is sufficient for `group` initiate-export with "system" scopeType, not "user" or "patient" scopeType', () => {
      const clonedScopeRule = emptyScopeRule();
      clonedScopeRule[scopeType].read = ['read'];
      const bulkDataAuth: BulkDataAuth = { operation: 'initiate-export', exportType: 'group' };

      // Only scopeType of system has bulkDataAccess
      expect(
        isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', false, undefined, bulkDataAuth)
      ).toEqual(scopeType === 'system');

      // Group export should fail when resourceType is not "*"
      expect(
        isScopeSufficient(
          `${scopeType}/Observation.read`,
          clonedScopeRule,
          'read',
          false,
          undefined,
          bulkDataAuth
        )
      ).toEqual(false);
    });
    describe.each(exportTypes)('export type: %s', (exportType: ExportType) => {
      describe.each(exportOperations)(
        'export operation: %s',
        (operation: 'cancel-export' | 'get-status-export') => {
          test('scope is sufficient for non "patient" scopeType when isUserScopeAllowedForSystemExport is true', () => {
            const clonedScopeRule = emptyScopeRule();
            clonedScopeRule[scopeType].read = ['read'];
            const bulkDataAuth: BulkDataAuth = { operation, exportType };

            expect(
              isScopeSufficient(`${scopeType}/*.read`, clonedScopeRule, 'read', true, undefined, bulkDataAuth)
            ).toEqual(scopeType !== 'patient');

            expect(
              isScopeSufficient(
                `${scopeType}/Observation.read`,
                clonedScopeRule,
                'read',
                true,
                undefined,
                bulkDataAuth
              )
            ).toEqual(scopeType !== 'patient');
          });

          test('scope is sufficient for "system" scopeType when isUserScopeAllowedForSystemExport is false', () => {
            const clonedScopeRule = emptyScopeRule();
            clonedScopeRule[scopeType].read = ['read'];
            const bulkDataAuth: BulkDataAuth = { operation, exportType };

            expect(
              isScopeSufficient(
                `${scopeType}/*.read`,
                clonedScopeRule,
                'read',
                false,
                undefined,
                bulkDataAuth
              )
            ).toEqual(scopeType === 'system');

            expect(
              isScopeSufficient(
                `${scopeType}/Observation.read`,
                clonedScopeRule,
                'read',
                false,
                undefined,
                bulkDataAuth
              )
            ).toEqual(scopeType === 'system');
          });
        }
      );
    });
  });
});
test('isScopeSufficient: invalid scope non-smart', () => {
  const clonedScopeRule = emptyScopeRule();
  clonedScopeRule.system.read = ['read'];

  expect(isScopeSufficient(`fhirUser`, clonedScopeRule, 'read', false)).toEqual(false);
});

describe('getScopes', () => {
  test('scope type delimited by space', () => {
    expect(getScopes('launch/encounter user/*.read fake system/*.*')).toEqual([
      'launch/encounter',
      'user/*.read',
      'fake',
      'system/*.*'
    ]);
  });
  test('scope type as array', () => {
    expect(getScopes(['launch/encounter', 'user/*.read', 'fake', 'system/*.*'])).toEqual([
      'launch/encounter',
      'user/*.read',
      'fake',
      'system/*.*'
    ]);
  });
});
describe('filterOutUnusableScope', () => {
  test('no filter occuring', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    const expectedScopes = ['user/*.read', 'patient/*.*'];
    expect(
      filterOutUnusableScope(
        expectedScopes,
        clonedScopeRule,
        'read',
        false,
        'Patient',
        undefined,
        'launchPatient',
        'fhirUser'
      )
    ).toEqual(expectedScopes);
  });
  test('filter user; due to no fhirUser', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    const scopes = ['user/*.read', 'user/Patient.read', 'patient/*.*'];
    expect(
      filterOutUnusableScope(
        scopes,
        clonedScopeRule,
        'read',
        false,
        'Patient',
        undefined,
        'launchPatient',
        undefined
      )
    ).toEqual(['patient/*.*']);
  });
  test('filter user; due to scope being insufficient', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    const scopes = ['user/*.write', 'user/Patient.read', 'patient/*.*'];
    expect(
      filterOutUnusableScope(
        scopes,
        clonedScopeRule,
        'read',
        false,
        'Patient',
        undefined,
        'launchPatient',
        'fhirUser'
      )
    ).toEqual(['user/Patient.read', 'patient/*.*']);
  });
  test('filter patient; due to no launch context', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    const scopes = ['user/*.read', 'user/Patient.read', 'patient/*.*'];
    expect(
      filterOutUnusableScope(
        scopes,
        clonedScopeRule,
        'read',
        false,
        'Patient',
        undefined,
        undefined,
        'fhirUser'
      )
    ).toEqual(['user/*.read', 'user/Patient.read']);
  });
  test('filter patient; due to scope being insufficient', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    const scopes = ['user/Patient.read', 'patient/Obersvation.*', 'patient/*.read'];
    expect(
      filterOutUnusableScope(
        scopes,
        clonedScopeRule,
        'read',
        false,
        'Patient',
        undefined,
        'launchPatient',
        'fhirUser'
      )
    ).toEqual(['user/Patient.read', 'patient/*.read']);
  });

  test('filter system; due to scope being insufficient', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    clonedScopeRule.system.read = ['read'];
    const scopes = ['user/Patient.read', 'system/Obersvation.*', 'system/*.read'];
    expect(
      filterOutUnusableScope(
        scopes,
        clonedScopeRule,
        'read',
        false,
        'Patient',
        undefined,
        undefined,
        'fhirUser'
      )
    ).toEqual(['user/Patient.read', 'system/*.read']);
  });

  test('filter user & patient', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    expect(
      filterOutUnusableScope(
        ['launch', 'fhirUser', 'user/Patient.read', 'patient/Obersvation.*', 'patient/*.read'],
        clonedScopeRule,
        'read',
        false,
        'Patient'
      )
    ).toEqual([]);
  });

  test('filter user & patient; transaction use case', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['read'];
    clonedScopeRule.patient.read = ['read'];
    clonedScopeRule.system.write = ['transaction'];
    expect(
      filterOutUnusableScope(
        ['fhirUser', 'user/Patient.read', 'patient/Obersvation.*', 'patient/*.read', 'system/*.write'],
        clonedScopeRule,
        'transaction',
        false
      )
    ).toEqual(['system/*.write']);
  });

  test('filter out all system scope out in type-search use case when resource type does not match scopes', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.system.read = ['search-type'];
    clonedScopeRule.system.write = ['create'];
    expect(
      filterOutUnusableScope(
        ['system/DocumentReference.read', 'system/Patient.read', 'system/Practitioner.write'],
        clonedScopeRule,
        'search-type',
        false,
        'Practitioner'
      )
    ).toEqual([]);
  });
  test('filter out all user scope out in type-search use case when resource type does not match scopes', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['search-type'];
    expect(
      filterOutUnusableScope(
        ['user/DocumentReference.read', 'user/Patient.read'],
        clonedScopeRule,
        'search-type',
        false,
        'Practitioner',
        undefined,
        undefined,
        'fhirUser'
      )
    ).toEqual([]);
  });
  test('filter out all patient scope out in type-search use case when resource type does not match scopes', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['search-type'];
    expect(
      filterOutUnusableScope(
        ['patient/DocumentReference.read', 'patient/Patient.read'],
        clonedScopeRule,
        'search-type',
        false,
        'Practitioner',
        undefined,
        'patient'
      )
    ).toEqual([]);
  });
  test('SYSTEM Scope: do filter Patient resourceType scope out in type-search use case', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.system.read = ['search-type'];
    expect(
      filterOutUnusableScope(
        ['system/DocumentReference.read', 'system/Patient.read'],
        clonedScopeRule,
        'search-type',
        false,
        'DocumentReference'
      )
    ).toEqual(['system/DocumentReference.read']);
  });
  test('USER Scope: do filter Patient resourceType scope out in type-search use case', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.user.read = ['search-type'];
    expect(
      filterOutUnusableScope(
        ['user/DocumentReference.read', 'user/Patient.read'],
        clonedScopeRule,
        'search-type',
        false,
        'DocumentReference',
        undefined,
        undefined,
        'fhirUser'
      )
    ).toEqual(['user/DocumentReference.read']);
  });
  test('PATIENT Scope: do filter Patient resourceType scope out in type-search use case', () => {
    const clonedScopeRule = emptyScopeRule();
    clonedScopeRule.patient.read = ['search-type'];
    expect(
      filterOutUnusableScope(
        ['patient/DocumentReference.read', 'patient/Patient.read'],
        clonedScopeRule,
        'search-type',
        false,
        'DocumentReference',
        undefined,
        'patient'
      )
    ).toEqual(['patient/DocumentReference.read']);
  });
});

describe('getValidOperationsForScopeTypeAndAccessType', () => {
  const clonedScopeRule = emptyScopeRule();
  clonedScopeRule.user = {
    read: ['read'],
    write: ['create']
  };
  test('read scope', () => {
    const validOperations = getValidOperationsForScopeTypeAndAccessType('user', 'read', clonedScopeRule);
    expect(validOperations).toEqual(['read']);
  });

  test('write scope', () => {
    const validOperations = getValidOperationsForScopeTypeAndAccessType('user', 'write', clonedScopeRule);
    expect(validOperations).toEqual(['create']);
  });

  test('* scope', () => {
    const validOperations = getValidOperationsForScopeTypeAndAccessType('user', '*', clonedScopeRule);
    expect(validOperations).toEqual(['read', 'create']);
  });
});

describe('convertScopeToSmartScope', () => {
  test('launchScope', () => {
    const scope = 'launch/encounter';
    expect(() => {
      convertScopeToSmartScope(scope);
    }).toThrowError(new Error('Not a SmartScope'));
  });
  test('user clinicalScope', () => {
    const scope = 'user/Observation.read';
    expect(convertScopeToSmartScope(scope)).toEqual({
      accessType: 'read',
      resourceType: 'Observation',
      scopeType: 'user'
    });
  });
  test('patient clinicalScope', () => {
    const scope = 'patient/Fake.*';
    expect(convertScopeToSmartScope(scope)).toEqual({
      accessType: '*',
      resourceType: 'Fake',
      scopeType: 'patient'
    });
  });
});

describe('rejectInvalidScopeCombination', () => {
  test('reject system scope mixed with uer scope', () => {
    expect(() => {
      rejectInvalidScopeCombination(['system/Patient.read', 'user/Organization.read']);
    }).toThrowError(UnauthorizedError);
  });
  test('reject system scope mixed with patient scope', () => {
    expect(() => {
      rejectInvalidScopeCombination(['system/Patient.read', 'patient/Observation.read']);
    }).toThrowError(UnauthorizedError);
  });
  test('allow patient scope mixed with user scope', () => {
    expect(
      rejectInvalidScopeCombination(['user/Organization.read', 'patient/Encounter.read'])
    ).toBeUndefined();
  });
  test('allow system scope', () => {
    expect(rejectInvalidScopeCombination(['system/Patient.read'])).toBeUndefined();
  });
  test('allow multiple system scopes', () => {
    expect(
      rejectInvalidScopeCombination(['system/Organization.read', 'system/Patient.read'])
    ).toBeUndefined();
  });
});

describe('validateTokenScopes', () => {
  test('happy case', () => {
    //BUILD
    const scopes = ['user/*.read', 'user/Patient.read', 'patient/*.*'];
    //OPERATE & CHECK
    expect(validateTokenScopes(scopes, 'launchPatient', 'fhirUser')).toBeUndefined();
  });
  describe('invaild cases', () => {
    //BUILD
    const arrayScopesCases: [string[], string | undefined, string | undefined, string][] = [
      [
        ['user/*.read', 'user/Patient.read', 'patient/*.*'],
        'launchPatient',
        undefined,
        'Invalid user scopes in token.'
      ],
      [
        ['user/*.read', 'user/Patient.read', 'patient/*.*'],
        undefined,
        'fhirUser',
        'Invalid patient scopes in token.'
      ]
    ];
    test.each(arrayScopesCases)(
      'given scopes: %p, patient context: %p, and fhir context: %p error should be: %p',
      (scopes, patientContextClaim, fhirUserClaim, errorMessage) => {
        expect(() => {
          validateTokenScopes(scopes, patientContextClaim, fhirUserClaim);
        }).toThrow(errorMessage);
      }
    );
  });
});
