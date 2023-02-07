/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidSearchParameterError } from '@aws/fhir-works-on-aws-interface';
import { parseReferenceSearchValue } from './referenceParser';

const referenceParam = {
  name: 'ref',
  base: 'Patient',
  target: ['Organization']
};

describe('parseReferenceSearchValue', () => {
  describe('searching with {type}/{id}', () => {
    test('valid param', () => {
      expect(parseReferenceSearchValue(referenceParam, 'Organization/111')).toMatchInlineSnapshot(`
                Object {
                  "id": "111",
                  "referenceType": "relative",
                  "resourceType": "Organization",
                }
            `);
    });
  });
  describe('searching with {fhirServiceBaseUrl}/{type}/{id}', () => {
    test('valid param', () => {
      expect(parseReferenceSearchValue(referenceParam, 'https://base-url.com/Organization/111'))
        .toMatchInlineSnapshot(`
                Object {
                  "fhirServiceBaseUrl": "https://base-url.com",
                  "id": "111",
                  "referenceType": "url",
                  "resourceType": "Organization",
                }
            `);
    });
  });
  describe('searching with just {id}', () => {
    test('one target type found', () => {
      expect(parseReferenceSearchValue(referenceParam, 'organizationId')).toMatchInlineSnapshot(`
                Object {
                  "id": "organizationId",
                  "referenceType": "idOnly",
                }
            `);
    });
    test('many target types found', () => {
      expect(parseReferenceSearchValue({ ...referenceParam, target: ['A', 'B'] }, 'organizationId'))
        .toMatchInlineSnapshot(`
                Object {
                  "id": "organizationId",
                  "referenceType": "idOnly",
                }
            `);
    });
    test('no target types found', () => {
      expect(() => parseReferenceSearchValue({ ...referenceParam, target: [] }, 'organizationId')).toThrow(
        InvalidSearchParameterError
      );
      expect(() =>
        parseReferenceSearchValue({ ...referenceParam, target: undefined }, 'organizationId')
      ).toThrow(InvalidSearchParameterError);
    });
  });
  test('search value is not an URL nor has the format <resourceType>/<id>', () => {
    expect(parseReferenceSearchValue(referenceParam, 'this:does# not match')).toMatchInlineSnapshot(`
            Object {
              "rawValue": "this:does# not match",
              "referenceType": "unparseable",
            }
        `);
  });
});
