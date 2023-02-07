/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { stubs, Persistence } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import ConfigHandler from '../../configHandler';
import { OperationDefinitionRegistry } from '../../operationDefinitions/OperationDefinitionRegistry';
import { utcTimeRegExp } from '../../regExpressions';
import { FHIRStructureDefinitionRegistry } from '../../registry';
import r4FhirConfigGeneric from '../../sampleData/r4FhirConfigGeneric';
import r4FhirConfigNoGeneric from '../../sampleData/r4FhirConfigNoGeneric';
import r4FhirConfigWithExclusions from '../../sampleData/r4FhirConfigWithExclusions';
import stu3FhirConfigWithExclusions from '../../sampleData/stu3FhirConfigWithExclusions';
import JsonSchemaValidator from '../validation/jsonSchemaValidator';
import { makeOperation } from './cap.rest.resource.template';
import MetadataHandler from './metadataHandler';

const r4Validator = new JsonSchemaValidator('4.0.1');
const stu3Validator = new JsonSchemaValidator('3.0.1');

const SUPPORTED_R4_RESOURCES = [
  'Account',
  'ActivityDefinition',
  'AdverseEvent',
  'AllergyIntolerance',
  'Appointment',
  'AppointmentResponse',
  'AuditEvent',
  'Basic',
  'Binary',
  'BiologicallyDerivedProduct',
  'BodyStructure',
  'Bundle',
  'CapabilityStatement',
  'CarePlan',
  'CareTeam',
  'CatalogEntry',
  'ChargeItem',
  'ChargeItemDefinition',
  'Claim',
  'ClaimResponse',
  'ClinicalImpression',
  'CodeSystem',
  'Communication',
  'CommunicationRequest',
  'CompartmentDefinition',
  'Composition',
  'ConceptMap',
  'Condition',
  'Consent',
  'Contract',
  'Coverage',
  'CoverageEligibilityRequest',
  'CoverageEligibilityResponse',
  'DetectedIssue',
  'Device',
  'DeviceDefinition',
  'DeviceMetric',
  'DeviceRequest',
  'DeviceUseStatement',
  'DiagnosticReport',
  'DocumentManifest',
  'DocumentReference',
  'EffectEvidenceSynthesis',
  'Encounter',
  'Endpoint',
  'EnrollmentRequest',
  'EnrollmentResponse',
  'EpisodeOfCare',
  'EventDefinition',
  'Evidence',
  'EvidenceVariable',
  'ExampleScenario',
  'ExplanationOfBenefit',
  'FamilyMemberHistory',
  'Flag',
  'Goal',
  'GraphDefinition',
  'Group',
  'GuidanceResponse',
  'HealthcareService',
  'ImagingStudy',
  'Immunization',
  'ImmunizationEvaluation',
  'ImmunizationRecommendation',
  'ImplementationGuide',
  'InsurancePlan',
  'Invoice',
  'Library',
  'Linkage',
  'List',
  'Location',
  'Measure',
  'MeasureReport',
  'Media',
  'Medication',
  'MedicationAdministration',
  'MedicationDispense',
  'MedicationKnowledge',
  'MedicationRequest',
  'MedicationStatement',
  'MedicinalProduct',
  'MedicinalProductAuthorization',
  'MedicinalProductContraindication',
  'MedicinalProductIndication',
  'MedicinalProductIngredient',
  'MedicinalProductOperation',
  'MedicinalProductManufactured',
  'MedicinalProductPackaged',
  'MedicinalProductPharmaceutical',
  'MedicinalProductUndesirableEffect',
  'MessageDefinition',
  'MessageHeader',
  'MolecularSequence',
  'NamingSystem',
  'NutritionOrder',
  'Observation',
  'ObservationDefinition',
  'OperationDefinition',
  'OperationOutcome',
  'Organization',
  'OrganizationAffiliation',
  'Parameters',
  'Patient',
  'PaymentNotice',
  'PaymentReconciliation',
  'Person',
  'PlanDefinition',
  'Practitioner',
  'PractitionerRole',
  'Procedure',
  'Provenance',
  'Questionnaire',
  'QuestionnaireResponse',
  'RelatedPerson',
  'RequestGroup',
  'ResearchDefinition',
  'ResearchElementDefinition',
  'ResearchStudy',
  'ResearchSubject',
  'RiskAssessment',
  'RiskEvidenceSynthesis',
  'Schedule',
  'SearchParameter',
  'ServiceRequest',
  'Slot',
  'Specimen',
  'SpecimenDefinition',
  'StructureDefinition',
  'StructureMap',
  'Subscription',
  'Substance',
  'SubstancePolymer',
  'SubstanceProtein',
  'SubstanceReferenceInformation',
  'SubstanceSpecification',
  'SubstanceSourceMaterial',
  'SupplyDelivery',
  'SupplyRequest',
  'Task',
  'TerminologyCapabilities',
  'TestReport',
  'TestScript',
  'ValueSet',
  'VerificationResult',
  'VisionPrescription'
];

