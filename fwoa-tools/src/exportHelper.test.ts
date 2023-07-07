/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { createWriteStream, WriteStream } from 'fs';
import AWS, { S3 } from 'aws-sdk';
import { StartJobRunRequest } from 'aws-sdk/clients/glue';
import * as AWSMock from 'aws-sdk-mock';
import { startExportJob, getExportStatus, getExportStateFile } from './exportHelper';

const env = process.env;
AWSMock.setSDKInstance(AWS);

describe('MigrationUtils', () => {
  beforeEach(() => {
    expect.hasAssertions();
    AWSMock.restore();
  });

  afterEach(() => {
    AWSMock.restore();
    jest.resetModules();
    process.env = env;
  });

  const FAKE_API_AWS_REGION = 'us-east-1';
  const FAKE_GLUE_JOB_NAME = 'fakeGlueJobName';
  const FAKE_API_URL = 'https://fake-api-url.com/dev';
  const FAKE_JOB_RUN_ID = 'fakeJobRunId';
  const FAKE_TENANT_ID = 'tenant1';
  const FAKE_BUCKET_NAME = 'fakeBucketName';
  const FAKE_SOURCE_PREFIX = 'fakeSourcePrefix';

  describe('startExportJob', () => {
    test('should call Glue with correct parameters, no tenantID', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      AWSMock.mock(
        'Glue',
        'startJobRun',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: StartJobRunRequest, callback: Function) => {
          expect(params).toMatchObject({
            Arguments: {
              '--exportType': 'system',
              '--jobOwnerId': 'FWoAMigrationClient',
              '--outputFormat': 'ndjson',
              '--serverUrl': FAKE_API_URL,
              '--since': '1800-01-01T00:00:00.000Z',
              '--snapshotExists': 'false',
              '--snapshotLocation': '',
              '--tenantId': undefined,
              '--type':
                'Account,ActivityDefinition,AdverseEvent,AllergyIntolerance,Appointment,AppointmentResponse,AuditEvent,Basic,Binary,BiologicallyDerivedProduct,BodyStructure,Bundle,CapabilityStatement,CarePlan,CareTeam,CatalogEntry,ChargeItem,ChargeItemDefinition,Claim,ClaimResponse,ClinicalImpression,CodeSystem,Communication,CommunicationRequest,CompartmentDefinition,Composition,ConceptMap,Condition,Consent,Contract,Coverage,CoverageEligibilityRequest,CoverageEligibilityResponse,DetectedIssue,Device,DeviceDefinition,DeviceMetric,DeviceRequest,DeviceUseStatement,DiagnosticReport,DocumentManifest,DocumentReference,EffectEvidenceSynthesis,Encounter,Endpoint,EnrollmentRequest,EnrollmentResponse,EpisodeOfCare,EventDefinition,Evidence,EvidenceVariable,ExampleScenario,ExplanationOfBenefit,FamilyMemberHistory,Flag,Goal,GraphDefinition,Group,GuidanceResponse,HealthcareService,ImagingStudy,Immunization,ImmunizationEvaluation,ImmunizationRecommendation,ImplementationGuide,InsurancePlan,Invoice,Library,Linkage,List,Location,Measure,MeasureReport,Media,Medication,MedicationAdministration,MedicationDispense,MedicationKnowledge,MedicationRequest,MedicationStatement,MedicinalProduct,MedicinalProductAuthorization,MedicinalProductContraindication,MedicinalProductIndication,MedicinalProductIngredient,MedicinalProductInteraction,MedicinalProductManufactured,MedicinalProductPackaged,MedicinalProductPharmaceutical,MedicinalProductUndesirableEffect,MessageDefinition,MessageHeader,MolecularSequence,NamingSystem,NutritionOrder,Observation,ObservationDefinition,OperationDefinition,OperationOutcome,Organization,OrganizationAffiliation,Parameters,Patient,PaymentNotice,PaymentReconciliation,Person,PlanDefinition,Practitioner,PractitionerRole,Procedure,Provenance,Questionnaire,QuestionnaireResponse,RelatedPerson,RequestGroup,ResearchDefinition,ResearchElementDefinition,ResearchStudy,ResearchSubject,RiskAssessment,RiskEvidenceSynthesis,Schedule,SearchParameter,ServiceRequest,Slot,Specimen,SpecimenDefinition,StructureDefinition,StructureMap,Subscription,Substance,SubstanceNucleicAcid,SubstancePolymer,SubstanceProtein,SubstanceReferenceInformation,SubstanceSourceMaterial,SubstanceSpecification,SupplyDelivery,SupplyRequest,Task,TerminologyCapabilities,TestReport,TestScript,ValueSet,VerificationResult,VisionPrescription'
            },
            JobName: FAKE_GLUE_JOB_NAME
          });
          callback(null, { JobRunId: FAKE_JOB_RUN_ID });
        }
      );
      const jobDetails = await startExportJob({
        glueJobName: FAKE_GLUE_JOB_NAME,
        apiUrl: FAKE_API_URL,
        snapshotExists: false,
        snapshotLocation: ''
      });
      expect(jobDetails).toMatchObject({ jobRunId: FAKE_JOB_RUN_ID });
    });

    test('should call Glue with correct parameters, with tenantID', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      AWSMock.mock(
        'Glue',
        'startJobRun',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: StartJobRunRequest, callback: Function) => {
          expect(params).toMatchObject({
            Arguments: {
              '--exportType': 'system',
              '--jobOwnerId': 'FWoAMigrationClient',
              '--outputFormat': 'ndjson',
              '--serverUrl': FAKE_API_URL,
              '--since': '1905-01-01T00:00:00.000Z',
              '--snapshotExists': 'false',
              '--snapshotLocation': '',
              '--tenantId': FAKE_TENANT_ID,
              '--type':
                'Account,ActivityDefinition,AdverseEvent,AllergyIntolerance,Appointment,AppointmentResponse,AuditEvent,Basic,Binary,BiologicallyDerivedProduct,BodyStructure,Bundle,CapabilityStatement,CarePlan,CareTeam,CatalogEntry,ChargeItem,ChargeItemDefinition,Claim,ClaimResponse,ClinicalImpression,CodeSystem,Communication,CommunicationRequest,CompartmentDefinition,Composition,ConceptMap,Condition,Consent,Contract,Coverage,CoverageEligibilityRequest,CoverageEligibilityResponse,DetectedIssue,Device,DeviceDefinition,DeviceMetric,DeviceRequest,DeviceUseStatement,DiagnosticReport,DocumentManifest,DocumentReference,EffectEvidenceSynthesis,Encounter,Endpoint,EnrollmentRequest,EnrollmentResponse,EpisodeOfCare,EventDefinition,Evidence,EvidenceVariable,ExampleScenario,ExplanationOfBenefit,FamilyMemberHistory,Flag,Goal,GraphDefinition,Group,GuidanceResponse,HealthcareService,ImagingStudy,Immunization,ImmunizationEvaluation,ImmunizationRecommendation,ImplementationGuide,InsurancePlan,Invoice,Library,Linkage,List,Location,Measure,MeasureReport,Media,Medication,MedicationAdministration,MedicationDispense,MedicationKnowledge,MedicationRequest,MedicationStatement,MedicinalProduct,MedicinalProductAuthorization,MedicinalProductContraindication,MedicinalProductIndication,MedicinalProductIngredient,MedicinalProductInteraction,MedicinalProductManufactured,MedicinalProductPackaged,MedicinalProductPharmaceutical,MedicinalProductUndesirableEffect,MessageDefinition,MessageHeader,MolecularSequence,NamingSystem,NutritionOrder,Observation,ObservationDefinition,OperationDefinition,OperationOutcome,Organization,OrganizationAffiliation,Parameters,Patient,PaymentNotice,PaymentReconciliation,Person,PlanDefinition,Practitioner,PractitionerRole,Procedure,Provenance,Questionnaire,QuestionnaireResponse,RelatedPerson,RequestGroup,ResearchDefinition,ResearchElementDefinition,ResearchStudy,ResearchSubject,RiskAssessment,RiskEvidenceSynthesis,Schedule,SearchParameter,ServiceRequest,Slot,Specimen,SpecimenDefinition,StructureDefinition,StructureMap,Subscription,Substance,SubstanceNucleicAcid,SubstancePolymer,SubstanceProtein,SubstanceReferenceInformation,SubstanceSourceMaterial,SubstanceSpecification,SupplyDelivery,SupplyRequest,Task,TerminologyCapabilities,TestReport,TestScript,ValueSet,VerificationResult,VisionPrescription'
            },
            JobName: FAKE_GLUE_JOB_NAME
          });
          callback(null, { JobRunId: FAKE_JOB_RUN_ID });
        }
      );
      const jobDetails = await startExportJob({
        glueJobName: FAKE_GLUE_JOB_NAME,
        apiUrl: FAKE_API_URL,
        snapshotExists: false,
        snapshotLocation: '',
        tenantId: FAKE_TENANT_ID,
        since: '1905-01-01T00:00:00.000Z'
      });
      expect(jobDetails).toMatchObject({ jobRunId: FAKE_JOB_RUN_ID });
    });

    test('should throw error when failed to start export job', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      AWSMock.mock(
        'Glue',
        'startJobRun',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: StartJobRunRequest, callback: Function) => {
          callback(new Error('Glue start export error'), null);
        }
      );
      await expect(
        startExportJob({
          glueJobName: FAKE_GLUE_JOB_NAME,
          apiUrl: FAKE_API_URL,
          snapshotExists: false,
          snapshotLocation: '',
          tenantId: FAKE_TENANT_ID,
          since: '1905-01-01T00:00:00.000Z'
        })
      ).rejects.toThrowError('Glue start export error');
    });
  });

  describe('getExportStatus', () => {
    test('Return when job state SUCCEEDED', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      AWSMock.mock(
        'Glue',
        'getJobRun',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: StartJobRunRequest, callback: Function) => {
          expect(params).toMatchObject({
            JobName: FAKE_GLUE_JOB_NAME,
            RunId: FAKE_JOB_RUN_ID
          });
          callback(null, { JobRun: { JobRunState: 'SUCCEEDED' } });
        }
      );
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const logs: WriteStream = createWriteStream(`exportHelper-unit-test${Date.now().toString()}.log`, {
        flags: 'a'
      });
      const jobState = await getExportStatus(FAKE_GLUE_JOB_NAME, logs, FAKE_JOB_RUN_ID);
      expect(jobState).toEqual('SUCCEEDED');
    });

    test('Keep pulling when job state RUNNING or WAITING', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      const mockGetJobRunFunc = jest
        .fn()
        .mockImplementationOnce(
          //eslint-disable-next-line @typescript-eslint/ban-types
          (params: StartJobRunRequest, callback: Function) => {
            callback(null, { JobRun: { JobRunState: 'RUNNING' } });
          }
        )
        //eslint-disable-next-line @typescript-eslint/ban-types
        .mockImplementationOnce((params: StartJobRunRequest, callback: Function) => {
          callback(null, { JobRun: { JobRunState: 'WAITING' } });
        })
        //eslint-disable-next-line @typescript-eslint/ban-types
        .mockImplementationOnce((params: StartJobRunRequest, callback: Function) => {
          callback(null, { JobRun: { JobRunState: 'SUCCEEDED' } });
        });
      AWSMock.mock('Glue', 'getJobRun', mockGetJobRunFunc);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const logs: WriteStream = createWriteStream(`exportHelper-unit-test${Date.now().toString()}.log`, {
        flags: 'a'
      });
      const jobState = await getExportStatus(FAKE_GLUE_JOB_NAME, logs, FAKE_JOB_RUN_ID);
      expect(jobState).toEqual('SUCCEEDED');
      expect(mockGetJobRunFunc).toHaveBeenCalledTimes(3);
    }, 30000);

    test('Throw error when job state is not SUCCEEDED, RUNNING or WAITING', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      AWSMock.mock(
        'Glue',
        'getJobRun',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: StartJobRunRequest, callback: Function) => {
          expect(params).toMatchObject({
            JobName: FAKE_GLUE_JOB_NAME,
            RunId: FAKE_JOB_RUN_ID
          });
          callback(null, { JobRun: { JobRunState: 'UNKNOWN' } });
        }
      );
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const logs: WriteStream = createWriteStream(`exportHelper-unit-test${Date.now().toString()}.log`, {
        flags: 'a'
      });
      await expect(getExportStatus(FAKE_GLUE_JOB_NAME, logs, FAKE_JOB_RUN_ID)).rejects.toThrow(
        'Job has error state: UNKNOWN'
      );
    });
  });

  describe('getExportStateFile', () => {
    test('Return jobID and file names', async () => {
      process.env.API_AWS_REGION = FAKE_API_AWS_REGION;
      AWSMock.mock(
        'S3',
        'getObject',
        //eslint-disable-next-line @typescript-eslint/ban-types
        (params: StartJobRunRequest, callback: Function) => {
          expect(params).toMatchObject({
            Bucket: FAKE_BUCKET_NAME,
            Key: `${FAKE_SOURCE_PREFIX}migration_output.json`
          });
          callback(null, {
            Body: Buffer.from(
              JSON.stringify({ jobId: FAKE_JOB_RUN_ID, file_names: ['filename1', 'filename2'] })
            )
          });
        }
      );
      const s3Client = new S3({
        region: FAKE_API_AWS_REGION
      });
      await expect(getExportStateFile(s3Client, FAKE_BUCKET_NAME, FAKE_SOURCE_PREFIX)).resolves.toEqual({
        jobId: FAKE_JOB_RUN_ID,
        file_names: ['filename1', 'filename2']
      });
    });
  });
});
