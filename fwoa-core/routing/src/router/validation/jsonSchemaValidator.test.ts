/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidResourceError } from '@aws/fhir-works-on-aws-interface';
import invalidPatient from '../../sampleData/invalidV4Patient.json';
import validV3Account from '../../sampleData/validV3Account.json';
import validPatient from '../../sampleData/validV4Patient.json';
import JsonSchemaValidator from './jsonSchemaValidator';

describe('Validating V4 resources', () => {
  const validatorV4 = new JsonSchemaValidator('4.0.1');
  test('No error when validating valid resource', async () => {
    await expect(validatorV4.validate(validPatient)).resolves.toEqual(undefined);
  });

  test('Show error when validating invalid resource', async () => {
    await expect(validatorV4.validate(invalidPatient)).rejects.toThrowError(
      new InvalidResourceError(
        "Failed to parse request body as JSON resource. Error was: data.text should have required property 'div', data.gender should be equal to one of the allowed values"
      )
    );
  });

  test('Show error when checking for wrong version of FHIR resource', async () => {
    await expect(validatorV4.validate(validV3Account)).rejects.toThrowError(
      new InvalidResourceError(
        'Failed to parse request body as JSON resource. Error was: data should NOT have additional properties, data should NOT have additional properties, data should NOT have additional properties, data.subject should be array'
      )
    );
  });
});