const SUPPORTED_STU3_RESOURCES = [
  'Account',
  'ActivityDefinition',
  'AdverseEvent',
  'AllergyIntolerance',
  'Appointment',
  'AppointmentResponse',
  'AuditEvent',
  'Basic',
  'Binary',
  'BodySite',
  'Bundle',
  'CapabilityStatement',
  'CarePlan',
  'CareTeam',
  'ChargeItem',
  'Claim',
  'ClaimResponse',
  'ClinicalImpression',
  'CodeSystem',
  'Communication',
  'CommunicationRequest',
  'CompartmentDefinition',
  'Composition',
  'ConceptMap',
  'Condition',
  'Consent',
  'Contract',
  'Coverage',
  'DataElement',
  'DetectedIssue',
  'Device',
  'DeviceComponent',
  'DeviceMetric',
  'DeviceRequest',
  'DeviceUseStatement',
  'DiagnosticReport',
  'DocumentManifest',
  'DocumentReference',
  'EligibilityRequest',
  'EligibilityResponse',
  'Encounter',
  'Endpoint',
  'EnrollmentRequest',
  'EnrollmentResponse',
  'EpisodeOfCare',
  'ExpansionProfile',
  'ExplanationOfBenefit',
  'FamilyMemberHistory',
  'Flag',
  'Goal',
  'GraphDefinition',
  'Group',
  'GuidanceResponse',
  'HealthcareService',
  'ImagingManifest',
  'ImagingStudy',
  'Immunization',
  'ImmunizationRecommendation',
  'ImplementationGuide',
  'Library',
  'Linkage',
  'List',
  'Location',
  'Measure',
  'MeasureReport',
  'Media',
  'Medication',
  'MedicationAdministration',
  'MedicationDispense',
  'MedicationRequest',
  'MedicationStatement',
  'MessageDefinition',
  'MessageHeader',
  'NamingSystem',
  'NutritionOrder',
  'Observation',
  'OperationDefinition',
  'OperationOutcome',
  'Organization',
  'Parameters',
  'Patient',
  'PaymentNotice',
  'PaymentReconciliation',
  'Person',
  'PlanDefinition',
  'Practitioner',
  'PractitionerRole',
  'Procedure',
  'ProcedureRequest',
  'ProcessRequest',
  'ProcessResponse',
  'Provenance',
  'Questionnaire',
  'QuestionnaireResponse',
  'ReferralRequest',
  'RelatedPerson',
  'RequestGroup',
  'ResearchStudy',
  'ResearchSubject',
  'RiskAssessment',
  'Schedule',
  'SearchParameter',
  'Sequence',
  'ServiceDefinition',
  'Slot',
  'Specimen',
  'StructureDefinition',
  'StructureMap',
  'Subscription',
  'Substance',
  'SupplyDelivery',
  'SupplyRequest',
  'Task',
  'TestScript',
  'TestReport',
  'ValueSet',
  'VisionPrescription'
];

const overrideStubs = {
  search: {
    getCapabilities: async () => ({
      AllergyIntolerance: {
        searchParam: [
          {
            name: 'some-search-field',
            type: 'string',
            documentation: 'docs for some search field'
          }
        ]
      },
      Organization: {
        searchParam: [
          {
            name: 'some-search-field',
            type: 'string',
            documentation: 'docs for some search field'
          }
        ]
      },
      Account: {
        searchParam: [
          {
            name: 'some-search-field',
            type: 'string',
            documentation: 'docs for some search field'
          }
        ]
      },
      Patient: {
        searchParam: [
          {
            name: 'some-search-field',
            type: 'string',
            documentation: 'docs for some search field'
          }
        ]
      }
    })
  }
};
const registry: FHIRStructureDefinitionRegistry = new FHIRStructureDefinitionRegistry();

