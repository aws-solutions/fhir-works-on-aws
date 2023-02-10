import { Client } from '@elastic/elasticsearch';

import Mock from '@elastic/elasticsearch-mock';

import DdbToEsHelper from './ddbToEsHelper';
import ESBulkCommand from './ESBulkCommand';

const ddbToEsHelper = new DdbToEsHelper();

describe('DdbToEsHelper', () => {
  let esMock: Mock;
  beforeEach(() => {
    esMock = new Mock();
    ddbToEsHelper.ElasticSearch = new Client({
      node: 'https://fake-es-endpoint.com',
      Connection: esMock.getConnection()
    });
  });
  afterEach(() => {
    esMock.clearAll();
  });

  describe('createIndexAndAliasIfNotExist', () => {
    process.env.ENABLE_ES_HARD_DELETE = 'true';
    const getAliasesBody = {
      documentreference: {
        aliases: {}
      },
      fake: {
        aliases: {
          'fake-alias': {}
        }
      },
      '.kibana_1': {
        aliases: {
          '.kibana': {},
          '.kibana_1-alias': {}
        }
      },
      patient: {
        aliases: {
          'patient-alias': {}
        }
      },
      'patient-delete': {
        aliases: {}
      },
      practitioner: {
        aliases: {
          'practitioner-alias': {}
        }
      }
    };
    test('empty array passed in', async () => {
      // TEST
      await expect(ddbToEsHelper.createIndexAndAliasIfNotExist([])).resolves.not.toThrow();
    });
    test('Alias already created', async () => {
      // BUILD
      const mockExists = jest.fn(() => {
        return { statusCode: 200, body: true };
      });

      esMock.add(
        {
          method: 'HEAD',
          // path: '/patient/_alias/patient-alias',
          path: '/_alias/patient-alias'
        },
        mockExists
      );
      // TEST
      await ddbToEsHelper.createIndexAndAliasIfNotExist([{ index: 'patient', alias: 'patient-alias' }]);
      // VALIDATE
      expect(mockExists).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'HEAD',
          path: '/_alias/patient-alias',
          querystring: { expand_wildcards: 'all' }
        })
      );
    });

    test('Create index and alias', async () => {
      // BUILD
      // esMock throws 404 for unmocked method, so there's no need to mock HEAD /patient/_alias/patient-alias here
      esMock.add({ method: 'GET', path: '/_alias' }, () => {
        return getAliasesBody;
      });

      const mockAddIndex = jest.fn(() => {
        return { statusCode: 200 };
      });
      esMock.add(
        {
          method: 'PUT',
          path: '/organization'
        },
        mockAddIndex
      );
      // TEST
      await ddbToEsHelper.createIndexAndAliasIfNotExist([
        { index: 'organization', alias: 'organization-alias' }
      ]);
      // VALIDATE
      expect(mockAddIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            aliases: { 'organization-alias': {} },
            mappings: {
              properties: {
                _references: { index: true, type: 'keyword' },
                documentStatus: { index: true, type: 'keyword' },
                id: { index: true, type: 'keyword' },
                resourceType: { index: true, type: 'keyword' },
                _tenantId: { index: true, type: 'keyword' }
              }
            }
          },
          method: 'PUT',
          path: '/organization',
          querystring: {}
        })
      );
    });

    test('Create index and multiple aliases for same index', async () => {
      // BUILD
      // esMock throws 404 for unmocked method, so there's no need to mock HEAD /patient/_alias/patient-alias here
      esMock.add({ method: 'GET', path: '/_alias' }, () => {
        return getAliasesBody;
      });

      const mockAddIndex = jest.fn(() => {
        return { statusCode: 200 };
      });
      esMock.add(
        {
          method: 'PUT',
          path: '/organization'
        },
        mockAddIndex
      );
      // TEST
      await ddbToEsHelper.createIndexAndAliasIfNotExist([
        { index: 'organization', alias: 'organization-alias' },
        { index: 'organization', alias: 'another-organization-alias' },
        { index: 'organization', alias: 'yet-another-organization-alias' }
      ]);
      // VALIDATE
      expect(mockAddIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            aliases: {
              'organization-alias': {},
              'another-organization-alias': {},
              'yet-another-organization-alias': {}
            },
            mappings: {
              properties: {
                _references: { index: true, type: 'keyword' },
                documentStatus: { index: true, type: 'keyword' },
                id: { index: true, type: 'keyword' },
                resourceType: { index: true, type: 'keyword' },
                _tenantId: { index: true, type: 'keyword' }
              }
            }
          },
          method: 'PUT',
          path: '/organization',
          querystring: {}
        })
      );
    });

    test('Create alias for existing index', async () => {
      // BUILD
      // esMock throws 404 for unmocked method, so there's no need to mock HEAD /patient/_alias/patient-alias here
      esMock.add({ method: 'GET', path: '/_alias' }, () => {
        return getAliasesBody;
      });

      const mockAddAlias = jest.fn(() => {
        return { statusCode: 200 };
      });
      esMock.add(
        {
          method: 'PUT',
          path: '/documentreference/_alias/documentreference-alias'
        },
        mockAddAlias
      );
      // TEST
      await ddbToEsHelper.createIndexAndAliasIfNotExist([
        { index: 'documentreference', alias: 'documentreference-alias' }
      ]);
      // VALIDATE
      expect(mockAddAlias).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/documentreference/_alias/documentreference-alias' })
      );
    });
  });

  describe('createBulkESDelete', () => {
    // BUILD
    const resourceType = 'Patient';
    const id = '1234';
    const vid = 5;
    const compositeId = `${id}_${vid}`;

    const ddbImage = {
      resourceType,
      id,
      vid,
      documentStatus: 'AVAILABLE'
    };

    // TEST
    const result: ESBulkCommand = ddbToEsHelper.createBulkESDelete(ddbImage, 'someAlias');
    // VALIDATE
    const expectedOutput: ESBulkCommand = {
      id: compositeId,
      type: 'delete',
      bulkCommand: [
        {
          delete: { _index: `someAlias`, _id: compositeId }
        }
      ]
    };
    expect(result).toStrictEqual(expectedOutput);
  });

  describe('createBulkESUpsert', () => {
    const resourceType = 'Patient';
    const id = '1234';
    const vid = 5;
    const compositeId = `${id}_${vid}`;

    const ddbImage = {
      resourceType,
      id,
      vid
    };
    test('document status is AVAILABLE', async () => {
      // BUILD
      const ddbImageCopy = { ...ddbImage, documentStatus: 'AVAILABLE' };

      // TEST
      const result: ESBulkCommand | null = ddbToEsHelper.createBulkESUpsert(ddbImageCopy, 'someAlias');
      // VALIDATE
      const expectedOutput: ESBulkCommand = {
        id: compositeId,
        type: 'upsert-AVAILABLE',
        bulkCommand: [
          { update: { _index: 'someAlias', _id: compositeId } },
          { doc: ddbImageCopy, doc_as_upsert: true }
        ]
      };
      expect(result).toStrictEqual(expectedOutput);
    });
    test('document status is DELETED', async () => {
      // BUILD
      const ddbImageCopy = { ...ddbImage, documentStatus: 'DELETED' };

      // TEST
      const result: ESBulkCommand | null = ddbToEsHelper.createBulkESUpsert(ddbImageCopy, 'someAlias');
      // VALIDATE
      const expectedOutput: ESBulkCommand = {
        id: compositeId,
        type: 'upsert-DELETED',
        bulkCommand: [
          { update: { _index: 'someAlias', _id: compositeId } },
          { doc: ddbImageCopy, doc_as_upsert: true }
        ]
      };
      expect(result).toStrictEqual(expectedOutput);
    });
    test('document status is PENDING', async () => {
      // BUILD
      const ddbImageCopy = { ...ddbImage, documentStatus: 'PENDING' };

      // TEST
      const result: ESBulkCommand | null = ddbToEsHelper.createBulkESUpsert(ddbImageCopy, 'someAlias');
      // VALIDATE
      expect(result).toBeNull();
    });
    test('document status is LOCKED', async () => {
      // BUILD
      const ddbImageCopy = { ...ddbImage, documentStatus: 'LOCKED' };

      // TEST
      const result: ESBulkCommand | null = ddbToEsHelper.createBulkESUpsert(ddbImageCopy, 'someAlias');
      // VALIDATE
      expect(result).toBeNull();
    });
  });

  describe('executeEsCmds', () => {
    test('empty list passed in', async () => {
      // TEST
      await expect(ddbToEsHelper.executeEsCmds([])).resolves.not.toThrow();
    });

    test('bulk happy path', async () => {
      // BUILD
      const mockBulk = jest.fn(() => {
        return {
          took: 30,
          errors: false,
          items: [
            {
              delete: {
                _index: 'patient',
                _type: '_doc',
                _id: '2',
                _version: 1,
                result: 'not_found',
                _shards: {
                  total: 2,
                  successful: 1,
                  failed: 0
                },
                status: 404,
                _seq_no: 1,
                _primary_term: 2
              }
            },
            {
              update: {
                _index: 'patient',
                _type: '_doc',
                _id: '1',
                _version: 2,
                result: 'updated',
                _shards: {
                  total: 2,
                  successful: 1,
                  failed: 0
                },
                status: 200,
                _seq_no: 3,
                _primary_term: 4
              }
            }
          ]
        };
      });
      esMock.add(
        {
          method: 'POST',
          path: '/_bulk'
        },
        mockBulk
      );
      // TEST
      await ddbToEsHelper.executeEsCmds([
        {
          id: 'id_1',
          type: 'delete',
          bulkCommand: [
            {
              delete: { _index: `patient-alias`, _id: 'id_1' }
            }
          ]
        },
        {
          id: 'id1_1',
          type: 'upsert-AVAILABLE',
          bulkCommand: [
            { update: { _index: `patient-alias`, _id: 'id1_1' } },
            { doc: { image: 'patient' }, doc_as_upsert: true }
          ]
        }
      ]);
      // VALIDATE
      expect(mockBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          body: [
            { delete: { _id: 'id_1', _index: 'patient-alias' } },
            { update: { _id: 'id1_1', _index: 'patient-alias' } },
            { doc: { image: 'patient' }, doc_as_upsert: true }
          ],
          method: 'POST',
          path: '/_bulk',
          querystring: { refresh: 'wait_for' }
        })
      );
    });

    test('bulk error path', async () => {
      // BUILD
      const mockBulk = jest.fn(() => {
        return {
          took: 486,
          errors: true,
          items: [
            {
              update: {
                _index: 'patient',
                _type: '_doc',
                _id: 'id1_1',
                status: 404,
                error: {
                  type: 'document_missing_exception',
                  reason: '[_doc][5]: document missing',
                  index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
                  shard: '0',
                  index: 'patient'
                }
              }
            },
            {
              delete: {
                _index: 'patient',
                _type: '_doc',
                _id: '2',
                _version: 1,
                result: 'not_found',
                _shards: {
                  total: 2,
                  successful: 1,
                  failed: 0
                },
                status: 404,
                _seq_no: 1,
                _primary_term: 2
              }
            }
          ]
        };
      });
      esMock.add(
        {
          method: 'POST',
          path: '/_bulk'
        },
        mockBulk
      );
      // TEST
      await expect(
        ddbToEsHelper.executeEsCmds([
          {
            id: 'id_1',
            type: 'delete',
            bulkCommand: [
              {
                delete: { _index: `patient-alias`, _id: 'id_1' }
              }
            ]
          },
          {
            id: 'id1_1',
            type: 'upsert-AVAILABLE',
            bulkCommand: [
              { update: { _index: `patient-alias`, _id: 'id1_1' } },
              { doc: { image: 'patient' }, doc_as_upsert: true }
            ]
          }
        ])
      ).rejects.toThrow(
        '[{"status":404,"error":{"type":"document_missing_exception","reason":"[_doc][5]: document missing","index_uuid":"aAsFqTI0Tc2W0LCWgPNrOA","shard":"0","index":"patient"},"index":"patient","id":"id1_1","esOperation":"update"}]'
      );
      // VALIDATE
      expect(mockBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          body: [
            { delete: { _id: 'id_1', _index: 'patient-alias' } },
            { update: { _id: 'id1_1', _index: 'patient-alias' } },
            { doc: { image: 'patient' }, doc_as_upsert: true }
          ],
          method: 'POST',
          path: '/_bulk',
          querystring: { refresh: 'wait_for' }
        })
      );
    });
  });

  describe('isRemoveResource', () => {
    const modifyRecord: any = {
      eventID: 'some-event-id',
      eventName: 'MODIFY',
      dynamodb: {
        OldImage: { documentStatus: { S: 'AVAILABLE' } },
        NewImage: { documentStatus: { S: 'DELETED' } }
      }
    };

    test('Should remove for REMOVE event', () => {
      // BUILD
      const removeRecord: any = {
        eventID: 'some-event-id',
        eventName: 'REMOVE',
        dynamodb: {
          OldImage: { documentStatus: { S: 'AVAILABLE' } },
          NewImage: { documentStatus: { S: 'AVAILABLE' } }
        }
      };
      // TEST
      expect(ddbToEsHelper.isRemoveResource(removeRecord)).toBeTruthy();
    });

    test('Should remove for new image in DELETED status and hard delete enabled', () => {
      // BUILD
      process.env.ENABLE_ES_HARD_DELETE = 'true';
      // TEST
      expect(ddbToEsHelper.isRemoveResource(modifyRecord)).toBeTruthy();
    });

    test('Should NOT remove for new image in DELETED status and hard delete NOT enabled', () => {
      // BUILD
      process.env.ENABLE_ES_HARD_DELETE = 'false';
      // TEST
      expect(ddbToEsHelper.isRemoveResource(modifyRecord)).toBeFalsy();
    });
  });
});
