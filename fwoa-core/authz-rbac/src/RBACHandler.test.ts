/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import {
  R4Resource,
  BASE_R4_RESOURCES,
  TypeOperation,
  FhirVersion,
  BASE_STU3_RESOURCES,
  AccessBulkDataJobRequest,
  UnauthorizedError
} from '@aws/fhir-works-on-aws-interface';
import shuffle from 'shuffle-array';
import { RBACConfig } from './RBACConfig';
import { RBACHandler } from './RBACHandler';

const financialResources: R4Resource[] = [
  'Coverage',
  'CoverageEligibilityRequest',
  'CoverageEligibilityResponse',
  'EnrollmentRequest',
  'EnrollmentResponse',
  'Claim',
  'ClaimResponse',
  'Invoice',
  'PaymentNotice',
  'PaymentReconciliation',
  'Account',
  'ChargeItem',
  'ChargeItemDefinition',
  'Contract',
  'ExplanationOfBenefit',
  'InsurancePlan'
];

const RBACRules: RBACConfig = {
  version: 1.0,
  groupRules: {
    practitioner: {
      operations: ['create', 'read', 'update', 'delete', 'vread', 'search-type', 'transaction'],
      resources: [...financialResources, 'Patient']
    },
    'non-practitioner': {
      operations: ['read', 'vread', 'search-type'],
      resources: financialResources
    },
    auditor: {
      operations: ['read', 'vread', 'search-type'],
      resources: ['Patient']
    }
  }
};

const noGroupsAccessToken: string =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.kCA912Pb__JP54WjgZOazu1x8w5KU-kL0iRwQEVFNPw';

const nonPractAndAuditorAccessToken: string =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsibm9uLXByYWN0aXRpb25lciIsImF1ZGl0b3IiXSwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.HBNrpqQZPvj43qv1QNFr5u9PoHrtqK4ApsRpN2t7Rz8';

const practitionerAccessToken: string =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsicHJhY3RpdGlvbmVyIl0sIm5hbWUiOiJub3QgcmVhbCIsImlhdCI6MTUxNjIzOTAyMn0.bhZZ2O8Vph5aiPfs1n34Enw0075Tt4Cnk2FL2C3mHaQ';

const noGroupsDecoded = {
  sub: 'fake',
  name: 'not real',
  iat: 1516239022
};
const nonPractitionerDecoded = {
  sub: 'fake',
  'cognito:groups': ['non-practitioner', 'auditor'],
  name: 'not real',
  iat: 1516239022
};
const practitionerDecoded = {
  sub: 'fake',
  'cognito:groups': ['practitioner'],
  name: 'not real',
  iat: 1516239022
};

beforeEach(() => {
  expect.assertions(1);
});
describe('verifyAccessToken', () => {
  const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

  test('read direct patient with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: practitionerAccessToken,
        resourceType: 'Patient',
        operation: 'read',
        id: '1324'
      })
    ).resolves.toEqual(practitionerDecoded);
  });
  test('create direct patient with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: practitionerAccessToken,
        resourceType: 'Patient',
        operation: 'create'
      })
    ).resolves.toEqual(practitionerDecoded);
  });
  test('transaction with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: practitionerAccessToken,
        operation: 'transaction'
      })
    ).resolves.toEqual(practitionerDecoded);
  });
  test('update direct patient with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: practitionerAccessToken,
        resourceType: 'Patient',
        operation: 'update',
        id: '1324'
      })
    ).resolves.toEqual(practitionerDecoded);
  });
  test('DELETE patient with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: practitionerAccessToken,
        resourceType: 'Patient',
        operation: 'delete',
        id: '1324'
      })
    ).resolves.toEqual(practitionerDecoded);
  });

  test('patch patient with practitioner role; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: practitionerAccessToken,
        resourceType: 'Patient',
        operation: 'patch',
        id: '1324'
      })
    ).rejects.toThrowError(UnauthorizedError);
  });
  test('GET Patient with no groups; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: noGroupsAccessToken,
        resourceType: 'Patient',
        operation: 'read',
        id: '1324'
      })
    ).rejects.toThrowError(UnauthorizedError);
  });
  test('POST Patient with non-practitioner/auditor; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: nonPractAndAuditorAccessToken,
        resourceType: 'Patient',
        operation: 'create'
      })
    ).rejects.toThrowError(UnauthorizedError);
  });
  test('GET Patient with non-practitioner/auditor; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: nonPractAndAuditorAccessToken,
        resourceType: 'Patient',
        operation: 'read',
        id: '1324'
      })
    ).resolves.toEqual(nonPractitionerDecoded);
  });
  test('search patients with non-practitioner/auditor; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: nonPractAndAuditorAccessToken,
        resourceType: 'Patient',
        operation: 'search-type'
      })
    ).resolves.toEqual(nonPractitionerDecoded);
  });
  test('search globally with non-practitioner/auditor; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: nonPractAndAuditorAccessToken,
        operation: 'search-system'
      })
    ).rejects.toThrowError(UnauthorizedError);
  });
  test('read specific Patient history with non-practitioner/auditor role; expected: pass', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: nonPractAndAuditorAccessToken,
        resourceType: 'Patient',
        operation: 'vread',
        id: '1324',
        vid: '1324'
      })
    ).resolves.toEqual(nonPractitionerDecoded);
  });
  test('read Patients history; non-practitioner/auditor; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.verifyAccessToken({
        accessToken: nonPractAndAuditorAccessToken,
        resourceType: 'Patient',
        operation: 'history-type'
      })
    ).rejects.toThrowError(UnauthorizedError);
  });

  test('Attempt to create a handler to support a new config version; expected Error', async () => {
    expect(() => {
      // eslint-disable-next-line no-new
      new RBACHandler(
        {
          version: 2.0,
          groupRules: {}
        },
        '4.0.1'
      );
    }).toThrow(new Error('Configuration version does not match handler version'));
  });
});