const operationRegistryMock: OperationDefinitionRegistry = {
  getCapabilities: jest.fn().mockReturnValue({
    Account: {
      operation: [
        {
          definition: 'https://fwoa.com/operation/fakeOperation',
          documentation: 'The documentation for the fakeOperation',
          name: 'fakeOperation'
        }
      ]
    }
  })
} as unknown as OperationDefinitionRegistry;

describe('ERROR: test cases', () => {
  beforeEach(() => {
    // Ensures that for each test, we test the assertions in the catch block
    expect.hasAssertions();
  });
  test('STU3: Asking for V4 when only supports V3', async () => {
    // BUILD
    const configHandler: ConfigHandler = new ConfigHandler(
      stu3FhirConfigWithExclusions(),
      SUPPORTED_STU3_RESOURCES
    );
    const metadataHandler: MetadataHandler = new MetadataHandler(
      configHandler,
      registry,
      operationRegistryMock
    );
    try {
      // OPERATE
      await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });
    } catch (e) {
      // CHECK
      expect((e as any).name).toEqual('NotFoundError');
      expect((e as any).statusCode).toEqual(404);
      expect((e as any).message).toEqual(`FHIR version 4.0.1 is not supported`);
    }
  });

  test('R4: Asking for V3 when only supports V4', async () => {
    // BUILD
    const configHandler: ConfigHandler = new ConfigHandler(
      r4FhirConfigGeneric(overrideStubs),
      SUPPORTED_R4_RESOURCES
    );
    const metadataHandler: MetadataHandler = new MetadataHandler(
      configHandler,
      registry,
      operationRegistryMock
    );
    try {
      // OPERATE
      await metadataHandler.capabilities({ fhirVersion: '3.0.1', mode: 'full' });
    } catch (e) {
      // CHECK
      expect((e as any).name).toEqual('NotFoundError');
      expect((e as any).statusCode).toEqual(404);
      expect((e as any).message).toEqual(`FHIR version 3.0.1 is not supported`);
    }
  });
});

test('STU3: FHIR Config V3 with 2 exclusions and search', async () => {
  const config = stu3FhirConfigWithExclusions(overrideStubs);
  const supportedGenericResources = ['AllergyIntolerance', 'Organization', 'Account', 'Patient'];
  const configHandler: ConfigHandler = new ConfigHandler(config, supportedGenericResources);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock,
    true
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '3.0.1', mode: 'full' });
  const { genericResource } = config.profile;
  const excludedResources = genericResource ? genericResource.excludedSTU3Resources || [] : [];
  const expectedSubset = {
    acceptUnknown: 'no',
    fhirVersion: '3.0.1'
  };
  expect(response.resource).toBeDefined();
  expect(response.resource).toMatchObject(expectedSubset);
  expect(response.resource.rest.length).toEqual(1);
  expect(response.resource.rest[0].resource.length).toEqual(3); // only AllergyIntolerance is excluded out of the 4 supportedGenericResources for this test
  expect(response.resource.rest[0].security.cors).toBeTruthy();
  // see if just READ is chosen for generic
  let isExcludedResourceFound = false;
  response.resource.rest[0].resource.forEach((resource: any) => {
    if (excludedResources.includes(resource.type)) {
      isExcludedResourceFound = true;
    }
    const expectedResourceSubset = {
      interaction: makeOperation(['read', 'create', 'update', 'vread', 'search-type']),
      updateCreate: configHandler.config.profile.genericResource!.persistence.updateCreateSupported,
      searchParam: [
        {
          name: 'some-search-field',
          type: 'string',
          documentation: 'docs for some search field'
        }
      ]
    };
    expect(resource).toMatchObject(expectedResourceSubset);
  });
  expect(isExcludedResourceFound).toBeFalsy();

  expect(response.resource.rest[0].interaction).toEqual(makeOperation(config.profile.systemOperations));
  expect(response.resource.rest[0].searchParam).toBeUndefined();
  await expect(stu3Validator.validate(response.resource)).resolves.toEqual(undefined);
});
test('R4: FHIR Config V4 without search', async () => {
  const configHandler: ConfigHandler = new ConfigHandler(
    r4FhirConfigGeneric(overrideStubs),
    SUPPORTED_R4_RESOURCES
  );
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });
  expect(response.resource).toBeDefined();
  expect(response.resource.acceptUnknown).toBeUndefined();
  expect(response.resource.fhirVersion).toEqual('4.0.1');
  expect(response.resource.rest.length).toEqual(1);
  expect(response.resource.rest[0].resource.length).toEqual(SUPPORTED_R4_RESOURCES.length);
  expect(response.resource.rest[0].security.cors).toBeFalsy();
  expect(response.resource.rest[0].resource[0]).toMatchInlineSnapshot(`
        Object {
          "conditionalCreate": false,
          "conditionalDelete": "not-supported",
          "conditionalRead": "not-supported",
          "conditionalUpdate": false,
          "interaction": Array [
            Object {
              "code": "create",
            },
            Object {
              "code": "read",
            },
            Object {
              "code": "update",
            },
            Object {
              "code": "delete",
            },
            Object {
              "code": "vread",
            },
            Object {
              "code": "history-instance",
            },
          ],
          "operation": Array [
            Object {
              "definition": "https://fwoa.com/operation/fakeOperation",
              "documentation": "The documentation for the fakeOperation",
              "name": "fakeOperation",
            },
          ],
          "readHistory": false,
          "type": "Account",
          "updateCreate": false,
          "versioning": "versioned",
        }
    `);
  expect(response.resource.rest[0].interaction).toEqual(
    makeOperation(r4FhirConfigGeneric(overrideStubs).profile.systemOperations)
  );
  expect(response.resource.rest[0].searchParam).toBeUndefined();
  await expect(r4Validator.validate(response.resource)).resolves.toEqual(undefined);
});

