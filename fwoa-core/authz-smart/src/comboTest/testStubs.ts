import { BatchReadWriteRequest } from '@aws/fhir-works-on-aws-interface';
import { getFhirUser } from '../smartAuthorizationHelper';
import { FhirResource, ScopeRule, SMARTConfig } from '../smartConfig';
import { SEARCH_OPERATIONS } from '../smartScopeHelper';

export const scopeRule = (): ScopeRule => ({
  patient: {
    read: [
      'read',
      'vread',
      'search-type',
      'search-system',
      'history-instance',
      'history-type',
      'history-system'
    ],
    write: ['create', 'transaction']
  },
  user: {
    read: [
      'read',
      'vread',
      'search-type',
      'search-system',
      'history-instance',
      'history-type',
      'history-system'
    ],
    write: ['update', 'patch', 'create', 'delete', 'transaction']
  },
  system: {
    // "read" allows system export and group export
    read: ['read'],
    write: []
  }
});
export const expectedAud = 'api://default';
export const expectedIss = 'https://dev-6460611.okta.com/oauth2/default';
export const baseAuthZConfig = (): SMARTConfig => ({
  version: 1.0,
  scopeKey: 'scp',
  scopeRule: scopeRule(),
  expectedAudValue: expectedAud,
  expectedIssValue: expectedIss,
  fhirUserClaimPath: 'fhirUser',
  launchContextPathPrefix: 'ext.launch_response_',
  jwksEndpoint: `${expectedIss}/jwks`
});
export const apiUrl = 'https://fhir.server.com/dev';
export const fakeUrl = 'https://random.server.com/dev';
export const id = 'id';
export const patientId = `Patient/${id}`;
export const practitionerId = `Practitioner/${id}`;
export const patientIdentity = `${apiUrl}/${patientId}`;
export const practitionerIdentity = `${apiUrl}/${practitionerId}`;
export const sub = 'test@example.com';

export const patientContext: any = {
  ext: { launch_response_patient: patientIdentity }
};
export const patientFhirUser: any = {
  fhirUser: patientIdentity
};
export const practitionerFhirUser: any = {
  fhirUser: practitionerIdentity
};

export const baseAccessNoScopes: any = {
  ver: 1,
  jti: 'AT.6a7kncTCpu1X9eo2QhH1z_WLUK4TyV43n_9I6kZNwPY',
  iss: expectedIss,
  aud: expectedAud,
  iat: 1668546607,
  exp: 2668546607,
  cid: '0oa8muazKSyk9gP5y5d5',
  uid: '00u85ozwjjWRd17PB5d5',
  sub
};

const validPatient = {
  resourceType: 'Patient',
  id,
  meta: {
    versionId: '1',
    lastUpdated: '2020-06-28T12:03:29.421+00:00'
  },
  name: [
    {
      given: ['JONNY']
    }
  ],
  gender: 'male',
  birthDate: '1972-10-13',
  address: [
    {
      city: 'Ruppertshofen'
    }
  ]
};

const validPatientObservation = {
  resourceType: 'Observation',
  id: '1274045',
  meta: {
    versionId: '1',
    lastUpdated: '2020-06-28T12:55:47.134+00:00'
  },
  status: 'final',
  code: {
    coding: [
      {
        system: 'http://loinc.org',
        code: '15074-8',
        display: 'Glucose [Moles/volume] in Blood'
      }
    ]
  },
  subject: {
    reference: patientIdentity,
    display: 'JONNY'
  },
  effectivePeriod: {
    start: '2013-04-02T09:30:10+01:00'
  },
  issued: '2013-04-03T15:30:10+01:00',
  valueQuantity: {
    value: 6.3,
    unit: 'mmol/l',
    system: 'http://unitsofmeasure.org',
    code: 'mmol/L'
  },
  interpretation: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: 'H',
          display: 'High'
        }
      ]
    }
  ],
  referenceRange: [
    {
      low: {
        value: 3.1,
        unit: 'mmol/l',
        system: 'http://unitsofmeasure.org',
        code: 'mmol/L'
      },
      high: {
        value: 6.2,
        unit: 'mmol/l',
        system: 'http://unitsofmeasure.org',
        code: 'mmol/L'
      }
    }
  ]
};

