/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

jest.mock('./elasticSearch');
import { InvalidSearchParameterError, SearchFilter } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { ElasticSearch } from './elasticSearch';
import { ElasticSearchService } from './elasticSearchService';

const FILTER_RULES_FOR_ACTIVE_RESOURCES = [
  {
    key: 'someFieldThatTellsIfTheResourceIsActive',
    value: ['AVAILABLE'],
    comparisonOperator: '==' as const,
    logicalOperator: 'AND' as const
  }
];

const ALLOWED_RESOURCE_TYPES = [
  'Claim',
  'Communication',
  'ImmunizationRecommendation',
  'MedicationAdministration',
  'MedicationRequest',
  'MedicationStatement',
  'Organization',
  'Patient',
  'Practitioner',
  'PractitionerRole',
  'Provenance'
];

describe('typeSearch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  describe('query snapshots for simple queryParams; with ACTIVE filter', () => {
    each([
      [{}],
      [{ _count: '10', _getpagesoffset: '2', _sort: '_lastUpdated' }],
      [{ gender: 'female', name: 'Emily' }],
      [{ gender: 'female,male', name: 'Emily' }],
      [{ gender: 'female', name: 'Emily,Smith' }],
      [{ gender: 'female', name: 'Emily\\,Smith' }],
      [{ gender: 'female', name: ['Emily', 'Smith'] }],
      [{ gender: 'female', birthdate: 'gt1990' }],
      [{ gender: 'female', identifier: 'http://acme.org/patient|2345' }],
      [{ _id: '11111111-1111-1111-1111-111111111111' }],
      [{ _format: 'json' }],
      [
        {
          _profile: 'http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-ExplanationOfBenefit-Pharmacy'
        }
      ],
      [{ 'general-practitioner': 'Practitioner/1234' }],
      [{ 'general-practitioner': '1234' }],
      [{ organization: '1234' }],
      [
        {
          _count: '10',
          _getpagesoffset: '2',
          _id: '11111111-1111-1111-1111-111111111111',
          gender: 'female',
          name: 'Emily',
          _format: 'json'
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams,
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
        sessionId: 'CUSTOMER_SESSION_ID'
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });
  describe('query snapshots for simple queryParams; without ACTIVE filter', () => {
    each([
      [{}],
      [
        {
          _count: '10',
          _getpagesoffset: '2',
          _id: '11111111-1111-1111-1111-111111111111',
          gender: 'female',
          name: 'Emily',
          _format: 'json'
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService();
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams,
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });
  describe('query snapshots for no queryParams, ACTIVE filter & changing filters', () => {
    const id = '3bdd8948-5e3b-4411-8f3f-d352a82bb07d';
    const patientId = `Patient/${id}`;
    const patientIdentity = `https://gdieqbxycl.execute-api.us-west-2.amazonaws.com/dev/${patientId}`;
    each([
      [
        [
          {
            key: '_reference',
            logicalOperator: 'OR',
            comparisonOperator: '==',
            value: [patientIdentity, patientId]
          }
        ]
      ],
      [
        [
          {
            key: '_reference',
            logicalOperator: 'OR',
            comparisonOperator: '==',
            value: [patientIdentity]
          },
          {
            key: 'id',
            logicalOperator: 'OR',
            comparisonOperator: '==',
            value: [id]
          },
          {
            key: 'gender',
            logicalOperator: 'AND',
            comparisonOperator: '==',
            value: ['male', 'female']
          }
        ]
      ],
      [[]]
    ]).test('filterParams=%j', async (searchFilters: SearchFilter[]) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams: {},
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
        searchFilters
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });

  describe('search parameters with complex expressions', () => {
    each([
      [{ phone: '1234567' }, 'Patient'],
      [{ 'value-string': 'some value' }, 'Observation'],
      [{ 'depends-on': 'Patient/something' }, 'Library'],
      [{ relatedperson: 'RelatedPerson/111' }, 'Person']
    ]).test('queryParams=%j', async (queryParams: any, resourceType: string) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: `${resourceType.toLowerCase()}-alias`,
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType,
        baseUrl: 'https://base-url.com',
        queryParams,
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });

  test('Invalid Parameter', async () => {
    const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
    await expect(
      es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams: { someFieldThatDoesNotExist: 'someValue' },
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      })
    ).rejects.toThrowError(InvalidSearchParameterError);
  });

  test('Invalid search range (> 10k)', async () => {
    const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
    await expect(
      es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams: { _count: '20', _getpagesoffset: '10000' },
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      })
    ).rejects.toThrowError(InvalidSearchParameterError);
  });

  test('Response format', async () => {
    const patientSearchResult = {
      body: {
        hits: {
          total: {
            value: 1,
            relation: 'eq'
          },
          max_score: 1,
          hits: [
            {
              _index: 'patient',
              _type: '_doc',
              _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
              _score: 1,
              _source: {
                vid: '1',
                gender: 'female',
                id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                birthDate: '1995-09-24',
                resourceType: 'Patient'
              }
            }
          ]
        }
      }
    };

    (ElasticSearch.search as jest.Mock).mockResolvedValue(patientSearchResult);

    const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
    const result = await es.typeSearch({
      resourceType: 'Patient',
      baseUrl: 'https://base-url.com',
      queryParams: {},
      allowedResourceTypes: ALLOWED_RESOURCE_TYPES
    });
    expect(result).toMatchSnapshot();
  });

  const fakeMedicationRequestSearchResult = {
    body: {
      took: 5,
      timed_out: false,
      _shards: {
        total: 5,
        successful: 5,
        skipped: 0,
        failed: 0
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq'
        },
        max_score: 1.0,
        hits: [
          {
            _index: 'medicationrequest',
            _type: '_doc',
            _id: 'medicationrequest-id-111_1',
            _score: 1.0,
            _source: {
              vid: '1',
              performer: {
                reference: 'Practitioner/practitioner-id-222'
              },
              requester: {
                reference: 'PractitionerRole/practitionerRole-id-555'
              },
              recorder: {
                reference: 'PractitionerRole/practitionerRole-id-555'
              },
              meta: {
                lastUpdated: '2020-09-10T06:34:46.680Z',
                versionId: '1'
              },
              subject: {
                reference: 'Patient/patient-id-333'
              },
              basedOn: [
                {
                  reference: 'ImmunizationRecommendation/immunizationRec-id-444'
                }
              ],
              documentStatus: 'AVAILABLE',
              id: 'medicationrequest-id-111',
              lockEndTs: 1599719686680,
              resourceType: 'MedicationRequest'
            }
          }
        ]
      }
    }
  };

  const fakeEncounterSearchResult = {
    body: {
      took: 5,
      timed_out: false,
      _shards: {
        total: 5,
        successful: 5,
        skipped: 0,
        failed: 0
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq'
        },
        max_score: 1.0,
        hits: [
          {
            _index: 'encounter',
            _type: '_doc',
            _id: 'encounter-id-111_1',
            _score: 1.0,
            _source: {
              vid: '1',
              location: [
                {
                  location: {
                    reference: 'Location/location-id-111'
                  }
                },
                {
                  location: {
                    reference: 'Location/location-id-222'
                  }
                }
              ],
              documentStatus: 'AVAILABLE',
              id: 'encounter-id-111',
              resourceType: 'Encounter'
            }
          }
        ]
      }
    }
  };

  const emptyMsearchResult = {
    body: {
      responses: []
    }
  };

  describe('_include', () => {
    each([
      [{ _include: '*' }],
      [{ _include: 'MedicationRequest:subject' }],
      [{ _include: 'MedicationRequest:subject:Group' }],
      [
        {
          _include: ['MedicationRequest:subject', 'MedicationRequest:intended-performer']
        }
      ],
      [
        {
          _include: ['MedicationRequest:subject', 'MedicationRequest:subject']
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
      (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'MedicationRequest',
        baseUrl: 'https://base-url.com',
        queryParams: { ...queryParams },
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
      expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
    });

    test('wildcard include with restrictive allowed resource types', async () => {
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
      (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'MedicationRequest',
        baseUrl: 'https://base-url.com',
        queryParams: { _include: '*' },
        allowedResourceTypes: ['MedicationRequest']
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
      expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
    });

    test('search param with array fields', async () => {
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeEncounterSearchResult);
      (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'Encounter',
        baseUrl: 'https://base-url.com',
        queryParams: { _include: 'Encounter:location' },
        allowedResourceTypes: ['Encounter', 'Location']
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
      expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
    });
  });

  describe('_revinclude', () => {
    each([
      [{ _revinclude: '*' }],
      [{ _revinclude: 'MedicationAdministration:request' }],
      [{ _revinclude: 'MedicationAdministration:request:MedicationRequest' }],
      [
        {
          _revinclude: ['MedicationAdministration:request', 'Provenance:target']
        }
      ],
      [
        {
          _revinclude: ['MedicationAdministration:request', 'MedicationAdministration:request']
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
      (ElasticSearch.msearch as jest.Mock).mockResolvedValue(emptyMsearchResult);

      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'MedicationRequest',
        baseUrl: 'https://base-url.com',
        queryParams: { ...queryParams },
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
      expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
    });
  });

  test('_include:iterate', async () => {
    (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: [
                {
                  _source: {
                    id: 'patient-id-333',
                    resourceType: 'Patient',
                    managingOrganization: {
                      reference: 'Organization/org-id-111'
                    }
                  }
                }
              ]
            },
            status: 200
          }
        ]
      }
    });
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: [
                {
                  _source: {
                    id: 'org-id-111',
                    resourceType: 'Organization'
                  }
                }
              ]
            },
            status: 200
          }
        ]
      }
    });
    const queryParams = {
      '_include:iterate': ['MedicationRequest:subject', 'Patient:organization']
    };
    const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
    await es.typeSearch({
      resourceType: 'MedicationRequest',
      baseUrl: 'https://base-url.com',
      queryParams: { ...queryParams },
      allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
      sessionId: 'CUSTOMER_SESSION_ID'
    });

    expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
    expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
  });

  test('multi-tenancy enabled: _include:iterate', async () => {
    (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: [
                {
                  _source: {
                    id: 'patient-id-333',
                    resourceType: 'Patient',
                    managingOrganization: {
                      reference: 'Organization/org-id-111'
                    }
                  }
                }
              ]
            },
            status: 200
          }
        ]
      }
    });
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: [
                {
                  _source: {
                    id: 'org-id-111',
                    resourceType: 'Organization'
                  }
                }
              ]
            },
            status: 200
          }
        ]
      }
    });
    const queryParams = {
      '_include:iterate': ['MedicationRequest:subject', 'Patient:organization']
    };
    const es = new ElasticSearchService(
      FILTER_RULES_FOR_ACTIVE_RESOURCES,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        enableMultiTenancy: true
      }
    );
    await es.typeSearch({
      resourceType: 'MedicationRequest',
      baseUrl: 'https://base-url.com',
      queryParams: { ...queryParams },
      allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
      tenantId: 'tenant1'
    });

    expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
    expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
  });

  test('_revinclude:iterate', async () => {
    (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: [
                {
                  _source: {
                    id: 'medication-administration-111',
                    resourceType: 'MedicationAdministration'
                  }
                }
              ]
            },
            status: 200
          }
        ]
      }
    });
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: []
            },
            status: 200
          }
        ]
      }
    });
    const queryParams = {
      '_revinclude:iterate': [
        'MedicationAdministration:request:MedicationRequest',
        'MedicationStatement:part-of:MedicationAdministration'
      ]
    };
    const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
    await es.typeSearch({
      resourceType: 'MedicationRequest',
      baseUrl: 'https://base-url.com',
      queryParams: { ...queryParams },
      allowedResourceTypes: ALLOWED_RESOURCE_TYPES
    });

    expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
    expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
  });

  test('multi-tenancy enabled: _revinclude:iterate', async () => {
    (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeMedicationRequestSearchResult);
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: [
                {
                  _source: {
                    id: 'medication-administration-111',
                    resourceType: 'MedicationAdministration'
                  }
                }
              ]
            },
            status: 200
          }
        ]
      }
    });
    (ElasticSearch.msearch as jest.Mock).mockResolvedValueOnce({
      body: {
        took: 0,
        responses: [
          {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 0,
              hits: []
            },
            status: 200
          }
        ]
      }
    });
    const queryParams = {
      '_revinclude:iterate': [
        'MedicationAdministration:request:MedicationRequest',
        'MedicationStatement:part-of:MedicationAdministration'
      ]
    };
    const es = new ElasticSearchService(
      FILTER_RULES_FOR_ACTIVE_RESOURCES,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        enableMultiTenancy: true
      }
    );
    await es.typeSearch({
      resourceType: 'MedicationRequest',
      baseUrl: 'https://base-url.com',
      queryParams: { ...queryParams },
      allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
      tenantId: 'tenant1'
    });

    expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot('search queries');
    expect((ElasticSearch.msearch as jest.Mock).mock.calls).toMatchSnapshot('msearch queries');
  });

  describe('filter snapshots for simple filters', () => {
    each([
      [
        'equal',
        [
          {
            key: 'someFieldThatTellsIfTheResourceIsActive',
            value: ['AVAILABLE'],
            comparisonOperator: '==' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'not equal',
        [
          {
            key: 'someFieldThatTellsIfTheResourceIsActive',
            value: ['AVAILABLE'],
            comparisonOperator: '!=' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'greater than',
        [
          {
            key: 'age',
            value: ['21'],
            comparisonOperator: '>' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'less than',
        [
          {
            key: 'age',
            value: ['21'],
            comparisonOperator: '<' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'greater than or equal',
        [
          {
            key: 'age',
            value: ['21'],
            comparisonOperator: '>=' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'less than or equal',
        [
          {
            key: 'age',
            value: ['21'],
            comparisonOperator: '<=' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'AND combination',
        [
          {
            key: 'someFieldThatTellsIfTheResourceIsActive',
            value: ['AVAILABLE', 'PENDING'],
            comparisonOperator: '==' as const,
            logicalOperator: 'AND' as const
          }
        ]
      ],
      [
        'OR combination',
        [
          {
            key: 'someFieldThatTellsIfTheResourceIsActive',
            value: ['AVAILABLE', 'PENDING'],
            comparisonOperator: '==' as const,
            logicalOperator: 'OR' as const
          }
        ]
      ]
    ]).test('- %s', async (scenario: string, searchFilters: SearchFilter[]) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(searchFilters);
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams: {},
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });

  describe('multi-tenancy enabled: simple queries', () => {
    each([[{ gender: 'female', name: 'Emily' }], [{ _id: '11111111-1111-1111-1111-111111111111' }]]).test(
      'queryParams=%j',
      async (queryParams: any) => {
        const fakeSearchResult = {
          body: {
            hits: {
              total: {
                value: 1,
                relation: 'eq'
              },
              max_score: 1,
              hits: [
                {
                  _index: 'patient',
                  _type: '_doc',
                  _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                  _score: 1,
                  _source: {
                    vid: '1',
                    id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                    resourceType: 'Patient'
                  }
                }
              ]
            }
          }
        };
        (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
        const es = new ElasticSearchService(
          FILTER_RULES_FOR_ACTIVE_RESOURCES,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            enableMultiTenancy: true
          }
        );
        await es.typeSearch({
          resourceType: 'Patient',
          baseUrl: 'https://base-url.com',
          queryParams,
          allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
          tenantId: 'tenant1'
        });

        expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
      }
    );
  });

  describe('query snapshots for chained queryParams', () => {
    each([
      [
        {
          'general-practitioner:PractitionerRole.location:Location.address-city': 'Washington'
        }
      ],
      [
        {
          'general-practitioner:PractitionerRole.location:Location.address-city': 'Washington',
          'organization.name': 'HL7'
        }
      ],
      [
        {
          'link:Patient.birthdate': 'ge2020-01-01',
          'link:Patient.organization.name': 'HL7'
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                fields: { id: ['ab69afd3-39ed-42c3-9f77-8a718a247742'] },
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams,
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });

  describe('query snapshots for chained queryParams, multi-tenancy enabled', () => {
    each([
      [
        {
          'general-practitioner:PractitionerRole.location:Location.address-city': 'Washington'
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                fields: { id: ['ab69afd3-39ed-42c3-9f77-8a718a247742'] },
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(
        FILTER_RULES_FOR_ACTIVE_RESOURCES,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          enableMultiTenancy: true
        }
      );
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams,
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES,
        tenantId: 'tenant1'
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });

  describe('Invalid chained queryParams', () => {
    each([
      // Missing resource type for general-practitioner
      [{ 'general-practitioner.location:Location.address-city': 'Washington' }],
      // Wrong resource type for general-practitioner
      [
        {
          'general-practitioner:RelatedPerson.location:Location.address-city': 'Washington'
        }
      ],
      // Search parameter phone is not reference type
      [{ 'phone.provider': 'AT&T' }]
    ]).test('queryParams=%j', async (queryParams: any) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 1,
              relation: 'eq'
            },
            max_score: 1,
            hits: [
              {
                _index: 'patient',
                _type: '_doc',
                _id: 'ab69afd3-39ed-42c3-9f77-8a718a247742_1',
                _score: 1,
                _source: {
                  vid: '1',
                  id: 'ab69afd3-39ed-42c3-9f77-8a718a247742',
                  resourceType: 'Patient'
                }
              }
            ]
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);

      await expect(
        es.typeSearch({
          resourceType: 'Patient',
          baseUrl: 'https://base-url.com',
          queryParams,
          allowedResourceTypes: ALLOWED_RESOURCE_TYPES
        })
      ).rejects.toThrowError(InvalidSearchParameterError);
    });
  });

  describe('query snapshots for chained queryParams with no matches', () => {
    each([
      [
        {
          'general-practitioner:PractitionerRole.location:Location.address-city': 'wefw'
        }
      ],
      [
        {
          'general-practitioner:PractitionerRole.location:Location.address-city': 'pwoiejfpow',
          'organization.name': 'wefgw'
        }
      ],
      [
        {
          'link:Patient.birthdate': 'ge2020-01-01',
          'link:Patient.organization.name': 'opwijeow'
        }
      ]
    ]).test('queryParams=%j', async (queryParams: any) => {
      const fakeSearchResult = {
        body: {
          hits: {
            total: {
              value: 0,
              relation: 'eq'
            },
            max_score: 0,
            hits: []
          }
        }
      };
      (ElasticSearch.search as jest.Mock).mockResolvedValue(fakeSearchResult);
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);
      await es.typeSearch({
        resourceType: 'Patient',
        baseUrl: 'https://base-url.com',
        queryParams,
        allowedResourceTypes: ALLOWED_RESOURCE_TYPES
      });

      expect((ElasticSearch.search as jest.Mock).mock.calls).toMatchSnapshot();
    });
  });
});

describe('validateSubscriptionSearchCriteria', () => {
  describe('Invalid search string', () => {
    const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);

    expect(() => {
      es.validateSubscriptionSearchCriteria(
        'Patient?general-practitioner:PractitionerRole.location:Location.address-city'
      );
    }).toThrowError(
      new InvalidSearchParameterError(
        'Search string used for field criteria contains unsupported parameter, please remove: _revinclude, _include, _sort, _count and chained parameters'
      )
    );

    expect(() => {
      es.validateSubscriptionSearchCriteria('Patient?name=Harry&_count=10');
    }).toThrowError(
      new InvalidSearchParameterError(
        'Search string used for field criteria contains unsupported parameter, please remove: _revinclude, _include, _sort, _count and chained parameters'
      )
    );

    expect(() => {
      es.validateSubscriptionSearchCriteria('Patient?random-filed=random-value');
    }).toThrowError(
      new InvalidSearchParameterError("Invalid search parameter 'random-filed' for resource type Patient")
    );
  });

  describe('Valid search string', () => {
    each([
      'Patient?name=Harry',
      'Patient?name=Harry&family=Potter',
      'Patient?name=Ha?rry&family=Pott?er',
      'Patient',
      'Patient?'
    ]).test('queryString=%j', (queryString: any) => {
      const es = new ElasticSearchService(FILTER_RULES_FOR_ACTIVE_RESOURCES);

      expect(() => {
        es.validateSubscriptionSearchCriteria(queryString);
      }).not.toThrow();
    });
  });
});
