/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface KeyValueMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type IssueSeverity = 'fatal' | 'error' | 'warning' | 'information';

// Codes defined here= https://www.hl7.org/fhir/valueset-issue-type.html
export type IssueCode =
  // Invalid can be seen as a parent essentially to these, see Level on above url
  // This means structure, required, value, and invariant, are all also invalid
  // you can send invalid back or something more specific
  | 'invalid'
  | 'structure'
  | 'required'
  | 'value'
  | 'invariant'
  // Security is parent of login, unknown, expired, forbidden, and surpressed
  | 'security'
  | 'login'
  | 'unknown'
  | 'expired'
  | 'forbidden'
  | 'surpressed'
  // Procesing has no parent/children
  | 'processing'
  // Not Supported is parent of duplicate, not found, and too long
  | 'not-supported'
  | 'duplicate'
  | 'not-found'
  | 'too-long'
  // Code invalid is parent of extension, too costly, business rule, conflict, and incomplete
  | 'code-invalid'
  | 'extension'
  | 'too-costly'
  | 'business-rule'
  | 'conflict'
  | 'incomplete'
  // Transient is parent of lock error, no store, exception, timeout, and throttled
  | 'transient'
  | 'lock-error'
  | 'no-store'
  | 'exception'
  | 'timeout'
  | 'throttled'
  // Informational has no parent/children
  | 'informational';

/**
 * Type Operations
 * https://www.hl7.org/fhir/valueset-type-restful-interaction.html
 */
export type TypeOperation =
  | 'create'
  | 'read'
  | 'vread'
  | 'update'
  | 'delete'
  | 'patch'
  | 'history-type'
  | 'history-instance'
  | 'search-type';

/**
 * System Operations
 * https://www.hl7.org/fhir/valueset-system-restful-interaction.html
 */
export type SystemOperation = 'transaction' | 'batch' | 'search-system' | 'history-system';

/**
 * The version of the fhir configuration being used
 */
export type ConfigVersion = 1.0;

/**
 * These are currently the only versions we support
 */
export type FhirVersion = '3.0.1' | '4.0.1';

export type STU3Resource =
  | 'Account'
  | 'ActivityDefinition'
  | 'AdverseEvent'
  | 'AllergyIntolerance'
  | 'Appointment'
  | 'AppointmentResponse'
  | 'AuditEvent'
  | 'Basic'
  | 'Binary'
  | 'BodySite'
  | 'Bundle'
  | 'CapabilityStatement'
  | 'CarePlan'
  | 'CareTeam'
  | 'ChargeItem'
  | 'Claim'
  | 'ClaimResponse'
  | 'ClinicalImpression'
  | 'CodeSystem'
  | 'Communication'
  | 'CommunicationRequest'
  | 'CompartmentDefinition'
  | 'Composition'
  | 'ConceptMap'
  | 'Condition'
  | 'Consent'
  | 'Contract'
  | 'Coverage'
  | 'DataElement'
  | 'DetectedIssue'
  | 'Device'
  | 'DeviceComponent'
  | 'DeviceMetric'
  | 'DeviceRequest'
  | 'DeviceUseStatement'
  | 'DiagnosticReport'
  | 'DocumentManifest'
  | 'DocumentReference'
  | 'EligibilityRequest'
  | 'EligibilityResponse'
  | 'Encounter'
  | 'Endpoint'
  | 'EnrollmentRequest'
  | 'EnrollmentResponse'
  | 'EpisodeOfCare'
  | 'ExpansionProfile'
  | 'ExplanationOfBenefit'
  | 'FamilyMemberHistory'
  | 'Flag'
  | 'Goal'
  | 'GraphDefinition'
  | 'Group'
  | 'GuidanceResponse'
  | 'HealthcareService'
  | 'ImagingManifest'
  | 'ImagingStudy'
  | 'Immunization'
  | 'ImmunizationRecommendation'
  | 'ImplementationGuide'
  | 'Library'
  | 'Linkage'
  | 'List'
  | 'Location'
  | 'Measure'
  | 'MeasureReport'
  | 'Media'
  | 'Medication'
  | 'MedicationAdministration'
  | 'MedicationDispense'
  | 'MedicationRequest'
  | 'MedicationStatement'
  | 'MessageDefinition'
  | 'MessageHeader'
  | 'NamingSystem'
  | 'NutritionOrder'
  | 'Observation'
  | 'OperationDefinition'
  | 'OperationOutcome'
  | 'Organization'
  | 'Parameters'
  | 'Patient'
  | 'PaymentNotice'
  | 'PaymentReconciliation'
  | 'Person'
  | 'PlanDefinition'
  | 'Practitioner'
  | 'PractitionerRole'
  | 'Procedure'
  | 'ProcedureRequest'
  | 'ProcessRequest'
  | 'ProcessResponse'
  | 'Provenance'
  | 'Questionnaire'
  | 'QuestionnaireResponse'
  | 'ReferralRequest'
  | 'RelatedPerson'
  | 'RequestGroup'
  | 'ResearchStudy'
  | 'ResearchSubject'
  | 'RiskAssessment'
  | 'Schedule'
  | 'SearchParameter'
  | 'Sequence'
  | 'ServiceDefinition'
  | 'Slot'
  | 'Specimen'
  | 'StructureDefinition'
  | 'StructureMap'
  | 'Subscription'
  | 'Substance'
  | 'SupplyDelivery'
  | 'SupplyRequest'
  | 'Task'
  | 'TestScript'
  | 'TestReport'
  | 'ValueSet'
  | 'VisionPrescription';

