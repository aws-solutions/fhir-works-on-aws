/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import each from 'jest-each';
import { ExportType } from './bulkDataAccess';
import { getRequestInformation } from './utilities';

describe('getRequestInformation', () => {
  describe('verb: PUT', () => {
    each([
      ['normal update', '/Patient/123', { operation: 'update', resourceType: 'Patient', id: '123' }],
      [
        'conditional update',
        '/Patient/123?name=john',
        { operation: 'update', resourceType: 'Patient', id: '123' }
      ],
      ['invalid update', 'fake', { operation: 'update', resourceType: 'fake' }]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).test('%s', (testName: string, urlPath: string, expectedResponse: any) => {
      const results = getRequestInformation('PUT', urlPath);
      expect(results).toEqual(expectedResponse);
    });
  });
  describe('verb: PATCH', () => {
    each([
      ['normal patch', '/Patient/123', { operation: 'patch', resourceType: 'Patient', id: '123' }],
      [
        'conditional patch',
        '/Patient/123?name=john',
        { operation: 'patch', resourceType: 'Patient', id: '123' }
      ],
      ['invalid patch', 'fake', { operation: 'patch', resourceType: 'fake' }]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).test('%s', (testName: string, urlPath: string, expectedResponse: any) => {
      const results = getRequestInformation('PATCH', urlPath);
      expect(results).toEqual(expectedResponse);
    });
  });
  describe('verb: DELETE', () => {
    each([
      ['normal delete', '/Patient/123', { operation: 'delete', resourceType: 'Patient', id: '123' }],
      [
        'conditional delete',
        '/Patient/123?name=john',
        { operation: 'delete', resourceType: 'Patient', id: '123' }
      ],
      ['invalid delete', 'fake', { operation: 'delete', resourceType: 'fake' }]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).test('%s', (testName: string, urlPath: string, expectedResponse: any) => {
      const results = getRequestInformation('DELETE', urlPath);
      expect(results).toEqual(expectedResponse);
    });
  });
  describe('verb: GET', () => {
    each([
      ['read: metadata', '/metadata', { operation: 'read', resourceType: 'metadata' }],
      ['read: metadata; with search', '/metadata?mode=full', { operation: 'read', resourceType: 'metadata' }],
      [
        'vread',
        '/Patient/123/_history/345',
        {
          operation: 'vread',
          resourceType: 'Patient',
          id: '123',
          vid: '345'
        }
      ],
      [
        'instance-history with query',
        '/Patient/123/_history?name=joe',
        { operation: 'history-instance', resourceType: 'Patient', id: '123' }
      ],
      [
        'instance-history without query',
        '/Patient/123/_history',
        { operation: 'history-instance', resourceType: 'Patient', id: '123' }
      ],
      [
        'type-history with query',
        '/Patient/_history?name=joe',
        { operation: 'history-type', resourceType: 'Patient' }
      ],
      [
        'type-history without query',
        '/Patient/_history/',
        { operation: 'history-type', resourceType: 'Patient' }
      ],
      ['history with query', '/_history?name=joe', { operation: 'history-system' }],
      ['history without query', '_history', { operation: 'history-system' }],
      ['read', 'Patient/123', { operation: 'read', resourceType: 'Patient', id: '123' }],
      ['type-search with query', '/Patient?name=joe', { operation: 'search-type', resourceType: 'Patient' }],
      ['type-search without query', '/Patient', { operation: 'search-type', resourceType: 'Patient' }],
      ['search globally with query', '/?name=joe', { operation: 'search-system' }],
      ['search globally without query', '', { operation: 'search-system' }]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).test('%s', (testName: string, urlPath: string, expectedResponse: any) => {
      const results = getRequestInformation('GET', urlPath);
      expect(results).toEqual(expectedResponse);
    });
  });
  describe('verb: POST', () => {
    each([
      ['search on type', '/Patient/_search?name=joe', { operation: 'search-type', resourceType: 'Patient' }],
      ['search globally', '/_search/', { operation: 'search-system' }],
      ['batch', '?format=json', { operation: 'transaction' }],
      ['create', 'Patient/?format=json', { operation: 'create', resourceType: 'Patient' }]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).test('%s', (testName: string, urlPath: string, expectedResponse: any) => {
      const results = getRequestInformation('POST', urlPath);
      expect(results).toEqual(expectedResponse);
    });
  });
  test('verb: FAKE', () => {
    expect(() => {
      getRequestInformation('FAKE', '/Patient');
    }).toThrow(new Error('Unable to parse the http verb'));
  });
  describe('Export', () => {
    describe('initiate-export', () => {
      each([
        ['system', '/$export', 'system'],
        ['patient', '/Patient/$export', 'patient'],
        ['group', '/Group/1/$export', 'group']
      ]).test('%s', (testName: string, urlPath: string, exportType: ExportType) => {
        const results = getRequestInformation('GET', urlPath);
        expect(results).toEqual({
          operation: 'read',
          bulkDataAuth: {
            operation: 'initiate-export',
            exportType
          }
        });
      });
    });

    describe('get-status', () => {
      each([
        ['system', '/$export/a91b2a31-a964-4919-a220-8be73fb053dd', 'system'],
        ['patient', '/Patient/$export/a91b2a31-a964-4919-a220-8be73fb053dd', 'patient'],
        ['group', '/Group/1/$export/a91b2a31-a964-4919-a220-8be73fb053dd', 'group']
      ]).test('%s', (testName: string, urlPath: string, exportType: ExportType) => {
        const results = getRequestInformation('GET', urlPath);
        expect(results).toEqual({
          operation: 'read',
          bulkDataAuth: {
            exportType,
            operation: 'get-status-export'
          }
        });
      });
    });

    describe('cancel-export', () => {
      each([
        ['system', '/$export/a91b2a31-a964-4919-a220-8be73fb053dd', 'system'],
        ['patient', '/Patient/$export/a91b2a31-a964-4919-a220-8be73fb053dd', 'patient'],
        ['group', '/Group/1/$export/a91b2a31-a964-4919-a220-8be73fb053dd', 'group']
      ]).test('%s', (testName: string, urlPath: string, exportType: ExportType) => {
        const results = getRequestInformation('DELETE', urlPath);
        expect(results).toEqual({
          operation: 'delete',
          bulkDataAuth: {
            exportType,
            operation: 'cancel-export'
          }
        });
      });
    });
  });
});
