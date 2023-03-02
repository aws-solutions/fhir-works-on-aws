/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { BatchReadWriteRequest, clone, ResourceNotFoundError } from '@aws/fhir-works-on-aws-interface';
import { ReadResourceRequest } from '@aws/fhir-works-on-aws-interface/lib/persistence';
import { resourceTypeWithUuidRegExp, uuidRegExp } from '../../regExpressions';
import DynamoDbDataService from '../__mocks_/dynamoDbDataService';
import BundleParser from './bundleParser';

describe('parseResource', () => {
  const serverUrl = 'https://API_URL.com';
  beforeEach(() => {
    expect.hasAssertions();
  });

  describe('parser returns error for Bundle requests that are not supported', () => {
    test('Bundle has a PATCH request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/1',
            resource: {
              resourceType: 'Observation',
              id: '1',
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '15074-8',
                    display: 'Glucose [Moles/volume] in Blood'
                  }
                ]
              }
            },
            request: {
              method: 'PATCH',
              url: 'Observation'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support PATCH entries in the Bundle');
      }
    });
    test('Bundle has a Transaction request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/?_format=json',
            resource: {},
            request: {
              method: 'POST',
              url: '?_format=json'
            }
          }
        ]
      };
      bundleRequestJson.entry[0].resource = bundleRequestJson;
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support Bundle entries in the Bundle');
      }
    });

    test('Bundle has extra long reference', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              status: 'final',
              subject: {
                reference: `https://${'a'.repeat(700)}/Patient/111`
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };

      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('Reference URL exceeds length limit.');
      }
    });

    test('Bundle has extra long full URL', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: `https://${'a'.repeat(700)}`,
            resource: {
              resourceType: 'Observation',
              status: 'final',
              subject: {
                reference: 'Patient/111'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };

      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('Entry full URL length exceeds length limit.');
      }
    });

    test('Bundle has a vread request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/1/_history/2',
            request: {
              method: 'GET',
              url: 'Observation/1/_history/2'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support V_READ entries in the Bundle');
      }
    });
    test('Bundle has a search type request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation?subject=bob',
            request: {
              method: 'GET',
              url: 'Observation?subject=bob'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support SEARCH entries in the Bundle');
      }
    });
    test('Bundle has a search system request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com?subject=bob',
            request: {
              method: 'GET',
              url: '?subject=bob'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support SEARCH entries in the Bundle');
      }
    });
    test('Bundle has a history instance request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/1234/_history?subject=bob',
            request: {
              method: 'GET',
              url: 'Observation/1234/_history?subject=bob'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support HISTORY entries in the Bundle');
      }
    });
    test('Bundle has a history type request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/_history?subject=bob',
            request: {
              method: 'GET',
              url: 'Observation/_history?subject=bob'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support HISTORY entries in the Bundle');
      }
    });
    test('Bundle has a history system request', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/_history?subject=bob',
            request: {
              method: 'GET',
              url: '/_history?subject=bob'
            }
          }
        ]
      };
      try {
        // OPERATE
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        // CHECK
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual('We currently do not support HISTORY entries in the Bundle');
      }
    });
  });

  describe('parses Bundle request with references correctly', () => {
    test('Internal references to patient being created and updated. Reference to preexisting patient on server. Reference to patients on external server. Reference chain: Observation refers to another observation which then refers to a patient', async () => {
      // BUILD
      // Mocking out logging of references to external server
      const consoleOutput: string[] = [];
      const mockedLog = (message: string, param: string) => consoleOutput.push(`${message} ${param}`);
      console.log = mockedLog;

      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Patient/23',
            resource: {
              resourceType: 'Patient',
              id: '23',
              name: [
                {
                  family: 'Simpson',
                  given: ['Homer']
                }
              ],
              gender: 'male'
            },
            request: {
              method: 'POST',
              url: 'Patient'
            }
          },
          {
            fullUrl: 'urn:uuid:8cafa46d-08b4-4ee4-b51b-803e20ae8126',
            resource: {
              id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
              resourceType: 'Patient',
              name: [
                {
                  family: 'Simpson',
                  given: ['Lisa']
                }
              ],
              gender: 'female'
            },
            request: {
              method: 'PUT',
              url: 'Patient/8cafa46d-08b4-4ee4-b51b-803e20ae8126'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Observation/1',
            resource: {
              resourceType: 'Observation',
              id: '1',
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
                reference: 'Patient/23'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Observation/2',
            resource: {
              resourceType: 'Observation',
              id: '2',
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
                reference: 'urn:uuid:8cafa46d-08b4-4ee4-b51b-803e20ae8126'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Observation/3',
            resource: {
              resourceType: 'Observation',
              id: '3',
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
                reference: 'Patient/47135b80-b721-430b-9d4b-1557edc64947'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://ANOTHER-SERVER-A.com/Observation/4',
            resource: {
              resourceType: 'Observation',
              id: '4',
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
                reference: 'Patient/1'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://ANOTHER-SERVER-B.com/Observation/5',
            resource: {
              resourceType: 'Observation',
              id: '5',
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
                reference: 'https://ANOTHER-SERVER-B.com/Patient/23'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Observation/6',
            resource: {
              resourceType: 'Observation',
              id: '6',
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
                reference: 'Observation/1'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            request: {
              method: 'GET',
              url: '/Patient/someRandomResource'
            }
          }
        ]
      };

      // OPERATE
      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      // CHECK
      const expectedRequests: BatchReadWriteRequest[] = [
        {
          operation: 'create',
          resource: {
            resourceType: 'Patient',
            id: '23',
            name: [
              {
                family: 'Simpson',
                given: ['Homer']
              }
            ],
            gender: 'male'
          },
          fullUrl: 'https://API_URL.com/Patient/23',
          resourceType: 'Patient',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'update',
          resource: {
            id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126',
            resourceType: 'Patient',
            name: [
              {
                family: 'Simpson',
                given: ['Lisa']
              }
            ],
            gender: 'female'
          },
          fullUrl: 'urn:uuid:8cafa46d-08b4-4ee4-b51b-803e20ae8126',
          resourceType: 'Patient',
          id: '8cafa46d-08b4-4ee4-b51b-803e20ae8126'
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '1',
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
              reference: expect.stringMatching(resourceTypeWithUuidRegExp)
            }
          },
          fullUrl: 'https://API_URL.com/Observation/1',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '2',
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
              reference: 'Patient/8cafa46d-08b4-4ee4-b51b-803e20ae8126'
            }
          },
          fullUrl: 'https://API_URL.com/Observation/2',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '3',
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
              reference: 'Patient/47135b80-b721-430b-9d4b-1557edc64947'
            }
          },
          fullUrl: 'https://API_URL.com/Observation/3',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '4',
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
              reference: 'Patient/1'
            }
          },
          fullUrl: 'https://ANOTHER-SERVER-A.com/Observation/4',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '5',
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
              reference: 'https://ANOTHER-SERVER-B.com/Patient/23'
            }
          },
          fullUrl: 'https://ANOTHER-SERVER-B.com/Observation/5',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '6',
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
              reference: expect.stringMatching(resourceTypeWithUuidRegExp)
            }
          },
          fullUrl: 'https://API_URL.com/Observation/6',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'read',
          resource: '/Patient/someRandomResource',
          fullUrl: '',
          resourceType: 'Patient',
          id: 'someRandomResource'
        }
      ];

      expect(actualRequests).toEqual(expectedRequests);

      expect(consoleOutput.length).toEqual(2);
      expect(consoleOutput).toContain(
        'This resource has a reference to an external server https://ANOTHER-SERVER-A.com/Observation/4'
      );
      expect(consoleOutput).toContain(
        'This resource has a reference to an external server https://ANOTHER-SERVER-B.com/Observation/5'
      );
    });

    test('An appointment with a reference to a doctor and a patient', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Appointment/1',
            resource: {
              resourceType: 'Appointment',
              status: 'booked',
              participant: [
                {
                  actor: {
                    reference: 'Patient/23',
                    display: 'Homer Simpson'
                  },
                  required: 'required',
                  status: 'accepted'
                },
                {
                  type: [
                    {
                      coding: [
                        {
                          system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                          code: 'ATND'
                        }
                      ]
                    }
                  ],
                  actor: {
                    reference: 'Practitioner/1',
                    display: 'Dr Adam Careful'
                  },
                  required: 'required',
                  status: 'accepted'
                }
              ]
            },
            request: {
              method: 'POST',
              url: 'Appointment'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Practitioner/1',
            resource: {
              resourceType: 'Practitioner',
              name: [
                {
                  use: 'official',
                  family: 'Careful',
                  given: ['Adam'],
                  suffix: ['MD']
                }
              ],
              gender: 'male',
              birthDate: '1971-11-07'
            },
            request: {
              method: 'POST',
              url: 'Practitioner'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Patient/23',
            resource: {
              resourceType: 'Patient',
              id: '23',
              name: [
                {
                  family: 'Simpson',
                  given: ['Homer']
                }
              ],
              gender: 'male'
            },
            request: {
              method: 'POST',
              url: 'Patient'
            }
          }
        ]
      };
      const expectedRequests: BatchReadWriteRequest[] = [
        {
          fullUrl: 'https://API_URL.com/Appointment/1',
          id: expect.stringMatching(uuidRegExp),
          resource: {
            participant: [
              {
                actor: {
                  display: 'Homer Simpson',
                  reference: expect.stringMatching(resourceTypeWithUuidRegExp)
                },
                required: 'required',
                status: 'accepted'
              },
              {
                actor: {
                  display: 'Dr Adam Careful',
                  reference: expect.stringMatching(resourceTypeWithUuidRegExp)
                },
                required: 'required',
                status: 'accepted',
                type: [
                  {
                    coding: [
                      {
                        code: 'ATND',
                        system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType'
                      }
                    ]
                  }
                ]
              }
            ],
            resourceType: 'Appointment',
            status: 'booked'
          },
          resourceType: 'Appointment',
          operation: 'create'
        },
        {
          fullUrl: 'https://API_URL.com/Practitioner/1',
          id: expect.stringMatching(uuidRegExp),
          resource: {
            birthDate: '1971-11-07',
            gender: 'male',
            name: [
              {
                family: 'Careful',
                given: ['Adam'],
                suffix: ['MD'],
                use: 'official'
              }
            ],
            resourceType: 'Practitioner'
          },
          resourceType: 'Practitioner',
          operation: 'create'
        },
        {
          fullUrl: 'https://API_URL.com/Patient/23',
          id: expect.stringMatching(uuidRegExp),
          resource: {
            resourceType: 'Patient',
            id: '23',
            name: [
              {
                family: 'Simpson',
                given: ['Homer']
              }
            ],
            gender: 'male'
          },
          resourceType: 'Patient',
          operation: 'create'
        }
      ];

      // OPERATE
      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      // CHECK
      expect(actualRequests).toEqual(expectedRequests);
    });

    test('POST with absolute URL references that match the server url', async () => {
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              status: 'final',
              code: {
                coding: [
                  {
                    code: 'LQA',
                    display: 'display value for LQA'
                  }
                ]
              },
              subject: {
                reference: `${serverUrl}/Patient/111`
              },
              device: {
                // make sure versioned references also work
                reference: `${serverUrl}/Device/222/_history/7`
              },
              effectiveDateTime: '2021-01-09T20:00:06Z',
              valueQuantity: {
                unit: 'cm',
                value: 170
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };

      const batchReadWriteRequest = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );
      expect(batchReadWriteRequest).toHaveLength(1);
      expect(batchReadWriteRequest[0]).toMatchInlineSnapshot(
        { id: expect.stringMatching(uuidRegExp) },
        `
                Object {
                  "fullUrl": "",
                  "id": StringMatching /\\\\w\\{8\\}-\\\\w\\{4\\}-\\\\w\\{4\\}-\\\\w\\{4\\}-\\\\w\\{12\\}/,
                  "operation": "create",
                  "resource": Object {
                    "code": Object {
                      "coding": Array [
                        Object {
                          "code": "LQA",
                          "display": "display value for LQA",
                        },
                      ],
                    },
                    "device": Object {
                      "reference": "Device/222/_history/7",
                    },
                    "effectiveDateTime": "2021-01-09T20:00:06Z",
                    "resourceType": "Observation",
                    "status": "final",
                    "subject": Object {
                      "reference": "Patient/111",
                    },
                    "valueQuantity": Object {
                      "unit": "cm",
                      "value": 170,
                    },
                  },
                  "resourceType": "Observation",
                }
            `
      );
    });

    test('POST with missing fullUrl and relative references', async () => {
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              status: 'final',
              code: {
                coding: [
                  {
                    code: 'LQA',
                    display: 'display value for LQA'
                  }
                ]
              },
              subject: {
                reference: 'Patient/111'
              },
              device: {
                reference: 'Device/222'
              },
              effectiveDateTime: '2021-01-09T20:00:06Z',
              valueQuantity: {
                unit: 'cm',
                value: 170
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };

      const batchReadWriteRequest = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );
      expect(batchReadWriteRequest).toHaveLength(1);
      expect(batchReadWriteRequest[0]).toMatchInlineSnapshot(
        { id: expect.stringMatching(uuidRegExp) },
        `
                Object {
                  "fullUrl": "",
                  "id": StringMatching /\\\\w\\{8\\}-\\\\w\\{4\\}-\\\\w\\{4\\}-\\\\w\\{4\\}-\\\\w\\{12\\}/,
                  "operation": "create",
                  "resource": Object {
                    "code": Object {
                      "coding": Array [
                        Object {
                          "code": "LQA",
                          "display": "display value for LQA",
                        },
                      ],
                    },
                    "device": Object {
                      "reference": "Device/222",
                    },
                    "effectiveDateTime": "2021-01-09T20:00:06Z",
                    "resourceType": "Observation",
                    "status": "final",
                    "subject": Object {
                      "reference": "Patient/111",
                    },
                    "valueQuantity": Object {
                      "unit": "cm",
                      "value": 170,
                    },
                  },
                  "resourceType": "Observation",
                }
            `
      );
    });

    test('Circular references. An Observation with a reference to a Procedure. That Procedure referencing the Observation.', async () => {
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/1',
            resource: {
              resourceType: 'Observation',
              id: '1',
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '15074-8',
                    display: 'Glucose [Moles/volume] in Blood'
                  }
                ]
              },
              partOf: {
                reference: 'Procedure/1'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://API_URL.com/Procedure/1',
            resource: {
              resourceType: 'Procedure',
              id: '1',
              status: 'completed',
              code: {
                coding: [
                  {
                    system: 'http://snomed.info/sct',
                    code: '80146002',
                    display: 'Appendectomy (Procedure)'
                  }
                ],
                text: 'Appendectomy'
              },
              partOf: {
                reference: 'Observation/1'
              }
            },
            request: {
              method: 'POST',
              url: 'Procedure'
            }
          }
        ]
      };
      const expectedRequests: BatchReadWriteRequest[] = [
        {
          fullUrl: 'https://API_URL.com/Observation/1',
          id: expect.stringMatching(uuidRegExp),
          resource: {
            resourceType: 'Observation',
            id: '1',
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '15074-8',
                  display: 'Glucose [Moles/volume] in Blood'
                }
              ]
            },
            partOf: {
              reference: expect.stringMatching(resourceTypeWithUuidRegExp)
            }
          },
          resourceType: 'Observation',
          operation: 'create'
        },
        {
          fullUrl: 'https://API_URL.com/Procedure/1',
          id: expect.stringMatching(uuidRegExp),
          resource: {
            resourceType: 'Procedure',
            id: '1',
            status: 'completed',
            code: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '80146002',
                  display: 'Appendectomy (Procedure)'
                }
              ],
              text: 'Appendectomy'
            },
            partOf: {
              reference: expect.stringMatching(resourceTypeWithUuidRegExp)
            }
          },
          resourceType: 'Procedure',
          operation: 'create'
        }
      ];

      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      expect(actualRequests).toEqual(expectedRequests);
    });

    test('Reference is referring to Resource on server, but the resource does not exist', async () => {
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/1',
            resource: {
              resourceType: 'Observation',
              id: '1',
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
                reference: 'Patient/1234'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };
      try {
        DynamoDbDataService.readResource = jest.fn().mockImplementation(async (req: ReadResourceRequest) => {
          if (req.resourceType === 'Patient' && req.id === '1234') {
            throw new ResourceNotFoundError('Patient', '1234');
          }
        });
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual(
          "This entry refer to a resource that does not exist on this server. Entry is referring to 'Patient/1234'"
        );
      }
    });
    test('Reference is referring to a resource on another server', async () => {
      // Mocking out logging of references to external server
      const consoleOutput: string[] = [];
      const mockedLog = (message: string, param: string) => consoleOutput.push(`${message} ${param}`);
      console.log = mockedLog;

      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://ANOTHER-SERVER-A.com/Observation/4',
            resource: {
              resourceType: 'Observation',
              id: '4',
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
                reference: 'Patient/1'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          },
          {
            fullUrl: 'https://ANOTHER-SERVER-B.com/Observation/5',
            resource: {
              resourceType: 'Observation',
              id: '5',
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
                reference: 'https://ANOTHER-SERVER-B.com/Patient/23'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };
      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      const expectedRequests: BatchReadWriteRequest[] = [
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '4',
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
              reference: 'Patient/1'
            }
          },
          fullUrl: 'https://ANOTHER-SERVER-A.com/Observation/4',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Observation',
            id: '5',
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
              reference: 'https://ANOTHER-SERVER-B.com/Patient/23'
            }
          },
          fullUrl: 'https://ANOTHER-SERVER-B.com/Observation/5',
          resourceType: 'Observation',
          id: expect.stringMatching(uuidRegExp)
        }
      ];

      expect(actualRequests).toEqual(expectedRequests);

      expect(consoleOutput.length).toEqual(2);
      expect(consoleOutput).toContain(
        'This resource has a reference to an external server https://ANOTHER-SERVER-A.com/Observation/4'
      );
      expect(consoleOutput).toContain(
        'This resource has a reference to an external server https://ANOTHER-SERVER-B.com/Observation/5'
      );
    });

    test('Invalid reference format', async () => {
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/Observation/1',
            resource: {
              resourceType: 'Observation',
              id: '1',
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
                reference: 'invalidReferenceFormat'
              }
            },
            request: {
              method: 'POST',
              url: 'Observation'
            }
          }
        ]
      };
      try {
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual(
          'This entry\'s reference is not recognized. Entry\'s reference is: invalidReferenceFormat . Valid format includes "<url>/resourceType/id" or "<urn:uuid:|urn:oid:><id>'
        );
      }
    });

    test('An entry can have multiple references', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/ExplanationOfBenefit/1',
            resource: {
              id: '1',
              resourceType: 'ExplanationOfBenefit',
              use: 'claim',
              contained: [
                {
                  resourceType: 'ServiceRequest',
                  id: 'referral',
                  status: 'completed',
                  intent: 'order'
                }
              ],
              referral: {
                reference: '#referral'
              },
              provider: {
                reference: 'urn:uuid:0f22e4df-fa69-3a2c-b463-43050fbcf129'
              }
            },
            request: {
              method: 'POST',
              url: 'ExplanationOfBenefit'
            }
          },
          {
            fullUrl: 'urn:uuid:0f22e4df-fa69-3a2c-b463-43050fbcf129',
            resource: {
              resourceType: 'Practitioner',
              id: '0f22e4df-fa69-3a2c-b463-43050fbcf129',
              active: true,
              name: [
                {
                  family: 'Veum823',
                  given: ['Ron353'],
                  prefix: ['Dr.']
                }
              ],
              gender: 'male'
            },
            request: {
              method: 'POST',
              url: 'Practitioner'
            }
          }
        ]
      };

      // OPERATE
      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      // CHECK
      const expectedRequests: BatchReadWriteRequest[] = [
        {
          operation: 'create',
          resource: {
            id: '1',
            resourceType: 'ExplanationOfBenefit',
            use: 'claim',
            contained: [
              {
                resourceType: 'ServiceRequest',
                id: 'referral',
                status: 'completed',
                intent: 'order'
              }
            ],
            referral: {
              reference: '#referral'
            },
            provider: {
              reference: expect.stringMatching(resourceTypeWithUuidRegExp)
            }
          },
          fullUrl: 'https://API_URL.com/ExplanationOfBenefit/1',
          resourceType: 'ExplanationOfBenefit',
          id: expect.stringMatching(uuidRegExp)
        },
        {
          operation: 'create',
          resource: {
            resourceType: 'Practitioner',
            id: '0f22e4df-fa69-3a2c-b463-43050fbcf129',
            active: true,
            name: [
              {
                family: 'Veum823',
                given: ['Ron353'],
                prefix: ['Dr.']
              }
            ],
            gender: 'male'
          },
          fullUrl: 'urn:uuid:0f22e4df-fa69-3a2c-b463-43050fbcf129',
          resourceType: 'Practitioner',
          id: expect.stringMatching(uuidRegExp)
        }
      ];
      expect(actualRequests).toEqual(expectedRequests);
    });

    test('References to two contained resources', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/ExplanationOfBenefit/1',
            resource: {
              id: '1',
              resourceType: 'ExplanationOfBenefit',
              use: 'claim',
              contained: [
                {
                  resourceType: 'ServiceRequest',
                  id: 'referral',
                  status: 'completed',
                  intent: 'order'
                },
                {
                  resourceType: 'Coverage',
                  id: 'coverage',
                  status: 'active',
                  type: {
                    text: 'Cigna Health'
                  },
                  payor: [
                    {
                      display: 'Cigna Health'
                    }
                  ]
                }
              ],
              referral: {
                reference: '#referral'
              },
              insurance: [
                {
                  focal: true,
                  coverage: {
                    reference: '#coverage',
                    display: 'Cigna Health'
                  }
                }
              ]
            },
            request: {
              method: 'POST',
              url: 'ExplanationOfBenefit'
            }
          }
        ]
      };

      // OPERATE
      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      // CHECK
      const expectedRequests: BatchReadWriteRequest[] = [
        {
          operation: 'create',
          resource: {
            id: '1',
            resourceType: 'ExplanationOfBenefit',
            use: 'claim',
            contained: [
              {
                resourceType: 'ServiceRequest',
                id: 'referral',
                status: 'completed',
                intent: 'order'
              },
              {
                resourceType: 'Coverage',
                id: 'coverage',
                status: 'active',
                type: {
                  text: 'Cigna Health'
                },
                payor: [
                  {
                    display: 'Cigna Health'
                  }
                ]
              }
            ],
            referral: {
              reference: '#referral'
            },
            insurance: [
              {
                focal: true,
                coverage: {
                  reference: '#coverage',
                  display: 'Cigna Health'
                }
              }
            ]
          },
          fullUrl: 'https://API_URL.com/ExplanationOfBenefit/1',
          resourceType: 'ExplanationOfBenefit',
          id: expect.stringMatching(uuidRegExp)
        }
      ];
      expect(actualRequests).toEqual(expectedRequests);
    });
    test('References to a contained resource that does not exist', async () => {
      // BUILD
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            fullUrl: 'https://API_URL.com/ExplanationOfBenefit/1',
            resource: {
              id: '1',
              resourceType: 'ExplanationOfBenefit',
              use: 'claim',
              referral: {
                reference: '#referral'
              },
              provider: {
                reference: 'urn:uuid:0f22e4df-fa69-3a2c-b463-43050fbcf129'
              }
            },
            request: {
              method: 'POST',
              url: 'ExplanationOfBenefit'
            }
          }
        ]
      };

      // OPERATE
      try {
        await BundleParser.parseResource(bundleRequestJson, DynamoDbDataService, serverUrl);
      } catch (e) {
        expect((e as any).name).toEqual('Error');
        expect((e as any).message).toEqual(
          'This entry refer to a contained resource that does not exist. Contained resource is referring to #referral'
        );
      }
    });

    test('Do not consider "referenceSeq" as a "reference". Only resource fields explicitly named "reference" should be considered a reference', async () => {
      // BUILD
      const molecSeqEntry = {
        fullUrl: 'https://API_URL.com/MolecularSequence/1',
        resource: {
          resourceType: 'MolecularSequence',
          type: 'dna',
          coordinateSystem: 0,
          referenceSeq: {
            referenceSeqId: {
              coding: [
                {
                  system: 'http://www.ncbi.nlm.nih.gov/nuccore',
                  code: 'NC_000009.11'
                }
              ]
            },
            strand: 'watson',
            windowStart: 22125500,
            windowEnd: 22125510
          },
          meta: {
            lastUpdated: '2020-03-26T15:46:55.848Z',
            versionId: '1'
          }
        },
        request: {
          method: 'POST',
          url: 'ExplanationOfBenefit'
        }
      };
      const bundleRequestJson = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [molecSeqEntry]
      };

      // OPERATE
      const actualRequests = await BundleParser.parseResource(
        bundleRequestJson,
        DynamoDbDataService,
        serverUrl
      );

      // CHECK
      const expectedRequest = clone(molecSeqEntry);
      delete expectedRequest.request;
      expectedRequest.resourceType = 'MolecularSequence';
      expectedRequest.operation = 'create';
      expectedRequest.id = expect.stringMatching(uuidRegExp);

      expect(actualRequests).toEqual([expectedRequest]);
    });
  });
});
