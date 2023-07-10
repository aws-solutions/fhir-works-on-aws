/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { WriteStream, writeFileSync } from 'fs';
import { S3, Glue } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { EXPORT_STATE_FILE_NAME, ExportOutput, POLLING_TIME, sleep } from './migrationUtils';

const MAX_EXPORT_RUNTIME: number = 48 * 60 * 60 * 1000;
const EXPORT_TYPES: string =
  'Account,ActivityDefinition,AdverseEvent,AllergyIntolerance,Appointment,AppointmentResponse,AuditEvent,Basic,Binary,BiologicallyDerivedProduct,BodyStructure,Bundle,CapabilityStatement,CarePlan,CareTeam,CatalogEntry,ChargeItem,ChargeItemDefinition,Claim,ClaimResponse,ClinicalImpression,CodeSystem,Communication,CommunicationRequest,CompartmentDefinition,Composition,ConceptMap,Condition,Consent,Contract,Coverage,CoverageEligibilityRequest,CoverageEligibilityResponse,DetectedIssue,Device,DeviceDefinition,DeviceMetric,DeviceRequest,DeviceUseStatement,DiagnosticReport,DocumentManifest,DocumentReference,EffectEvidenceSynthesis,Encounter,Endpoint,EnrollmentRequest,EnrollmentResponse,EpisodeOfCare,EventDefinition,Evidence,EvidenceVariable,ExampleScenario,ExplanationOfBenefit,FamilyMemberHistory,Flag,Goal,GraphDefinition,Group,GuidanceResponse,HealthcareService,ImagingStudy,Immunization,ImmunizationEvaluation,ImmunizationRecommendation,ImplementationGuide,InsurancePlan,Invoice,Library,Linkage,List,Location,Measure,MeasureReport,Media,Medication,MedicationAdministration,MedicationDispense,MedicationKnowledge,MedicationRequest,MedicationStatement,MedicinalProduct,MedicinalProductAuthorization,MedicinalProductContraindication,MedicinalProductIndication,MedicinalProductIngredient,MedicinalProductInteraction,MedicinalProductManufactured,MedicinalProductPackaged,MedicinalProductPharmaceutical,MedicinalProductUndesirableEffect,MessageDefinition,MessageHeader,MolecularSequence,NamingSystem,NutritionOrder,Observation,ObservationDefinition,OperationDefinition,OperationOutcome,Organization,OrganizationAffiliation,Parameters,Patient,PaymentNotice,PaymentReconciliation,Person,PlanDefinition,Practitioner,PractitionerRole,Procedure,Provenance,Questionnaire,QuestionnaireResponse,RelatedPerson,RequestGroup,ResearchDefinition,ResearchElementDefinition,ResearchStudy,ResearchSubject,RiskAssessment,RiskEvidenceSynthesis,Schedule,SearchParameter,ServiceRequest,Slot,Specimen,SpecimenDefinition,StructureDefinition,StructureMap,Subscription,Substance,SubstanceNucleicAcid,SubstancePolymer,SubstanceProtein,SubstanceReferenceInformation,SubstanceSourceMaterial,SubstanceSpecification,SupplyDelivery,SupplyRequest,Task,TerminologyCapabilities,TestReport,TestScript,ValueSet,VerificationResult,VisionPrescription';

export interface ExportStatusOutput {
  url: string;
  type: string;
}

export interface StartExportJobParam {
  glueJobName: string;
  apiUrl: string;
  snapshotExists: boolean;
  snapshotLocation: string;
  tenantId?: string;
  since?: string;
}

export interface GlueJobResponse {
  jobId: string;
  jobRunId: string;
}

export async function startExportJob(startExportJobParam: StartExportJobParam): Promise<GlueJobResponse> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      _outputFormat: 'ndjson'
    };
    if (startExportJobParam.since) {
      params._since = startExportJobParam.since;
    }
    const glue = new Glue({
      region: process.env.API_AWS_REGION
    });
    const jobId = uuidv4();
    const startJobRunResponse = await glue
      .startJobRun({
        JobName: startExportJobParam.glueJobName,
        Arguments: {
          '--jobId': jobId,
          '--jobOwnerId': 'FWoAMigrationClient',
          '--exportType': 'system',
          '--transactionTime': new Date().toISOString(),
          '--since': startExportJobParam.since || '1800-01-01T00:00:00.000Z',
          '--type': EXPORT_TYPES,
          '--outputFormat': 'ndjson',
          '--tenantId': startExportJobParam.tenantId!,
          '--serverUrl': startExportJobParam.apiUrl,
          '--snapshotExists': startExportJobParam.snapshotExists.toString().toLowerCase(),
          '--snapshotLocation': startExportJobParam.snapshotLocation
        }
      })
      .promise();
    const jobRunId = startJobRunResponse.JobRunId!;
    return {
      jobId,
      jobRunId
    };
  } catch (e) {
    console.error('Failed to start export job', e);
    throw e;
  }
}

export async function getExportStatus(
  jobName: string,
  logStream: WriteStream,
  jobRunId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const cutOffTime = new Date(new Date().getTime() + MAX_EXPORT_RUNTIME);
  const glue = new Glue({
    region: process.env.API_AWS_REGION
  });
  while (new Date().getTime() < cutOffTime.getTime()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const jobRun = await glue
        .getJobRun({
          JobName: jobName,
          RunId: jobRunId
        })
        .promise();
      const state = jobRun.JobRun!.JobRunState!;
      if (state === 'SUCCEEDED') {
        return state;
      } else if (state === 'RUNNING' || state === 'WAITING') {
        logStream.write(`${new Date().toISOString()}: Glue Job State is still ${state}...`);
        // eslint-disable-next-line no-await-in-loop
        await sleep(POLLING_TIME);
      } else {
        throw new Error(`Job has error state: ${state}`);
      }
    } catch (e) {
      console.error('Failed to getExport status', e);
      throw e;
    }
  }
  throw new Error(
    `Expected export status did not occur during polling time frame of ${MAX_EXPORT_RUNTIME / 1000} seconds`
  );
}

export async function getExportStateFile(
  s3Client: S3,
  bucketName: string,
  sourcePrefix: string
): Promise<ExportOutput> {
  const stateFileRepsonse = await s3Client
    .getObject({
      Bucket: bucketName,
      Key: `${sourcePrefix}migration_output.json`
    })
    .promise();
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(`./${EXPORT_STATE_FILE_NAME}`, stateFileRepsonse.Body!.toString());
  const stateFileBody = JSON.parse(stateFileRepsonse.Body!.toString());
  return {
    jobId: stateFileBody.jobId,
    file_names: stateFileBody.file_names
  };
}
