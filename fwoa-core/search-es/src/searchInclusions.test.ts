// import each from 'jest-each';
import {
  getIncludeReferencesFromResources,
  getRevincludeReferencesFromResources,
  InclusionSearchParameter
} from './searchInclusions';

describe('getIncludeReferencesFromResources', () => {
  test('Happy case', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        path: 'someField',
        sourceResource: 'Patient',
        targetResourceType: ''
      },
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'anotherField',
        path: 'anotherField',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          reference: 'Practitioner/111'
        },
        anotherField: {
          reference: 'Organization/222'
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

    const expected = [
      { resourceType: 'Practitioner', id: '111' },
      { resourceType: 'Organization', id: '222' }
    ];
    expect(refs).toEqual(expected);
  });

  test('Mixed resource types', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        path: 'someField',
        sourceResource: 'Patient',
        targetResourceType: ''
      },
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'anotherField',
        path: 'anotherField',
        sourceResource: 'Patient',
        targetResourceType: ''
      },
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'orgField',
        path: 'orgField',
        sourceResource: 'Organization',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          reference: 'Practitioner/111'
        },
        anotherField: {
          reference: 'Organization/222'
        }
      },
      {
        resourceType: 'Organization',
        orgField: {
          reference: 'Device/333'
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

    const expected = [
      { resourceType: 'Practitioner', id: '111' },
      { resourceType: 'Organization', id: '222' },
      { resourceType: 'Device', id: '333' }
    ];
    expect(refs).toEqual(expected);
  });

  test('dedupes references', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        path: 'someField',
        sourceResource: 'Patient',
        targetResourceType: ''
      },
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'anotherField',
        path: 'anotherField',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          reference: 'Practitioner/111'
        },
        anotherField: {
          reference: 'Practitioner/111'
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

    const expected = [{ resourceType: 'Practitioner', id: '111' }];
    expect(refs).toEqual(expected);
  });

  test('array of references', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        path: 'someField',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: [
          {
            reference: 'Practitioner/111'
          },
          {
            reference: 'Organization/222'
          }
        ]
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

    const expected = [
      { resourceType: 'Practitioner', id: '111' },
      { resourceType: 'Organization', id: '222' }
    ];
    expect(refs).toEqual(expected);
  });

  test('path with intermediate arrays', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        path: 'someField.multiple.single',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          multiple: [
            {
              single: {
                reference: 'Practitioner/111'
              }
            },
            {
              single: {
                reference: 'Organization/222'
              }
            }
          ]
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

    const expected = [
      { resourceType: 'Practitioner', id: '111' },
      { resourceType: 'Organization', id: '222' }
    ];
    expect(refs).toEqual(expected);
  });

  test('searchParameter with dot', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField-nested',
        path: 'someField.nestedField',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          nestedField: {
            reference: 'Practitioner/111'
          }
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);

    const expected = [{ resourceType: 'Practitioner', id: '111' }];
    expect(refs).toEqual(expected);
  });

  test('non-relative urls', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        path: 'someField',
        sourceResource: 'Patient',
        targetResourceType: ''
      },
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'anotherField',
        path: 'anotherField',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          reference: 'https://some-fhir-server/Practitioner/111'
        },
        anotherField: {
          reference: 'this-is-not-a-relative-url'
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);
    expect(refs).toEqual([]);
  });

  test('sourceResource not matching request resourceType', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someField',
        sourceResource: 'Device',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          reference: 'Practitioner/111'
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);
    expect(refs).toEqual([]);
  });

  test('searchParameter path undefined in resource', () => {
    const includeSearchParams: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        type: '_include',
        searchParameter: 'someFieldThatIsUndefined',
        sourceResource: 'Patient',
        targetResourceType: ''
      }
    ];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        someField: {
          reference: 'Practitioner/111'
        }
      }
    ];

    const refs = getIncludeReferencesFromResources(includeSearchParams, resources);
    expect(refs).toEqual([]);
  });
});

describe('getRevincludeReferencesFromResources', () => {
  test('happy case', () => {
    const revinclude: InclusionSearchParameter = {
      isWildcard: false,
      type: '_revinclude',
      searchParameter: 'someField',
      sourceResource: 'Device',
      targetResourceType: 'Patient'
    };
    const includeSearchParams: InclusionSearchParameter[] = [revinclude];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        id: 'patient-id-111'
      },
      {
        resourceType: 'Organization',
        id: 'org-id-111'
      }
    ];

    const refs = getRevincludeReferencesFromResources(includeSearchParams, resources);

    expect(refs).toEqual([
      {
        references: ['Patient/patient-id-111'],
        revinclude
      }
    ]);
  });

  test('undefined targetResourceType', () => {
    const revinclude: InclusionSearchParameter = {
      isWildcard: false,
      type: '_revinclude',
      searchParameter: 'someField',
      sourceResource: 'Device'
    };
    const includeSearchParams: InclusionSearchParameter[] = [revinclude];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        id: 'patient-id-111'
      },
      {
        resourceType: 'Organization',
        id: 'org-id-111'
      }
    ];

    const refs = getRevincludeReferencesFromResources(includeSearchParams, resources);

    expect(refs).toEqual([
      {
        references: ['Patient/patient-id-111', 'Organization/org-id-111'],
        revinclude
      }
    ]);
  });

  test('targetResourceType not matching any resource', () => {
    const revinclude: InclusionSearchParameter = {
      isWildcard: false,
      type: '_revinclude',
      searchParameter: 'someField',
      sourceResource: 'Device',
      targetResourceType: 'SomeResourceType'
    };
    const includeSearchParams: InclusionSearchParameter[] = [revinclude];

    const resources: any[] = [
      {
        resourceType: 'Patient',
        id: 'patient-id-111'
      },
      {
        resourceType: 'Organization',
        id: 'org-id-111'
      }
    ];

    const refs = getRevincludeReferencesFromResources(includeSearchParams, resources);

    expect(refs).toEqual([]);
  });
});