test('R4: FHIR Config V4 with 3 exclusions and AllergyIntollerance special', async () => {
  const config = r4FhirConfigWithExclusions(overrideStubs);
  const configHandler: ConfigHandler = new ConfigHandler(config, SUPPORTED_R4_RESOURCES);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });
  const { genericResource } = config.profile;
  const excludedResources = genericResource ? genericResource.excludedR4Resources || [] : [];
  expect(response.resource).toBeDefined();
  expect(response.resource.acceptUnknown).toBeUndefined();
  expect(response.resource.fhirVersion).toEqual('4.0.1');
  expect(response.resource.rest.length).toEqual(1);
  expect(response.resource.rest[0].resource.length).toEqual(
    SUPPORTED_R4_RESOURCES.length - excludedResources.length
  );
  expect(response.resource.rest[0].security.cors).toBeFalsy();
  // see if just READ is chosen for generic
  let isExclusionFound = false;
  response.resource.rest[0].resource.forEach((resource: any) => {
    if (excludedResources.includes(resource.type)) {
      isExclusionFound = true;
    }

    let expectedResourceSubset = {};

    if (resource.type === 'AllergyIntolerance') {
      expectedResourceSubset = {
        interaction: makeOperation(['create', 'update']),
        updateCreate: configHandler.config.profile.genericResource!.persistence.updateCreateSupported
      };
    } else {
      expectedResourceSubset = {
        interaction: makeOperation(['read', 'history-instance', 'history-type']),
        updateCreate: configHandler.config.profile.genericResource!.persistence.updateCreateSupported
      };
    }
    expect(resource).toMatchObject(expectedResourceSubset);
    expect(resource.searchParam).toBeUndefined();
  });
  expect(isExclusionFound).toBeFalsy();
  expect(response.resource.rest[0].interaction).toEqual(makeOperation(config.profile.systemOperations));
  expect(response.resource.rest[0].searchParam).toBeDefined();
  await expect(r4Validator.validate(response.resource)).resolves.toEqual(undefined);
});

test('R4: FHIR Config V4 no generic set-up & mix of STU3 & R4', async () => {
  const config = r4FhirConfigNoGeneric(overrideStubs);
  const configHandler: ConfigHandler = new ConfigHandler(config, SUPPORTED_R4_RESOURCES);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const configResource: any = config.profile.resources;
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });
  expect(response.resource).toBeDefined();
  expect(response.resource.acceptUnknown).toBeUndefined();
  expect(response.resource.fhirVersion).toEqual('4.0.1');
  expect(response.resource.rest.length).toEqual(1);
  expect(response.resource.rest[0].resource.length).toEqual(3);
  expect(response.resource.rest[0].security.cors).toBeFalsy();
  // see if just READ is chosen for generic
  let isSTU3ResourceFound = false;
  response.resource.rest[0].resource.forEach((resource: any) => {
    if (resource.type === 'AllergyIntolerance') {
      isSTU3ResourceFound = true;
    }
    const expectedResourceSubset = {
      interaction: makeOperation(configResource[resource.type].operations),
      updateCreate: configHandler.config.profile.resources![resource.type].persistence.updateCreateSupported
    };
    expect(resource).toMatchObject(expectedResourceSubset);
    if (configResource[resource.type].operations.includes('search-type')) {
      expect(resource.searchParam).toBeDefined();
    } else {
      expect(resource.searchParam).toBeUndefined();
    }
  });
  expect(isSTU3ResourceFound).toBeFalsy();
  expect(response.resource.rest[0].interaction).toEqual(
    makeOperation(r4FhirConfigNoGeneric().profile.systemOperations)
  );
  expect(response.resource.rest[0].searchParam).toBeDefined();
  await expect(r4Validator.validate(response.resource)).resolves.toEqual(undefined);
});