describe('Validating V3 resources', () => {
  const validatorV3 = new JsonSchemaValidator('3.0.1');
  test('No error when validating valid v3 resource', async () => {
    await expect(validatorV3.validate(validV3Account)).resolves.toEqual(undefined);
  });

  test('No error when validating valid v3 Bundle', async () => {
    // example Bundle from https://www.hl7.org/fhir/stu3/bundle-transaction.json.html
    const bundle = {
      resourceType: 'Bundle',
      id: 'bundle-transaction',
      meta: { lastUpdated: '2014-08-18T01:43:30Z' },
      type: 'transaction',
      entry: [
        {
          fullUrl: 'urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a',
          resource: {
            resourceType: 'Patient',
            text: {
              status: 'generated',
              div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>'
            },
            active: true,
            name: [{ use: 'official', family: 'Chalmers', given: ['Peter', 'James'] }],
            gender: 'male',
            birthDate: '1974-12-25'
          },
          request: { method: 'POST', url: 'Patient' }
        },
        {
          fullUrl: 'urn:uuid:88f151c0-a954-468a-88bd-5ae15c08e059',
          resource: {
            resourceType: 'Patient',
            text: {
              status: 'generated',
              div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>'
            },
            active: true,
            name: [{ use: 'official', family: 'Chalmers', given: ['Peter', 'James'] }],
            gender: 'male',
            birthDate: '1974-12-25'
          },
          request: { method: 'POST', url: 'Patient', ifNoneExist: 'identifier=234234' }
        },
        {
          fullUrl: 'http://example.org/fhir/Patient/123',
          resource: {
            resourceType: 'Patient',
            id: '123',
            text: {
              status: 'generated',
              div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>'
            },
            active: true,
            name: [{ use: 'official', family: 'Chalmers', given: ['Peter', 'James'] }],
            gender: 'male',
            birthDate: '1974-12-25'
          },
          request: { method: 'PUT', url: 'Patient/123' }
        },
        {
          fullUrl: 'urn:uuid:74891afc-ed52-42a2-bcd7-f13d9b60f096',
          resource: {
            resourceType: 'Patient',
            text: {
              status: 'generated',
              div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>'
            },
            active: true,
            name: [{ use: 'official', family: 'Chalmers', given: ['Peter', 'James'] }],
            gender: 'male',
            birthDate: '1974-12-25'
          },
          request: { method: 'PUT', url: 'Patient?identifier=234234' }
        },
        {
          fullUrl: 'http://example.org/fhir/Patient/123a',
          resource: {
            resourceType: 'Patient',
            id: '123a',
            text: {
              status: 'generated',
              div: '<div xmlns="http://www.w3.org/1999/xhtml">Some narrative</div>'
            },
            active: true,
            name: [{ use: 'official', family: 'Chalmers', given: ['Peter', 'James'] }],
            gender: 'male',
            birthDate: '1974-12-25'
          },
          request: { method: 'PUT', url: 'Patient/123a', ifMatch: 'W/"2"' }
        },
        { request: { method: 'DELETE', url: 'Patient/234' } },
        { request: { method: 'DELETE', url: 'Patient?identifier=123456' } },
        {
          fullUrl: 'urn:uuid:79378cb8-8f58-48e8-a5e8-60ac2755b674',
          resource: {
            resourceType: 'Parameters',
            parameter: [{ name: 'coding', valueCoding: { system: 'http://loinc.org', code: '1963-8' } }]
          },
          request: { method: 'POST', url: 'ValueSet/$lookup' }
        },
        { request: { method: 'GET', url: 'Patient?name=peter' } },
        {
          request: {
            method: 'GET',
            url: 'Patient/12334',
            ifNoneMatch: 'W/"4"',
            ifModifiedSince: '2015-08-31T08:14:33+10:00'
          }
        }
      ]
    };

    await expect(validatorV3.validate(bundle)).resolves.toEqual(undefined);
  });

  test('valid AllergyIntolerance', async () => {
    // example AllergyIntolerance from http://hl7.org/fhir/STU3/allergyintolerance-example.json.html
    const allergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'example',
      text: {
        status: 'generated',
        div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><p><b>Generated Narrative with Details</b></p><p><b>id</b>: example</p><p><b>identifier</b>: 49476534</p><p><b>clinicalStatus</b>: active</p><p><b>verificationStatus</b>: confirmed</p><p><b>type</b>: allergy</p><p><b>category</b>: food</p><p><b>criticality</b>: high</p><p><b>code</b>: Cashew nuts <span>(Details : {SNOMED CT code '227493005' = 'Cashew nuts', given as 'Cashew nuts'})</span></p><p><b>patient</b>: <a>Patient/example</a></p><p><b>onset</b>: 01/01/2004</p><p><b>assertedDate</b>: 09/10/2014 2:58:00 PM</p><p><b>recorder</b>: <a>Practitioner/example</a></p><p><b>asserter</b>: <a>Patient/example</a></p><p><b>lastOccurrence</b>: 01/06/2012</p><p><b>note</b>: The criticality is high becasue of the observed anaphylactic reaction when challenged with cashew extract.</p><blockquote><p><b>reaction</b></p><p><b>substance</b>: cashew nut allergenic extract Injectable Product <span>(Details : {RxNorm code '1160593' = '1160593', given as 'cashew nut allergenic extract Injectable Product'})</span></p><p><b>manifestation</b>: Anaphylactic reaction <span>(Details : {SNOMED CT code '39579001' = 'Anaphylaxis', given as 'Anaphylactic reaction'})</span></p><p><b>description</b>: Challenge Protocol. Severe reaction to subcutaneous cashew extract. Epinephrine administered</p><p><b>onset</b>: 12/06/2012</p><p><b>severity</b>: severe</p><p><b>exposureRoute</b>: Subcutaneous route <span>(Details : {SNOMED CT code '34206005' = 'Subcutaneous route', given as 'Subcutaneous route'})</span></p></blockquote><blockquote><p><b>reaction</b></p><p><b>manifestation</b>: Urticaria <span>(Details : {SNOMED CT code '64305001' = 'Urticaria', given as 'Urticaria'})</span></p><p><b>onset</b>: 01/01/2004</p><p><b>severity</b>: moderate</p><p><b>note</b>: The patient reports that the onset of urticaria was within 15 minutes of eating cashews.</p></blockquote></div>"
      },
      identifier: [{ system: 'http://acme.com/ids/patients/risks', value: '49476534' }],
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      type: 'allergy',
      category: ['food'],
      criticality: 'high',
      code: { coding: [{ system: 'http://snomed.info/sct', code: '227493005', display: 'Cashew nuts' }] },
      patient: { reference: 'Patient/example' },
      onsetDateTime: '2004',
      assertedDate: '2014-10-09T14:58:00+11:00',
      recorder: { reference: 'Practitioner/example' },
      asserter: { reference: 'Patient/example' },
      lastOccurrence: '2012-06',
      note: [
        {
          text: 'The criticality is high becasue of the observed anaphylactic reaction when challenged with cashew extract.'
        }
      ],
      reaction: [
        {
          substance: {
            coding: [
              {
                system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                code: '1160593',
                display: 'cashew nut allergenic extract Injectable Product'
              }
            ]
          },
          manifestation: [
            {
              coding: [
                { system: 'http://snomed.info/sct', code: '39579001', display: 'Anaphylactic reaction' }
              ]
            }
          ],
          description:
            'Challenge Protocol. Severe reaction to subcutaneous cashew extract. Epinephrine administered',
          onset: '2012-06-12',
          severity: 'severe',
          exposureRoute: {
            coding: [{ system: 'http://snomed.info/sct', code: '34206005', display: 'Subcutaneous route' }]
          }
        },
        {
          manifestation: [
            { coding: [{ system: 'http://snomed.info/sct', code: '64305001', display: 'Urticaria' }] }
          ],
          onset: '2004',
          severity: 'moderate',
          note: [
            {
              text: 'The patient reports that the onset of urticaria was within 15 minutes of eating cashews.'
            }
          ]
        }
      ]
    };

    await expect(validatorV3.validate(allergyIntolerance)).resolves.toEqual(undefined);
  });

  test('Show error when validating invalid resource', async () => {
    await expect(validatorV3.validate(invalidPatient)).rejects.toThrowError(
      new InvalidResourceError(
        "Failed to parse request body as JSON resource. Error was: data.text should have required property 'div', data.gender should be equal to one of the allowed values"
      )
    );
  });
});
