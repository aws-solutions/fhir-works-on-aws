/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/typedef */
import {
  AccessBulkDataJobRequest,
  Authorization,
  GetSearchFilterBasedOnIdentityRequest
} from './authorization';
import { BulkDataAccess } from './bulkDataAccess';
import { Bundle } from './bundle';
import { History } from './history';
import { Persistence } from './persistence';
import { Search, SearchCapabilityStatement } from './search';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace stubs {
  export const bundle: Bundle = {
    batch(request) {
      throw new Error('Method not implemented.');
    },

    transaction(request) {
      throw new Error('Method not implemented.');
    }
  };

  export const search: Search = {
    async getCapabilities(): Promise<SearchCapabilityStatement> {
      throw new Error('Method not implemented.');
    },
    typeSearch(request) {
      throw new Error('Method not implemented.');
    },

    globalSearch(request) {
      throw new Error('Method not implemented.');
    },

    validateSubscriptionSearchCriteria(searchCriteria) {
      throw new Error('Method not implemented.');
    }
  };

  export const history: History = {
    instanceHistory(request) {
      throw new Error('Method not implemented.');
    },

    typeHistory(request) {
      throw new Error('Method not implemented.');
    },

    globalHistory(request) {
      throw new Error('Method not implemented.');
    }
  };

  export const passThroughAuthz: Authorization = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async verifyAccessToken(request) {
      return {};
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async isBundleRequestAuthorized(request) {},
    async authorizeAndFilterReadResponse(request) {
      return request.readResponse;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async isWriteRequestAuthorized(request) {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async isAccessBulkDataJobAllowed(request: AccessBulkDataJobRequest) {},
    async getSearchFilterBasedOnIdentity(request: GetSearchFilterBasedOnIdentityRequest) {
      return [];
    },
    async getAllowedResourceTypesForOperation(request) {
      return [
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
    }
  };

  export const persistence: Persistence = {
    updateCreateSupported: false,
    createResource(request) {
      throw new Error('Method not implemented.');
    },

    conditionalCreateResource(request, queryParams) {
      throw new Error('Method not implemented.');
    },

    updateResource(request) {
      throw new Error('Method not implemented.');
    },

    conditionalUpdateResource(request, queryParams) {
      throw new Error('Method not implemented.');
    },

    patchResource(request) {
      throw new Error('Method not implemented.');
    },

    conditionalPatchResource(request, queryParams) {
      throw new Error('Method not implemented.');
    },

    readResource(request) {
      throw new Error('Method not implemented.');
    },

    vReadResource(request) {
      throw new Error('Method not implemented.');
    },

    deleteResource(request) {
      throw new Error('Method not implemented.');
    },

    conditionalDeleteResource(request, queryParams) {
      throw new Error('Method not implemented.');
    },

    getActiveSubscriptions(params: { tenantId: string }) {
      throw new Error('Method not implemented.');
    }
  };

  export const bulkDataAccess: BulkDataAccess = {
    initiateExport(request) {
      throw new Error('Method not implemented.');
    },

    cancelExport(jobId) {
      throw new Error('Method not implemented');
    },

    getExportStatus(jobId) {
      throw new Error('Method not implemented');
    }
  };
}
