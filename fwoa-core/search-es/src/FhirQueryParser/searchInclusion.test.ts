import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import each from 'jest-each';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { InclusionSearchParameter, WildcardInclusionSearchParameter } from '../searchInclusions';
import { inclusionParameterFromString, parseInclusionParams } from './searchInclusion';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');

describe('inclusionParameterFromString', () => {
  describe('invalid inclusion parameters', () => {
    each([
      ['some-invalid-param'],
      ['Patient'],
      ['Patient:'],
      ['Patient:bad-field,,$'],
      ['Patient:field:'],
      ['Patient:field:bad#']
    ]).test('%s', (s: string) => {
      expect(() => inclusionParameterFromString(s)).toThrow(
        new InvalidSearchParameterError(`Invalid include/revinclude search parameter: ${s}`)
      );
    });
  });
  describe('valid inclusion parameters', () => {
    test('optional target resource type missing', () => {
      const input = 'Patient:field';
      const expected = {
        isWildcard: false,
        sourceResource: 'Patient',
        searchParameter: 'field'
      };
      expect(inclusionParameterFromString(input)).toEqual(expected);
    });

    test('optional target resource type present', () => {
      const input = 'Patient:field:OtherResource';
      const expected = {
        isWildcard: false,
        sourceResource: 'Patient',
        searchParameter: 'field',
        targetResourceType: 'OtherResource'
      };
      expect(inclusionParameterFromString(input)).toEqual(expected);
    });

    test('wildcard', () => {
      const input = '*';
      const expected = {
        isWildcard: true
      };
      expect(inclusionParameterFromString(input)).toEqual(expected);
    });
  });
});

describe('parseInclusionParams', () => {
  test('No inclusion Params', () => {
    const expected: any[] = [];
    expect(parseInclusionParams(fhirSearchParametersRegistry, '_include', [])).toEqual(expected);
  });
  test('string param', () => {
    const expected: (InclusionSearchParameter | WildcardInclusionSearchParameter)[] = [
      {
        isWildcard: false,
        type: '_include',
        sourceResource: 'Patient',
        searchParameter: 'organization',
        path: 'managingOrganization',
        targetResourceType: undefined
      }
    ];
    expect(parseInclusionParams(fhirSearchParametersRegistry, '_include', ['Patient:organization'])).toEqual(
      expected
    );
  });
  test('array param', () => {
    const expected: InclusionSearchParameter[] = [
      {
        isWildcard: false,
        isIterate: true,
        type: '_revinclude',
        sourceResource: 'Patient',
        searchParameter: 'organization',
        targetResourceType: undefined,
        path: 'managingOrganization'
      },
      {
        isWildcard: false,
        isIterate: true,
        type: '_revinclude',
        searchParameter: 'general-practitioner',
        targetResourceType: undefined,
        path: 'generalPractitioner',
        sourceResource: 'Patient'
      }
    ];
    expect(
      parseInclusionParams(fhirSearchParametersRegistry, '_revinclude:iterate', [
        'Patient:organization',
        'Patient:organization',
        'Patient:general-practitioner'
      ])
    ).toEqual(expected);
  });
  test('Invalid search param', () => {
    expect(() =>
      parseInclusionParams(fhirSearchParametersRegistry, '_include', ['Patient:invalid-search-param'])
    ).toThrow(
      new InvalidSearchParameterError(
        'Invalid include/revinclude search parameter: Search parameter invalid-search-param does not exist in resource Patient'
      )
    );
  });
  test('Search param is not of type reference', () => {
    expect(() => parseInclusionParams(fhirSearchParametersRegistry, '_include', ['Patient:name'])).toThrow(
      new InvalidSearchParameterError(
        'Invalid include/revinclude search parameter: Search parameter name is not of type reference in resource Patient'
      )
    );
  });
  test('Search param target resource type do not match', () => {
    expect(() =>
      parseInclusionParams(fhirSearchParametersRegistry, '_include', ['Patient:organization:Location'])
    ).toThrow(
      new InvalidSearchParameterError(
        'Invalid include/revinclude search parameter: Search parameter organization in resource Patient does not point to target resource type Location'
      )
    );
  });
});
