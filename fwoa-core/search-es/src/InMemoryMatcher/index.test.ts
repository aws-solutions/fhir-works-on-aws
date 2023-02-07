/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { ParsedFhirQueryParams } from '../FhirQueryParser';
import { FHIRSearchParametersRegistry, SearchParam } from '../FHIRSearchParametersRegistry';
import { matchParsedFhirQueryParams } from './index';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const givenParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'given')!;
const familyParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'family')!;

describe('evaluateParsedFhirQueryParams', () => {
  test('resourceType mismatch', () => {
    const resource = {
      resourceType: 'Patient'
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Practitioner',
      searchParams: []
    };

    expect(matchParsedFhirQueryParams(parsedFhirQueryParams, resource)).toBe(false);
  });

  test('simple case', () => {
    const resource = {
      resourceType: 'Patient',
      name: {
        given: 'Sherlock',
        family: 'Holmes'
      }
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: givenParam,
          name: 'given',
          parsedSearchValues: ['Sherlock'],
          type: 'string'
        }
      ]
    };

    expect(matchParsedFhirQueryParams(parsedFhirQueryParams, resource)).toBe(true);
  });

  test('simple case', () => {
    const resource = {
      resourceType: 'Patient',
      name: [
        {
          given: 'Sherlock',
          family: 'Holmes'
        }
      ]
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: givenParam,
          name: 'given',
          parsedSearchValues: ['Sherlock'],
          type: 'string'
        }
      ]
    };

    expect(matchParsedFhirQueryParams(parsedFhirQueryParams, resource)).toBe(true);
  });

  test('one of many fields match', () => {
    const resource = {
      resourceType: 'Patient',
      name: [
        {
          given: 'xxxx',
          family: 'xxxx'
        },
        {
          given: 'yyyy',
          family: 'yyyy'
        },
        {
          given: 'Sherlock',
          family: 'Holmes'
        }
      ]
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: givenParam,
          name: 'given',
          parsedSearchValues: ['Sherlock'],
          type: 'string'
        }
      ]
    };

    expect(matchParsedFhirQueryParams(parsedFhirQueryParams, resource)).toBe(true);
  });

  test('one of many search values match', () => {
    const resource = {
      resourceType: 'Patient',
      name: [
        {
          given: 'Sherlock',
          family: 'Holmes'
        }
      ]
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: givenParam,
          name: 'given',
          parsedSearchValues: ['xxxx', 'yyyy', 'Sherlock'],
          type: 'string'
        }
      ]
    };

    expect(matchParsedFhirQueryParams(parsedFhirQueryParams, resource)).toBe(true);
  });

  test('one of many compiled search params matches', () => {
    const resource = {
      resourceType: 'Patient',
      name: [
        {
          given: 'Sherlock',
          family: 'Holmes'
        }
      ]
    };

    const modifiedGivenParam: SearchParam = {
      ...givenParam,
      compiled: [
        { resourceType: 'Patient', path: 'some.path' },
        { resourceType: 'Patient', path: 'resourceType' },
        { resourceType: 'Patient', path: 'name.given' }
      ]
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: modifiedGivenParam,
          name: 'given',
          parsedSearchValues: ['Sherlock'],
          type: 'string'
        }
      ]
    };

    expect(matchParsedFhirQueryParams(parsedFhirQueryParams, resource)).toBe(true);
  });

  test('compiled conditions must pass', () => {
    const modifiedGivenParam: SearchParam = {
      ...givenParam,
      compiled: [
        {
          resourceType: 'Patient',
          path: 'name.given',
          condition: ['name.use', '=', 'official']
        }
      ]
    };

    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: modifiedGivenParam,
          name: 'given',
          parsedSearchValues: ['Sherlock'],
          type: 'string'
        }
      ]
    };

    expect(
      matchParsedFhirQueryParams(parsedFhirQueryParams, {
        resourceType: 'Patient',
        name: [
          {
            given: 'Sherlock',
            family: 'Holmes'
          }
        ]
      })
    ).toBe(false);

    expect(
      matchParsedFhirQueryParams(parsedFhirQueryParams, {
        resourceType: 'Patient',
        name: [
          {
            given: 'Sherlock',
            family: 'Holmes',
            use: 'official'
          }
        ]
      })
    ).toBe(true);
  });

  test('all searchParams must match', () => {
    const parsedFhirQueryParams: ParsedFhirQueryParams = {
      resourceType: 'Patient',
      searchParams: [
        {
          searchParam: givenParam,
          name: 'given',
          parsedSearchValues: ['Sherlock'],
          type: 'string'
        },
        {
          searchParam: familyParam,
          name: 'family',
          parsedSearchValues: ['Holmes'],
          type: 'string'
        }
      ]
    };

    expect(
      matchParsedFhirQueryParams(parsedFhirQueryParams, {
        resourceType: 'Patient',
        name: [
          {
            given: 'Sherlock',
            family: 'Holmes'
          }
        ]
      })
    ).toBe(true);

    expect(
      matchParsedFhirQueryParams(parsedFhirQueryParams, {
        resourceType: 'Patient',
        name: [
          {
            given: 'Sherlock',
            family: 'H'
          }
        ]
      })
    ).toBe(false);
  });
});
