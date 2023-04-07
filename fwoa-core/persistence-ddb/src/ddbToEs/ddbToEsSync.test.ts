/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import DdbToEsHelper from './ddbToEsHelper';
import { DdbToEsSync } from './ddbToEsSync';

const ddbHelperCreateIndexAndAliasIfNotExistMock = jest.fn();
const ddbHelperExecuteEsCmds = jest.fn();

// @ts-ignore
DdbToEsHelper.prototype.createIndexAndAliasIfNotExist = ddbHelperCreateIndexAndAliasIfNotExistMock;
// @ts-ignore
DdbToEsHelper.prototype.executeEsCmds = ddbHelperExecuteEsCmds;

const EVENT = {
  Records: [
    {
      eventID: '3db0558e9432f45190f2adfae4bdfaed',
      eventName: 'INSERT',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'us-west-2',
      dynamodb: {
        ApproximateCreationDateTime: 1629925579,
        Keys: {
          vid: {
            N: '1'
          },
          id: {
            S: 'b75eef29-4d3b-4454-ba27-6436e55d6a29'
          }
        },
        NewImage: {
          vid: {
            N: '1'
          },
          documentStatus: {
            S: 'AVAILABLE'
          },
          id: {
            S: 'b75eef29-4d3b-4454-ba27-6436e55d6a29'
          },
          resourceType: {
            S: 'Patient'
          }
        },
        SequenceNumber: '330610500000000075165486233',
        SizeBytes: 322,
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      },
      eventSourceARN:
        'arn:aws:dynamodb:us-west-2:555555555555:table/resource-db-dev/stream/2021-06-17T09:08:31.388'
    }
  ]
};

const EVENT_MULTITENANCY = {
  Records: [
    {
      eventID: '3db0558e9432f45190f2adfae4bdfaed',
      eventName: 'INSERT',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'us-west-2',
      dynamodb: {
        ApproximateCreationDateTime: 1629925579,
        Keys: {
          vid: {
            N: '1'
          },
          id: {
            S: 'tenant1|b75eef29-4d3b-4454-ba27-6436e55d6a29'
          }
        },
        NewImage: {
          vid: {
            N: '1'
          },
          _tenantId: {
            S: 'tenant1'
          },
          documentStatus: {
            S: 'AVAILABLE'
          },
          _id: {
            S: 'b75eef29-4d3b-4454-ba27-6436e55d6a29'
          },
          id: {
            S: 'tenant1|b75eef29-4d3b-4454-ba27-6436e55d6a29'
          },
          resourceType: {
            S: 'Patient'
          }
        },
        SequenceNumber: '330610500000000075165486233',
        SizeBytes: 322,
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      },
      eventSourceARN:
        'arn:aws:dynamodb:us-west-2:555555555555:table/resource-db-dev/stream/2021-06-17T09:08:31.388'
    }
  ]
};

describe('DdbToEsSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create alias and write to ES', async () => {
    const ddbToEsSync = new DdbToEsSync();

    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    expect(ddbHelperCreateIndexAndAliasIfNotExistMock.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "alias": "patient-alias",
                    "index": "patient",
                  },
                ],
              ],
            ]
        `);

    expect(ddbHelperExecuteEsCmds.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "bulkCommand": Array [
                      Object {
                        "update": Object {
                          "_id": "b75eef29-4d3b-4454-ba27-6436e55d6a29_1",
                          "_index": "patient-alias",
                        },
                      },
                      Object {
                        "doc": Object {
                          "documentStatus": "AVAILABLE",
                          "id": "b75eef29-4d3b-4454-ba27-6436e55d6a29",
                          "resourceType": "Patient",
                          "vid": 1,
                        },
                        "doc_as_upsert": true,
                      },
                    ],
                    "id": "b75eef29-4d3b-4454-ba27-6436e55d6a29_1",
                    "type": "upsert-AVAILABLE",
                  },
                ],
              ],
            ]
        `);
  });

  test('should create alias and write to ES - multi-tenant event', async () => {
    const ddbToEsSync = new DdbToEsSync();

    await ddbToEsSync.handleDDBStreamEvent(EVENT_MULTITENANCY);
    expect(ddbHelperCreateIndexAndAliasIfNotExistMock.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "alias": "patient-alias-tenant-tenant1",
                    "index": "patient",
                  },
                ],
              ],
            ]
        `);

    expect(ddbHelperExecuteEsCmds.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "bulkCommand": Array [
                      Object {
                        "update": Object {
                          "_id": "tenant1_b75eef29-4d3b-4454-ba27-6436e55d6a29_1",
                          "_index": "patient-alias-tenant-tenant1",
                        },
                      },
                      Object {
                        "doc": Object {
                          "_id": undefined,
                          "_tenantId": "tenant1",
                          "documentStatus": "AVAILABLE",
                          "id": "b75eef29-4d3b-4454-ba27-6436e55d6a29",
                          "resourceType": "Patient",
                          "vid": 1,
                        },
                        "doc_as_upsert": true,
                      },
                    ],
                    "id": "tenant1_b75eef29-4d3b-4454-ba27-6436e55d6a29_1",
                    "type": "upsert-AVAILABLE",
                  },
                ],
              ],
            ]
        `);
  });

  test('should cache aliases and create them only once', async () => {
    const ddbToEsSync = new DdbToEsSync();
    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    expect(ddbHelperCreateIndexAndAliasIfNotExistMock.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "alias": "patient-alias",
                    "index": "patient",
                  },
                ],
              ],
              Array [
                Array [],
              ],
              Array [
                Array [],
              ],
            ]
        `);
  });

  test('disableIndexAndAliasCreation option set to true', async () => {
    const ddbToEsSync = new DdbToEsSync({ disableIndexAndAliasCreation: true });
    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    expect(ddbHelperCreateIndexAndAliasIfNotExistMock).toHaveBeenCalledTimes(0);
  });

  test('custom getAliasFn', async () => {
    const ddbToEsSync = new DdbToEsSync({
      getAliasFn: () => ({ alias: 'alias-xxxxx', index: 'index-xxxx' })
    });
    await ddbToEsSync.handleDDBStreamEvent(EVENT);
    expect(ddbHelperCreateIndexAndAliasIfNotExistMock.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "alias": "alias-xxxxx",
                    "index": "index-xxxx",
                  },
                ],
              ],
            ]
        `);
    expect(ddbHelperExecuteEsCmds.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                Array [
                  Object {
                    "bulkCommand": Array [
                      Object {
                        "update": Object {
                          "_id": "b75eef29-4d3b-4454-ba27-6436e55d6a29_1",
                          "_index": "alias-xxxxx",
                        },
                      },
                      Object {
                        "doc": Object {
                          "documentStatus": "AVAILABLE",
                          "id": "b75eef29-4d3b-4454-ba27-6436e55d6a29",
                          "resourceType": "Patient",
                          "vid": 1,
                        },
                        "doc_as_upsert": true,
                      },
                    ],
                    "id": "b75eef29-4d3b-4454-ba27-6436e55d6a29_1",
                    "type": "upsert-AVAILABLE",
                  },
                ],
              ],
            ]
        `);
  });
});