describe('verifyAccessToken:Export', () => {
  const getTestPractitionerRBACRules = (operations: TypeOperation[], resources: any) => ({
    version: 1.0,
    groupRules: {
      practitioner: {
        operations,
        resources
      }
    }
  });

  const fhirVersions: FhirVersion[] = ['3.0.1', '4.0.1'];
  fhirVersions.forEach((fhirVersion: FhirVersion) => {
    const BASE_RESOURCES = fhirVersion === '3.0.1' ? BASE_STU3_RESOURCES : BASE_R4_RESOURCES;
    describe('initiate-export', () => {
      test(`TRUE:${fhirVersion}: GET system Export with permission to all resources`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], BASE_RESOURCES),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'system'
            }
          })
        ).resolves.toEqual(practitionerDecoded);
      });

      test(`TRUE:${fhirVersion}: GET system Export with permission to all resources, in mixed order`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], shuffle(BASE_RESOURCES, { copy: true })),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'system'
            }
          })
        ).resolves.toEqual(practitionerDecoded);
      });

      test(`FALSE:${fhirVersion}: GET system Export without permission to all resources`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], ['Patient', 'MedicationRequest']),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'system'
            }
          })
        ).rejects.toThrowError(UnauthorizedError);
      });

      test(`FALSE:${fhirVersion}: GET system Export with permission to CREATE all resources but not READ them`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['create'], BASE_RESOURCES),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'system'
            }
          })
        ).rejects.toThrowError(UnauthorizedError);
      });

      test(`TRUE:${fhirVersion}: GET patient Export with permission to some resources in Patient compartment`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], ['Patient', 'Group']),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'patient'
            }
          })
        ).resolves.toEqual(practitionerDecoded);
      });

      test(`FALSE:${fhirVersion}: GET patient Export without permission to any resources in Patient compartment`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], ['Binary', 'Bundle']),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'patient'
            }
          })
        ).rejects.toThrowError(UnauthorizedError);
      });

      test(`TRUE:${fhirVersion}: GET group Export with permission to some resources in Patient compartment`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], ['Patient', 'Account']),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'group'
            }
          })
        ).resolves.toEqual(practitionerDecoded);
      });

      test(`FALSE:${fhirVersion}: GET group Export without permission to any resources in Patient compartment`, async () => {
        const authZHandler: RBACHandler = new RBACHandler(
          getTestPractitionerRBACRules(['read'], ['Binary', 'Bundle']),
          fhirVersion
        );
        await expect(
          authZHandler.verifyAccessToken({
            accessToken: practitionerAccessToken,
            operation: 'read',
            bulkDataAuth: {
              operation: 'initiate-export',
              exportType: 'group'
            }
          })
        ).rejects.toThrowError(UnauthorizedError);
      });
    });

    test(`TRUE:${fhirVersion}: Get export job status`, async () => {
      const authZHandler: RBACHandler = new RBACHandler(
        getTestPractitionerRBACRules(['read'], BASE_RESOURCES),
        fhirVersion
      );
      await expect(
        authZHandler.verifyAccessToken({
          accessToken: practitionerAccessToken,
          operation: 'read',
          bulkDataAuth: {
            operation: 'get-status-export',
            exportType: 'system'
          }
        })
      ).resolves.toEqual(practitionerDecoded);
    });

    test(`TRUE:${fhirVersion}: Cancel export job`, async () => {
      const authZHandler: RBACHandler = new RBACHandler(
        getTestPractitionerRBACRules(['delete'], BASE_RESOURCES),
        fhirVersion
      );
      await expect(
        authZHandler.verifyAccessToken({
          accessToken: practitionerAccessToken,
          operation: 'delete',
          bulkDataAuth: {
            operation: 'cancel-export',
            exportType: 'system'
          }
        })
      ).resolves.toEqual(practitionerDecoded);
    });
  });
});

