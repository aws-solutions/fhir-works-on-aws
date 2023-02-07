/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';
import { stringQuery } from './stringQuery';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const nameParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'name')!.compiled[0];
const addressParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'address')!.compiled[0];
const givenParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'given')!.compiled[0];

describe('stringQuery', () => {
  test('simple value', () => {
    expect(stringQuery(nameParam, 'Robert Bell')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "Robert Bell",
              },
            }
        `);
  });
  test('simple value; with forward slash', () => {
    expect(stringQuery(nameParam, 'Robert/Bobby Bell')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "Robert\\\\/Bobby Bell",
              },
            }
        `);
  });
  test('simple value; with backwards slash', () => {
    expect(stringQuery(nameParam, 'Robert\\Bobby Bell')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "Robert\\\\Bobby Bell",
              },
            }
        `);
  });
  test('simple value; with characters', () => {
    expect(stringQuery(nameParam, '平仮名')).toMatchInlineSnapshot(`
            Object {
              "multi_match": Object {
                "fields": Array [
                  "name",
                  "name.*",
                ],
                "lenient": true,
                "query": "平仮名",
              },
            }
        `);
  });

  describe('modifiers', () => {
    describe(':exact', () => {
      test('simple value', () => {
        expect(stringQuery(nameParam, 'Robert Bell', 'exact')).toMatchInlineSnapshot(`
                      Object {
                        "multi_match": Object {
                          "fields": Array [
                            "name.keyword",
                            "name.*.keyword",
                          ],
                          "lenient": true,
                          "query": "Robert Bell",
                        },
                      }
              `);
      });
      test('simple value withcase differences', () => {
        expect(stringQuery(nameParam, 'RoBeRt BeLL', 'exact')).toMatchInlineSnapshot(`
                      Object {
                        "multi_match": Object {
                          "fields": Array [
                            "name.keyword",
                            "name.*.keyword",
                          ],
                          "lenient": true,
                          "query": "RoBeRt BeLL",
                        },
                      }
              `);
      });
    });

    describe(':contains', () => {
      test('simple parameter', () => {
        expect(stringQuery(givenParam, 'anne', 'contains')).toMatchInlineSnapshot(`
                                Object {
                                  "wildcard": Object {
                                    "name.given": Object {
                                      "value": "*anne*",
                                    },
                                  },
                                }
                        `);
      });

      test('name parameter', () => {
        expect(stringQuery(nameParam, 'anne', 'contains')).toMatchInlineSnapshot(`
                    Object {
                      "bool": Object {
                        "should": Array [
                          Object {
                            "wildcard": Object {
                              "name": Object {
                                "value": "*anne*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "name.family": Object {
                                "value": "*anne*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "name.given": Object {
                                "value": "*anne*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "name.text": Object {
                                "value": "*anne*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "name.prefix": Object {
                                "value": "*anne*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "name.suffix": Object {
                                "value": "*anne*",
                              },
                            },
                          },
                        ],
                      },
                    }
                `);
      });

      test('address parameter', () => {
        expect(stringQuery(addressParam, 'new', 'contains')).toMatchInlineSnapshot(`
                    Object {
                      "bool": Object {
                        "should": Array [
                          Object {
                            "wildcard": Object {
                              "address": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.city": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.country": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.district": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.line": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.postalCode": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.state": Object {
                                "value": "*new*",
                              },
                            },
                          },
                          Object {
                            "wildcard": Object {
                              "address.text": Object {
                                "value": "*new*",
                              },
                            },
                          },
                        ],
                      },
                    }
                `);
      });
    });
  });
});
