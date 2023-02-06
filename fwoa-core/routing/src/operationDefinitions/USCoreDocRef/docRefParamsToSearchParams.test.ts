/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { convertDocRefParamsToSearchParams } from './convertDocRefParamsToSearchParams';

describe('docRefParamsToSearchParams', () => {
  test('minimal params ', () => {
    expect(convertDocRefParamsToSearchParams({ patient: 'Patient/1' })).toMatchInlineSnapshot(`
            Object {
              "_count": "1",
              "_sort": "-period,-date",
              "patient": "Patient/1",
              "type": "http://loinc.org|34133-9",
            }
        `);
  });
  test('all params ', () => {
    expect(
      convertDocRefParamsToSearchParams({
        patient: 'Patient/1',
        start: '1990-10-10',
        end: '1995-10-10',
        type: {
          system: 'https://fwoa.com',
          code: 'code123'
        },
        onDemand: false
      })
    ).toMatchInlineSnapshot(`
            Object {
              "patient": "Patient/1",
              "period": Array [
                "ge1990-10-10",
                "le1995-10-10",
              ],
              "type": "https://fwoa.com|code123",
            }
        `);
  });

  test('on demand', () => {
    expect(
      convertDocRefParamsToSearchParams({
        patient: 'Patient/1',
        onDemand: true
      })
    ).toMatchInlineSnapshot(`
            Object {
              "_count": "0",
            }
        `);
  });

  test('only start', () => {
    expect(
      convertDocRefParamsToSearchParams({
        patient: 'Patient/1',
        start: '1990'
      })
    ).toMatchInlineSnapshot(`
            Object {
              "patient": "Patient/1",
              "period": Array [
                "ge1990",
              ],
              "type": "http://loinc.org|34133-9",
            }
        `);
  });

  test('only end', () => {
    expect(
      convertDocRefParamsToSearchParams({
        patient: 'Patient/1',
        end: '2000'
      })
    ).toMatchInlineSnapshot(`
            Object {
              "patient": "Patient/1",
              "period": Array [
                "le2000",
              ],
              "type": "http://loinc.org|34133-9",
            }
        `);
  });
});
