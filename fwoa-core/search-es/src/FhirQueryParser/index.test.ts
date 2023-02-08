/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { parseQuery } from './index';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');

describe('queryParser', () => {
  test('string with modifier', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Patient', {
      'name:exact': 'John'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "Patient",
              "searchParams": Array [
                Object {
                  "modifier": "exact",
                  "name": "name",
                  "parsedSearchValues": Array [
                    "John",
                  ],
                  "searchParam": Object {
                    "base": "Patient",
                    "compiled": Array [
                      Object {
                        "path": "name",
                        "resourceType": "Patient",
                      },
                    ],
                    "description": "A server defined search that may match any of the string fields in the HumanName, including family, give, prefix, suffix, suffix, and/or text",
                    "name": "name",
                    "type": "string",
                    "url": "http://hl7.org/fhir/SearchParameter/Patient-name",
                  },
                  "type": "string",
                },
              ],
            }
        `);
  });

  test('string with unknown modifier', () => {
    expect(() =>
      parseQuery(fhirSearchParametersRegistry, 'Patient', {
        'name:unknownModifier': 'John'
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Unsupported string search modifier: unknownModifier"`);
  });

  test('string OR', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Patient', {
      'name:exact': 'John,Anna'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "Patient",
              "searchParams": Array [
                Object {
                  "modifier": "exact",
                  "name": "name",
                  "parsedSearchValues": Array [
                    "John",
                    "Anna",
                  ],
                  "searchParam": Object {
                    "base": "Patient",
                    "compiled": Array [
                      Object {
                        "path": "name",
                        "resourceType": "Patient",
                      },
                    ],
                    "description": "A server defined search that may match any of the string fields in the HumanName, including family, give, prefix, suffix, suffix, and/or text",
                    "name": "name",
                    "type": "string",
                    "url": "http://hl7.org/fhir/SearchParameter/Patient-name",
                  },
                  "type": "string",
                },
              ],
            }
        `);
  });

  test('string AND', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Patient', {
      'name:exact': ['John', 'Anna']
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "Patient",
              "searchParams": Array [
                Object {
                  "modifier": "exact",
                  "name": "name",
                  "parsedSearchValues": Array [
                    "John",
                  ],
                  "searchParam": Object {
                    "base": "Patient",
                    "compiled": Array [
                      Object {
                        "path": "name",
                        "resourceType": "Patient",
                      },
                    ],
                    "description": "A server defined search that may match any of the string fields in the HumanName, including family, give, prefix, suffix, suffix, and/or text",
                    "name": "name",
                    "type": "string",
                    "url": "http://hl7.org/fhir/SearchParameter/Patient-name",
                  },
                  "type": "string",
                },
                Object {
                  "modifier": "exact",
                  "name": "name",
                  "parsedSearchValues": Array [
                    "Anna",
                  ],
                  "searchParam": Object {
                    "base": "Patient",
                    "compiled": Array [
                      Object {
                        "path": "name",
                        "resourceType": "Patient",
                      },
                    ],
                    "description": "A server defined search that may match any of the string fields in the HumanName, including family, give, prefix, suffix, suffix, and/or text",
                    "name": "name",
                    "type": "string",
                    "url": "http://hl7.org/fhir/SearchParameter/Patient-name",
                  },
                  "type": "string",
                },
              ],
            }
        `);
  });

  test('number', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'ChargeItem', {
      'factor-override': '10'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "ChargeItem",
              "searchParams": Array [
                Object {
                  "modifier": undefined,
                  "name": "factor-override",
                  "parsedSearchValues": Array [
                    Object {
                      "implicitRange": Object {
                        "end": 10.5,
                        "start": 9.5,
                      },
                      "number": 10,
                      "prefix": "eq",
                    },
                  ],
                  "searchParam": Object {
                    "base": "ChargeItem",
                    "compiled": Array [
                      Object {
                        "path": "factorOverride",
                        "resourceType": "ChargeItem",
                      },
                    ],
                    "description": "Factor overriding the associated rules",
                    "name": "factor-override",
                    "type": "number",
                    "url": "http://hl7.org/fhir/SearchParameter/ChargeItem-factor-override",
                  },
                  "type": "number",
                },
              ],
            }
        `);
  });

  test('date', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Patient', {
      birthdate: '1999-09-09'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "Patient",
              "searchParams": Array [
                Object {
                  "modifier": undefined,
                  "name": "birthdate",
                  "parsedSearchValues": Array [
                    Object {
                      "prefix": "eq",
                      "range": Object {
                        "end": 1999-09-09T23:59:59.999Z,
                        "start": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  ],
                  "searchParam": Object {
                    "base": "Patient",
                    "compiled": Array [
                      Object {
                        "path": "birthDate",
                        "resourceType": "Patient",
                      },
                    ],
                    "description": "Multiple Resources: 

            * [Patient](patient.html): The patient's date of birth
            * [Person](person.html): The person's date of birth
            * [RelatedPerson](relatedperson.html): The Related Person's date of birth
            ",
                    "name": "birthdate",
                    "type": "date",
                    "url": "http://hl7.org/fhir/SearchParameter/individual-birthdate",
                  },
                  "type": "date",
                },
              ],
            }
        `);
  });

  test('quantity', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Observation', {
      'value-quantity': '5.4|http://unitsofmeasure.org|mg'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "Observation",
              "searchParams": Array [
                Object {
                  "modifier": undefined,
                  "name": "value-quantity",
                  "parsedSearchValues": Array [
                    Object {
                      "code": "mg",
                      "implicitRange": Object {
                        "end": 5.45,
                        "start": 5.3500000000000005,
                      },
                      "number": 5.4,
                      "prefix": "eq",
                      "system": "http://unitsofmeasure.org",
                    },
                  ],
                  "searchParam": Object {
                    "base": "Observation",
                    "compiled": Array [
                      Object {
                        "path": "valueQuantity",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueSampledData",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueCodeableConcept",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueString",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueBoolean",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueInteger",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueRange",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueRatio",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueTime",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valueDateTime",
                        "resourceType": "Observation",
                      },
                      Object {
                        "path": "valuePeriod",
                        "resourceType": "Observation",
                      },
                    ],
                    "description": "The value of the observation, if the value is a Quantity, or a SampledData (just search on the bounds of the values in sampled data)",
                    "name": "value-quantity",
                    "type": "quantity",
                    "url": "http://hl7.org/fhir/SearchParameter/Observation-value-quantity",
                  },
                  "type": "quantity",
                },
              ],
            }
        `);
  });

  test('token', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Patient', {
      identifier: 'http://acme.org/patient|2345'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "resourceType": "Patient",
              "searchParams": Array [
                Object {
                  "modifier": undefined,
                  "name": "identifier",
                  "parsedSearchValues": Array [
                    Object {
                      "code": "2345",
                      "explicitNoSystemProperty": false,
                      "system": "http://acme.org/patient",
                    },
                  ],
                  "searchParam": Object {
                    "base": "Patient",
                    "compiled": Array [
                      Object {
                        "path": "identifier",
                        "resourceType": "Patient",
                      },
                    ],
                    "description": "A patient identifier",
                    "name": "identifier",
                    "type": "token",
                    "url": "http://hl7.org/fhir/SearchParameter/Patient-identifier",
                  },
                  "type": "token",
                },
              ],
            }
        `);
  });

  test('chained params', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'DiagnosticReport', {
      'subject.name': 'DiagnosticReport?subject.name=peter'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "chainedSearchParams": Object {
                "subject.name": Array [
                  "DiagnosticReport?subject.name=peter",
                ],
              },
              "resourceType": "DiagnosticReport",
              "searchParams": Array [],
            }
        `);
  });

  test('inclusion params', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'MedicationRequest', {
      _include: 'MedicationRequest:patient',
      _revinclude: 'Provenance:target'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "inclusionSearchParams": Array [
                Object {
                  "isWildcard": false,
                  "path": "subject",
                  "searchParameter": "patient",
                  "sourceResource": "MedicationRequest",
                  "targetResourceType": undefined,
                  "type": "_include",
                },
                Object {
                  "isWildcard": false,
                  "path": "target",
                  "searchParameter": "target",
                  "sourceResource": "Provenance",
                  "targetResourceType": undefined,
                  "type": "_revinclude",
                },
              ],
              "resourceType": "MedicationRequest",
              "searchParams": Array [],
            }
        `);
  });

  test('other params', () => {
    const q = parseQuery(fhirSearchParametersRegistry, 'Patient', {
      _count: '10',
      _sort: '_lastUpdated'
    });
    expect(q).toMatchInlineSnapshot(`
            Object {
              "otherParams": Object {
                "_count": Array [
                  "10",
                ],
                "_sort": Array [
                  "_lastUpdated",
                ],
              },
              "resourceType": "Patient",
              "searchParams": Array [],
            }
        `);
  });
});
