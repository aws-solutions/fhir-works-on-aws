/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { parseReferenceSearchValue } from '../../FhirQueryParser/typeParsers/referenceParser';
import { FHIRSearchParametersRegistry } from '../../FHIRSearchParametersRegistry';
import { referenceQuery } from './referenceQuery';

const fhirSearchParametersRegistry = new FHIRSearchParametersRegistry('4.0.1');
const organizationParam = fhirSearchParametersRegistry.getSearchParameter('Patient', 'organization')!
  .compiled[0];

describe('referenceQuery', () => {
  describe('searching with {type}/{id}', () => {
    test('keyword included', () => {
      expect(
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue({ name: 'organization', target: [] }, 'Organization/111'),
          true,
          'https://base-url.com',
          'organization',
          []
        )
      ).toMatchInlineSnapshot(`
                              Object {
                                "terms": Object {
                                  "managingOrganization.reference.keyword": Array [
                                    "Organization/111",
                                    "https://base-url.com/Organization/111",
                                  ],
                                },
                              }
                        `);
    });
    test('keyword not included', () => {
      expect(
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue({ name: 'organization', target: [] }, 'Organization/111'),
          false,
          'https://base-url.com',
          'organization'
        )
      ).toMatchInlineSnapshot(`
                              Object {
                                "terms": Object {
                                  "managingOrganization.reference": Array [
                                    "Organization/111",
                                    "https://base-url.com/Organization/111",
                                  ],
                                },
                              }
                        `);
    });
  });
  describe('searching with {fhirServiceBaseUrl}/{type}/{id}', () => {
    test('fhirServiceBaseUrl matches baseUrl', () => {
      expect(
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue(
            { name: 'organization', target: [] },
            'https://base-url.com/Organization/111'
          ),
          true,
          'https://base-url.com',
          'organization'
        )
      ).toMatchInlineSnapshot(`
                Object {
                  "terms": Object {
                    "managingOrganization.reference.keyword": Array [
                      "Organization/111",
                      "https://base-url.com/Organization/111",
                    ],
                  },
                }
            `);
    });
    test('fhirServiceBaseUrl does not match baseUrl', () => {
      expect(
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue(
            { name: 'organization', target: [] },
            'http://notMatching.com/baseR4/Organization/111'
          ),
          true,
          'https://base-url.com',
          'organization'
        )
      ).toMatchInlineSnapshot(`
                              Object {
                                "terms": Object {
                                  "managingOrganization.reference.keyword": Array [
                                    "http://notMatching.com/baseR4/Organization/111",
                                  ],
                                },
                              }
                        `);
    });
  });
  describe('searching with just {id}', () => {
    test('one target type found', () => {
      expect(
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue({ name: 'organization', target: ['Organization'] }, 'organizationId'),
          true,
          'https://base-url.com',
          'organization',
          ['Organization']
        )
      ).toMatchInlineSnapshot(`
                              Object {
                                "terms": Object {
                                  "managingOrganization.reference.keyword": Array [
                                    "https://base-url.com/Organization/organizationId",
                                    "Organization/organizationId",
                                  ],
                                },
                              }
                        `);
    });
    test('many target types found', () => {
      expect(
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue(
            { name: 'organization', target: ['Organization', 'Group'] },
            'organizationId'
          ),
          true,
          'https://base-url.com',
          'organization',
          ['Organization', 'Group']
        )
      ).toMatchInlineSnapshot(`
                              Object {
                                "terms": Object {
                                  "managingOrganization.reference.keyword": Array [
                                    "https://base-url.com/Organization/organizationId",
                                    "Organization/organizationId",
                                    "https://base-url.com/Group/organizationId",
                                    "Group/organizationId",
                                  ],
                                },
                              }
                        `);
    });
    test('no target types found', () => {
      expect(() =>
        referenceQuery(
          organizationParam,
          parseReferenceSearchValue({ name: 'organization', target: [] }, 'organizationId'),
          false,
          'https://base-url.com',
          'organization'
        )
      ).toThrow(InvalidSearchParameterError);
    });
  });
  test('invalid modifier', () => {
    expect(() =>
      referenceQuery(
        organizationParam,
        parseReferenceSearchValue({ name: 'organization', target: ['Organization'] }, 'organizationId'),
        false,
        'https://base-url.com',
        'organization',
        ['Organization'],
        'exact'
      )
    ).toThrow(InvalidSearchParameterError);
  });

  test('search value is not an URL nor has the format <resourceType>/<id>', () => {
    expect(
      referenceQuery(
        organizationParam,
        parseReferenceSearchValue({ name: 'organization', target: [] }, 'this:does# not match'),
        true,
        'https://base-url.com',
        'organization',
        ['Organization', 'Group']
      )
    ).toMatchInlineSnapshot(`
          Object {
            "terms": Object {
              "managingOrganization.reference.keyword": Array [
                "this:does# not match",
              ],
            },
          }
        `);
  });
});
