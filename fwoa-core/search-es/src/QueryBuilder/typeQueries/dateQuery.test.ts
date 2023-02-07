/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { parseDateSearchValue } from '../../FhirQueryParser/typeParsers/dateParser';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';
import { dateQuery } from './dateQuery';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const birthdateParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'birthdate')!.compiled[0];

describe('dateQuery', () => {
  test('no prefix', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must": Array [
                              Object {
                                "range": Object {
                                  "birthDate.start": Object {
                                    "gte": 1999-09-09T00:00:00.000Z,
                                  },
                                },
                              },
                              Object {
                                "range": Object {
                                  "birthDate.end": Object {
                                    "lte": 1999-09-09T23:59:59.999Z,
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('eq', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('eq1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must": Array [
                              Object {
                                "range": Object {
                                  "birthDate.start": Object {
                                    "gte": 1999-09-09T00:00:00.000Z,
                                  },
                                },
                              },
                              Object {
                                "range": Object {
                                  "birthDate.end": Object {
                                    "lte": 1999-09-09T23:59:59.999Z,
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('ne', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('ne1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "range": Object {
                            "birthDate": Object {
                              "gt": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate": Object {
                              "lt": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "bool": Object {
                            "must_not": Object {
                              "bool": Object {
                                "must": Array [
                                  Object {
                                    "range": Object {
                                      "birthDate.start": Object {
                                        "gte": 1999-09-09T00:00:00.000Z,
                                      },
                                    },
                                  },
                                  Object {
                                    "range": Object {
                                      "birthDate.end": Object {
                                        "lte": 1999-09-09T23:59:59.999Z,
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('lt', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('lt1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "lt": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.start": Object {
                              "lte": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('le', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('le1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "lte": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.start": Object {
                              "lte": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('gt', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('gt1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gt": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.end": Object {
                              "gte": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('ge', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('ge1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gte": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.end": Object {
                              "gte": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('sa', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('sa1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "gt": 1999-09-09T23:59:59.999Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.start": Object {
                              "gt": 1999-09-09T23:59:59.999Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
  test('eb', () => {
    expect(dateQuery(birthdateParam, parseDateSearchValue('eb1999-09-09'))).toMatchInlineSnapshot(`
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "range": Object {
                      "birthDate": Object {
                        "lt": 1999-09-09T00:00:00.000Z,
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "must": Array [
                        Object {
                          "exists": Object {
                            "field": "birthDate.start",
                          },
                        },
                        Object {
                          "exists": Object {
                            "field": "birthDate.end",
                          },
                        },
                        Object {
                          "range": Object {
                            "birthDate.end": Object {
                              "lt": 1999-09-09T00:00:00.000Z,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            }
        `);
  });
});