const validCondition: any = {
  resourceType: 'Condition',
  id: 'example',
  text: {
    status: 'generated',
    div: '<div xmlns="http://www.w3.org/1999/xhtml">Severe burn of left ear (Date: 24-May 2012)</div>'
  },
  clinicalStatus: {
    coding: [
      {
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: 'active'
      }
    ]
  },
  verificationStatus: {
    coding: [
      {
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: 'confirmed'
      }
    ]
  },
  category: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
          code: 'encounter-diagnosis',
          display: 'Encounter Diagnosis'
        },
        {
          system: 'http://snomed.info/sct',
          code: '439401001',
          display: 'Diagnosis'
        }
      ]
    }
  ],
  severity: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '24484000',
        display: 'Severe'
      }
    ]
  },
  code: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '39065001',
        display: 'Burn of ear'
      }
    ],
    text: 'Burnt Ear'
  },
  bodySite: [
    {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '49521004',
          display: 'Left external ear structure'
        }
      ],
      text: 'Left Ear'
    }
  ],
  subject: {
    reference: patientIdentity
  },
  onsetDateTime: '2012-05-24'
};

const validMedicationRequest: any = {
  resourceType: 'MedicationRequest',
  id: 'self-tylenol',
  text: {
    status: 'generated',
    div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative</b></p><p><b>id</b>: self-tylenol</p><p><b>identifier</b>: id: 12345689 (OFFICIAL)</p><p><b>status</b>: active</p><p><b>intent</b>: plan</p><p><b>reported</b>: true</p><p><b>medication</b>: <span title="Codes: {http://www.nlm.nih.gov/research/umls/rxnorm 1187314}">Tylenol PM Pill</span></p><p><b>subject</b>: <a href="Patient-example.html">Amy V. Shaw. Generated Summary: id: example; Medical Record Number: 1032702 (USUAL); active; Amy V. Shaw , Amy V. Baxter ; ph: 555-555-5555(HOME), amy.shaw@example.com; gender: female; birthDate: 1987-02-20</a></p><p><b>encounter</b>: <a href="Encounter-example-1.html">Office Visit. Generated Summary: id: example-1; status: finished; <span title="{http://terminology.hl7.org/CodeSystem/v3-ActCode AMB}">ambulatory</span>; <span title="Codes: {http://www.ama-assn.org/go/cpt 99201}">Office Visit</span>; period: 02/11/2015 9:00:14 AM --&gt; 02/11/2015 10:00:14 AM</a></p><p><b>authoredOn</b>: 2019-06-24</p><p><b>requester</b>: <a href="Patient-example.html">**self-prescribed**. Generated Summary: id: example; Medical Record Number: 1032702 (USUAL); active; Amy V. Shaw , Amy V. Baxter ; ph: 555-555-5555(HOME), amy.shaw@example.com; gender: female; birthDate: 1987-02-20</a></p><p><b>dosageInstruction</b>: </p></div>'
  },
  identifier: [{ use: 'official', system: 'http://acme.org/prescriptions', value: '12345689' }],
  status: 'active',
  intent: 'plan',
  reportedBoolean: true,
  medicationCodeableConcept: {
    coding: [
      { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1187314', display: 'Tylenol PM Pill' }
    ],
    text: 'Tylenol PM Pill'
  },
  subject: { reference: patientIdentity },
  encounter: { reference: 'Encounter/example-1', display: 'Office Visit' },
  authoredOn: '2019-06-24',
  requester: { reference: 'Patient/example', display: '**self-prescribed**' },
  dosageInstruction: [{ text: 'Takes 1-2 tablets once daily at bedtime as needed for restless legs' }]
};

export const getFhirUserType = (fhirUser: string | undefined): string | undefined => {
  if (fhirUser === 'practitionerFhirUser') {
    return practitionerIdentity;
  }
  if (fhirUser === 'patientFhirUser' || fhirUser === 'patientIdentity') {
    return patientIdentity;
  }
  return undefined;
};

export const getFhirUserObject = (fhirUser: string | undefined): FhirResource | undefined => {
  if (fhirUser === 'practitionerFhirUser') {
    return getFhirUser(practitionerIdentity);
  }
  if (fhirUser === 'patientFhirUser' || fhirUser === 'patientIdentity') {
    return getFhirUser(patientIdentity);
  }
  return undefined;
};

export const convertNAtoUndefined = (s: string) => (s === 'N/A' ? undefined : s);

export const convertToBaseUrl = (url: string): string | undefined => {
  if (url === 'matchUrl') {
    return apiUrl;
  }
  if (url === 'nonMatchUrl') {
    return fakeUrl;
  }
  return undefined;
};

export type ResourceBodyDescription =
  | 'matchObservation'
  | 'unmatchCondition'
  | 'matchPatient'
  | 'unmatchPatient'
  | 'patientReferencePractitioner';

export const getResourceBody = (resourceBodyDescription: ResourceBodyDescription) => {
  switch (resourceBodyDescription) {
    case 'matchObservation':
      return validPatientObservation;
    case 'unmatchCondition':
      return {
        ...validCondition,
        subject: {
          reference: `${apiUrl}/another-id`
        }
      };
    case 'matchPatient':
      return validPatient;
    case 'unmatchPatient':
      return { ...validPatient, id: 'another-id' };
    case 'patientReferencePractitioner':
      return { ...validPatient, generalPractitioner: { reference: practitionerIdentity } };
    default:
      return undefined;
  }
};

export const getResourceType = (resourceBodyDescription: ResourceBodyDescription | undefined) => {
  if (!resourceBodyDescription) {
    return undefined;
  }
  switch (resourceBodyDescription) {
    case 'matchObservation':
      return 'Observation';
    case 'unmatchCondition':
      return 'Condition';
    default:
      return 'Patient';
  }
};

export const generateSearchBundle = (
  condition?: boolean,
  medicationRequest?: boolean,
  patient?: boolean,
  unmatchPatient?: boolean
) => {
  const items = [];
  if (condition) {
    items.push({
      resource: { ...validCondition, subject: undefined }
    });
  }
  if (medicationRequest) {
    items.push({
      resource: validMedicationRequest
    });
  }
  if (patient) {
    items.push({
      resource: validPatient
    });
  }
  if (unmatchPatient) {
    items.push({
      resource: { ...validPatient, id: 'notSamePatient' }
    });
  }
  return items;
};
export const getReadResponseAndOperation = (
  matchMedicationRequest: boolean,
  matchPatient: boolean,
  unmatchCondition: boolean,
  unmatchPatient: boolean
) => {
  const searchBundle = generateSearchBundle(
    unmatchCondition,
    matchMedicationRequest,
    matchPatient,
    unmatchPatient
  );
  if (searchBundle.length === 1) {
    return {
      readResponse: searchBundle[0],
      operation: 'read'
    };
  }
  return {
    readResponse: {
      total: searchBundle.length,
      entry: searchBundle
    },
    operation: SEARCH_OPERATIONS[0]
  };
};

export const generateBundle = (): BatchReadWriteRequest[] => {
  return [
    {
      operation: 'create',
      resourceType: 'Observation',
      id: validPatientObservation.id,
      resource: validPatientObservation,
      // references generated as per this method in routing: https://github.com/awslabs/fhir-works-on-aws-routing/blob/mainline/src/router/bundle/bundleParser.ts#L328
      references: [
        {
          resourceType: 'Patient',
          id: patientId,
          vid: '1',
          rootUrl: apiUrl,
          referenceFullUrl: patientIdentity,
          referencePath: 'subject'
        }
      ]
    },
    {
      operation: 'create',
      resourceType: 'Condition',
      id: validCondition.id,
      resource: { ...validCondition, subject: undefined } // remove reference to patient
    },
    {
      operation: 'read',
      resourceType: 'Patient',
      id,
      resource: undefined
    },
    {
      operation: 'read',
      resourceType: 'Patient',
      id: 'PatientNotSameId',
      resource: undefined
    }
  ];
};