each([
  ['Generic Resources: updateCreate = true', true, r4FhirConfigGeneric],
  ['Generic Resources: updateCreate = false', false, r4FhirConfigGeneric],
  ['Special Resources: updateCreate = true', true, r4FhirConfigNoGeneric],
  ['Special Resources: updateCreate = false', false, r4FhirConfigNoGeneric]
]).test(
  'R4: FHIR Config with %s',
  async (testName: string, updateCreateSupported: boolean, fhirConfigBuilder: any) => {
    const persistence: Persistence = {
      ...stubs.persistence,
      updateCreateSupported
    };

    const fhirConfig = fhirConfigBuilder({ persistence, ...overrideStubs });

    const configHandler: ConfigHandler = new ConfigHandler(fhirConfig, SUPPORTED_R4_RESOURCES);
    const metadataHandler: MetadataHandler = new MetadataHandler(
      configHandler,
      registry,
      operationRegistryMock
    );
    const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });
    response.resource.rest[0].resource.forEach((resource: any) => {
      const expectedResourceSubset = {
        updateCreate: updateCreateSupported
      };
      expect(resource).toMatchObject(expectedResourceSubset);
    });
  }
);

test('R4: FHIR Config V4 with bulkDataAccess', async () => {
  const r4ConfigWithBulkDataAccess = r4FhirConfigGeneric(overrideStubs);
  r4ConfigWithBulkDataAccess.profile.bulkDataAccess = stubs.bulkDataAccess;
  const configHandler: ConfigHandler = new ConfigHandler(r4ConfigWithBulkDataAccess, SUPPORTED_R4_RESOURCES);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });

  expect(response.resource.rest[0].operation).toMatchInlineSnapshot(`
        Array [
          Object {
            "definition": "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/export",
            "documentation": "This FHIR Operation initiates the asynchronous generation of data to which the client is authorized. For more information please refer here: http://hl7.org/fhir/uv/bulkdata/export/index.html#bulk-data-kick-off-request. After a bulk data request has been started, the client MAY poll the status URL provided in the Content-Location header. For more details please refer here: http://hl7.org/fhir/uv/bulkdata/export/index.html#bulk-data-status-request",
            "name": "export",
          },
        ]
    `);
  expect(response.resource.rest[0].resource.find((r: any) => r.type === 'Group')?.operation)
    .toMatchInlineSnapshot(`
        Array [
          Object {
            "definition": "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/group-export",
            "documentation": "This FHIR Operation initiates the asynchronous generation of data for a given Group. For more information please refer here: http://hl7.org/fhir/uv/bulkdata/export/index.html#endpoint---group-of-patients. After a bulk data request has been started, the client MAY poll the status URL provided in the Content-Location header. For more details please refer here: http://hl7.org/fhir/uv/bulkdata/export/index.html#bulk-data-status-request",
            "name": "group-export",
          },
        ]
    `);
});

test('R4: FHIR Config V4 without bulkDataAccess', async () => {
  const configHandler: ConfigHandler = new ConfigHandler(
    r4FhirConfigGeneric(overrideStubs),
    SUPPORTED_R4_RESOURCES
  );
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });

  expect(response.resource.rest[0].operation).toBeUndefined();
  expect(response.resource.rest[0].resource.find((r: any) => r.type === 'Group')?.operation).toBeUndefined();
});