export type R4Resource =
  | STU3Resource
  | 'BiologicallyDerivedProduct'
  | 'BodyStructure'
  | 'CatalogEntry'
  | 'ChargeItemDefinition'
  | 'CoverageEligibilityRequest'
  | 'CoverageEligibilityResponse'
  | 'DeviceDefinition'
  | 'EffectEvidenceSynthesis'
  | 'EventDefinition'
  | 'Evidence'
  | 'EvidenceVariable'
  | 'ExampleScenario'
  | 'ImmunizationEvaluation'
  | 'InsurancePlan'
  | 'Invoice'
  | 'MedicationKnowledge'
  | 'MedicinalProduct'
  | 'MedicinalProductAuthorization'
  | 'MedicinalProductContraindication'
  | 'MedicinalProductIndication'
  | 'MedicinalProductIngredient'
  | 'MedicinalProductInteraction'
  | 'MedicinalProductManufactured'
  | 'MedicinalProductPackaged'
  | 'MedicinalProductPharmaceutical'
  | 'MedicinalProductUndesirableEffect'
  | 'MolecularSequence'
  | 'ObservationDefinition'
  | 'OrganizationAffiliation'
  | 'ResearchDefinition'
  | 'ResearchElementDefinition'
  | 'RiskEvidenceSynthesis'
  | 'ServiceRequest'
  | 'SpecimenDefinition'
  | 'SubstanceNucleicAcid'
  | 'SubstancePolymer'
  | 'SubstanceProtein'
  | 'SubstanceReferenceInformation'
  | 'SubstanceSpecification'
  | 'SubstanceSourceMaterial'
  | 'TerminologyCapabilities'
  | 'VerificationResult';

export const BASE_R4_RESOURCES: R4Resource[] = [
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
  'MedicinalProductInteraction',
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
  'SubstanceNucleicAcid',
  'SubstancePolymer',
  'SubstanceProtein',
  'SubstanceReferenceInformation',
  'SubstanceSourceMaterial',
  'SubstanceSpecification',
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

export const BASE_STU3_RESOURCES: STU3Resource[] = [
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

export const R4_PATIENT_COMPARTMENT_RESOURCES: R4Resource[] = [
  'Account',
  'AllergyIntolerance',
  'Appointment',
  'AppointmentResponse',
  'AuditEvent',
  'Basic',
  'CarePlan',
  'Claim',
  'ClinicalImpression',
  'Communication',
  'CommunicationRequest',
  'Composition',
  'Condition',
  'DetectedIssue',
  'DeviceUseStatement',
  'DiagnosticReport',
  'DocumentManifest',
  'DocumentReference',
  'Encounter',
  'EnrollmentRequest',
  'EpisodeOfCare',
  'FamilyMemberHistory',
  'Flag',
  'Goal',
  'Group',
  'ImagingStudy',
  'Immunization',
  'ImmunizationRecommendation',
  'List',
  'Media',
  'MedicationAdministration',
  'MedicationDispense',
  'MedicationStatement',
  'NutritionOrder',
  'Observation',
  'Patient',
  'Person',
  'Procedure',
  'Provenance',
  'QuestionnaireResponse',
  'RelatedPerson',
  'RiskAssessment',
  'Schedule',
  'Specimen',
  'SupplyDelivery',
  'SupplyRequest',
  'VisionPrescription'
];

export const STU3_PATIENT_COMPARTMENT_RESOURCES: STU3Resource[] = [
  'Account',
  'AdverseEvent',
  'AllergyIntolerance',
  'Appointment',
  'AppointmentResponse',
  'AuditEvent',
  'Basic',
  'BodySite',
  'CarePlan',
  'CareTeam',
  'ChargeItem',
  'Claim',
  'ClaimResponse',
  'ClinicalImpression',
  'Communication',
  'CommunicationRequest',
  'Composition',
  'Condition',
  'Consent',
  'Coverage',
  'DetectedIssue',
  'DeviceRequest',
  'DeviceUseStatement',
  'DiagnosticReport',
  'DocumentManifest',
  'DocumentReference',
  'EligibilityRequest',
  'Encounter',
  'EnrollmentRequest',
  'EpisodeOfCare',
  'ExplanationOfBenefit',
  'FamilyMemberHistory',
  'Flag',
  'Goal',
  'Group',
  'ImagingManifest',
  'ImagingStudy',
  'Immunization',
  'ImmunizationRecommendation',
  'List',
  'MeasureReport',
  'Media',
  'MedicationAdministration',
  'MedicationDispense',
  'MedicationRequest',
  'MedicationStatement',
  'NutritionOrder',
  'Observation',
  'Patient',
  'Person',
  'Procedure',
  'ProcedureRequest',
  'Provenance',
  'QuestionnaireResponse',
  'ReferralRequest',
  'RelatedPerson',
  'RequestGroup',
  'ResearchSubject',
  'RiskAssessment',
  'Schedule',
  'Specimen',
  'SupplyDelivery',
  'SupplyRequest',
  'VisionPrescription'
];
