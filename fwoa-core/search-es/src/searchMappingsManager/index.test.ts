/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { Client, errors } from '@elastic/elasticsearch';
import SearchMock from '@elastic/elasticsearch-mock';
import { SearchMappingsManager } from './index';

const TEST_MAPPINGS = {
  Patient: {
    someField: {
      type: 'text'
    }
  },
  Practitioner: {
    someField: {
      type: 'keyword'
    }
  }
};
describe('SearchMappingsManager', () => {
  let searchMock: SearchMock;
  beforeEach(() => {
    searchMock = new SearchMock();
  });
  afterEach(() => {
    searchMock.clearAll();
  });

  test('should update all mappings', async () => {
    const searchMappingsManager = new SearchMappingsManager({
      numberOfShards: 3,
      searchMappings: TEST_MAPPINGS,
      searchClient: new Client({
        node: 'https://fake-es-endpoint.com',
        Connection: searchMock.getConnection()
      })
    });

    const putMappingsMock = jest.fn(() => {
      return { statusCode: 200, body: '' };
    });

    searchMock.add(
      {
        method: 'HEAD',
        path: '/:index'
      },
      () => ({ statusCode: 200, body: true })
    );

    searchMock.add(
      {
        method: 'PUT',
        path: '/:index/_mapping'
      },
      putMappingsMock
    );

    await searchMappingsManager.createOrUpdateMappings();

    expect(putMappingsMock.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Object {
                  "body": Object {
                    "someField": Object {
                      "type": "text",
                    },
                  },
                  "method": "PUT",
                  "path": "/patient/_mapping",
                  "querystring": Object {},
                },
              ],
              Array [
                Object {
                  "body": Object {
                    "someField": Object {
                      "type": "keyword",
                    },
                  },
                  "method": "PUT",
                  "path": "/practitioner/_mapping",
                  "querystring": Object {},
                },
              ],
            ]
        `);
  });

  test('should create indices if they do not exist', async () => {
    const searchMappingsManager = new SearchMappingsManager({
      numberOfShards: 3,
      searchMappings: TEST_MAPPINGS,
      searchClient: new Client({
        node: 'https://fake-es-endpoint.com',
        Connection: searchMock.getConnection()
      })
    });

    searchMock.add(
      {
        method: 'HEAD',
        path: '/patient'
      },
      () =>
        // @ts-ignore
        new errors.ResponseError({
          headers: null,
          statusCode: 404,
          warnings: null,
          body: {
            error: {
              type: 'index_not_found_exception'
            }
          }
        })
    );

    searchMock.add(
      {
        method: 'HEAD',
        path: '/practitioner'
      },
      () => ({ statusCode: 200, body: true })
    );

    searchMock.add(
      {
        method: 'PUT',
        path: '/practitioner/_mapping'
      },
      () => {
        return { statusCode: 200, body: '' };
      }
    );

    const createIndexMock = jest.fn(() => {
      return { statusCode: 200 };
    });

    searchMock.add(
      {
        method: 'PUT',
        path: '/patient'
      },
      createIndexMock
    );

    await searchMappingsManager.createOrUpdateMappings();

    expect(createIndexMock.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Object {
                  "body": Object {
                    "mappings": Object {
                      "someField": Object {
                        "type": "text",
                      },
                    },
                    "settings": Object {
                      "number_of_shards": 3,
                    },
                  },
                  "method": "PUT",
                  "path": "/patient",
                  "querystring": Object {},
                },
              ],
            ]
        `);
  });
});