test('R4: FHIR Config V4 with all Oauth Policy endpoints', async () => {
  const r4ConfigWithOauthEndpoints = r4FhirConfigGeneric(overrideStubs);
  r4ConfigWithOauthEndpoints.auth.strategy = {
    service: 'OAuth',
    oauthPolicy: {
      tokenEndpoint: 'http://fhir-server.com/token',
      authorizationEndpoint: 'http://fhir-server.com/authorize',
      managementEndpoint: 'http://fhir-server.com/manage',
      introspectionEndpoint: 'http://fhir-server.com/introspect',
      revocationEndpoint: 'http://fhir-server.com/revoke',
      registrationEndpoint: 'http://fhir-server.com/register'
    }
  };
  const configHandler: ConfigHandler = new ConfigHandler(r4ConfigWithOauthEndpoints, SUPPORTED_R4_RESOURCES);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });

  expect(response.resource.rest[0].security).toEqual({
    cors: false,
    description: 'Uses OAuth2 as a way to authentication & authorize users',
    extension: [
      {
        extension: [
          {
            url: 'token',
            valueUri: 'http://fhir-server.com/token'
          },
          {
            url: 'authorize',
            valueUri: 'http://fhir-server.com/authorize'
          },
          {
            url: 'manage',
            valueUri: 'http://fhir-server.com/manage'
          },
          {
            url: 'introspect',
            valueUri: 'http://fhir-server.com/introspect'
          },
          {
            url: 'revoke',
            valueUri: 'http://fhir-server.com/revoke'
          },
          {
            url: 'register',
            valueUri: 'http://fhir-server.com/register'
          }
        ],
        url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
      }
    ],
    service: [
      {
        coding: [
          {
            code: 'OAuth',
            system: 'http://terminology.hl7.org/CodeSystem/restful-security-service'
          }
        ]
      }
    ]
  });
});

test('R4: FHIR Config V4 with some Oauth Policy endpoints', async () => {
  const r4ConfigWithOauthEndpoints = r4FhirConfigGeneric(overrideStubs);
  r4ConfigWithOauthEndpoints.auth.strategy = {
    service: 'OAuth',
    oauthPolicy: {
      tokenEndpoint: 'http://fhir-server.com/token',
      authorizationEndpoint: 'http://fhir-server.com/authorize',
      managementEndpoint: 'http://fhir-server.com/manage'
    }
  };
  const configHandler: ConfigHandler = new ConfigHandler(r4ConfigWithOauthEndpoints, SUPPORTED_R4_RESOURCES);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });

  expect(response.resource.rest[0].security).toEqual({
    cors: false,
    description: 'Uses OAuth2 as a way to authentication & authorize users',
    extension: [
      {
        extension: [
          {
            url: 'token',
            valueUri: 'http://fhir-server.com/token'
          },
          {
            url: 'authorize',
            valueUri: 'http://fhir-server.com/authorize'
          },
          {
            url: 'manage',
            valueUri: 'http://fhir-server.com/manage'
          }
        ],
        url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
      }
    ],
    service: [
      {
        coding: [
          {
            code: 'OAuth',
            system: 'http://terminology.hl7.org/CodeSystem/restful-security-service'
          }
        ]
      }
    ]
  });
});

test('R4: FHIR Config V4 with all productInfo params', async () => {
  const r4ConfigWithAllProductInfo = r4FhirConfigGeneric(overrideStubs);
  r4ConfigWithAllProductInfo.productInfo = {
    orgName: 'Organization Name',
    productVersion: '1.0.0',
    productTitle: 'Product Title',
    productMachineName: 'product.machine.name',
    productDescription: 'Product Description',
    productPurpose: 'Product Purpose',
    copyright: 'Copyright'
  };
  const configHandler: ConfigHandler = new ConfigHandler(r4ConfigWithAllProductInfo, SUPPORTED_R4_RESOURCES);
  const metadataHandler: MetadataHandler = new MetadataHandler(
    configHandler,
    registry,
    operationRegistryMock
  );
  const response = await metadataHandler.capabilities({ fhirVersion: '4.0.1', mode: 'full' });

  const expectedResponse: any = {
    resourceType: 'CapabilityStatement',
    name: 'product.machine.name',
    title: 'Product Title Capability Statement',
    description: 'Product Description',
    purpose: 'Product Purpose',
    copyright: 'Copyright',
    status: 'active',
    date: expect.stringMatching(utcTimeRegExp),
    publisher: 'Organization Name',
    kind: 'instance',
    software: {
      name: 'Product Title',
      version: '1.0.0'
    },
    implementation: {
      description: 'Product Description',
      url: 'http://example.com'
    },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: response.resource.rest
  };

  expect(response.resource).toMatchObject(expectedResponse);
});