describe('isBundleRequestAuthorized', () => {
  const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

  test('create direct patient in bundle with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.isBundleRequestAuthorized({
        userIdentity: practitionerDecoded,
        requests: [{ operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' }]
      })
    ).resolves.not.toThrow();
  });

  test('create & read direct patient in bundle with practitioner role; expected: pass', async () => {
    await expect(
      authZHandler.isBundleRequestAuthorized({
        userIdentity: practitionerDecoded,
        requests: [
          { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
          { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' }
        ]
      })
    ).resolves.not.toThrow();
  });

  test('create & read direct patient in bundle with nonPractAndAuditor; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.isBundleRequestAuthorized({
        userIdentity: nonPractitionerDecoded,
        requests: [
          { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
          { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' }
        ]
      })
    ).rejects.toThrowError(UnauthorizedError);
  });
  test('create 2 patients in a bundle with nonPractAndAuditor role; expected: UnauthorizedError', async () => {
    await expect(
      authZHandler.isBundleRequestAuthorized({
        userIdentity: nonPractitionerDecoded,
        requests: [
          { operation: 'create', id: 'id1', resource: 'Patient/id', resourceType: 'Patient' },
          { operation: 'create', id: 'id2', resource: { active: true }, resourceType: 'Patient' }
        ]
      })
    ).rejects.toThrowError(UnauthorizedError);
  });
});
describe('authorizeAndFilterReadResponse', () => {
  const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

  test('authorize final read response; expected: pass', async () => {
    const expected = { id: 'id', resource: { active: true }, resourceType: 'Patient' };
    await expect(
      authZHandler.authorizeAndFilterReadResponse({
        userIdentity: practitionerDecoded,
        operation: 'read',
        readResponse: expected
      })
    ).resolves.toEqual(expected);
  });
  test('authorize final search response; expected: pass', async () => {
    const expected = { id: 'id214', resource: { active: true }, resourceType: 'Patient' };
    await expect(
      authZHandler.authorizeAndFilterReadResponse({
        userIdentity: practitionerDecoded,
        operation: 'search-type',
        readResponse: expected
      })
    ).resolves.toEqual(expected);
  });
});

describe('getAllowedResourceTypesForOperation', () => {
  test('Single group', async () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
    await expect(
      authZHandler.getAllowedResourceTypesForOperation({
        userIdentity: practitionerDecoded,
        operation: 'search-type'
      })
    ).resolves.toEqual([...financialResources, 'Patient']);
  });

  test('No groups', async () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
    await expect(
      authZHandler.getAllowedResourceTypesForOperation({
        userIdentity: noGroupsDecoded,
        operation: 'search-type'
      })
    ).resolves.toEqual([]);
  });

  test('Multiple groups', async () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
    await expect(
      authZHandler.getAllowedResourceTypesForOperation({
        userIdentity: nonPractitionerDecoded,
        operation: 'search-type'
      })
    ).resolves.toEqual([...financialResources, 'Patient']);
  });

  test('operation not allowed', async () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
    await expect(
      authZHandler.getAllowedResourceTypesForOperation({
        userIdentity: nonPractitionerDecoded,
        operation: 'history-instance'
      })
    ).resolves.toEqual([]);
  });
});

describe('isAllowedToAccessBulkDataJob', () => {
  const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

  test('TRUE: JobOwnerId and requesterUserId matches', async () => {
    const accessBulkDataJobRequest: AccessBulkDataJobRequest = {
      jobOwnerId: 'userId-1',
      userIdentity: { sub: 'userId-1' }
    };
    await expect(authZHandler.isAccessBulkDataJobAllowed(accessBulkDataJobRequest)).resolves.not.toThrow();
  });

  test('FALSE: JobOwnerId and requesterUserId does not match', async () => {
    const accessBulkDataJobRequest: AccessBulkDataJobRequest = {
      jobOwnerId: 'userId-1',
      userIdentity: { sub: 'userId-2' }
    };
    await expect(authZHandler.isAccessBulkDataJobAllowed(accessBulkDataJobRequest)).rejects.toThrowError(
      UnauthorizedError
    );
  });
});
