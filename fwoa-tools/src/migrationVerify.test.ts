/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

jest.mock('./migrationUtils', () => ({
  checkConfiguration: () => {},
  getFhirClientSMART: () => {
    //eslint-disable-next-line @typescript-eslint/no-use-before-define
    return axios.create();
  },
  getFhirClient: () => {
    //eslint-disable-next-line @typescript-eslint/no-use-before-define
    return axios.create();
  }
}));

import AWS from 'aws-sdk';
import { GetObjectRequest } from 'aws-sdk/clients/s3';
import * as AWSMock from 'aws-sdk-mock';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { logs } from './migrationImport';
import {
  parseCmdOptions,
  buildRunScriptParams,
  runScript,
  verifyResource,
  verifyFolderImport
} from './migrationVerify';

let mock: MockAdapter;
const env = process.env;
const argv = process.argv;
AWSMock.setSDKInstance(AWS);

describe('migrationVerify', () => {
  beforeAll(() => {
    jest.spyOn(logs, 'write').mockImplementation((log: string) => {
      console.log(log);
      return true;
    });
    jest.spyOn(logs, 'end').mockImplementation(jest.fn());
  });
  beforeEach(() => {
    mock = new MockAdapter(axios);
    AWSMock.restore();
  });
  afterEach(() => {
    mock.reset();
    AWSMock.restore();
    process.env = env;
    process.argv = argv;
  });
  describe('parseCmdOptions', () => {
    test('smart and dryrun enabled', () => {
      process.argv = ['/usr/local/bin/ts-node', 'migrationVerify.ts', '-s', '-d'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argv: any = parseCmdOptions();
      expect(argv.dryRun).toEqual(true);
      expect(argv.smart).toEqual(true);
    });
    test('smart and dryrun not enabled', () => {
      process.argv = ['/usr/local/bin/ts-node', 'migrationVerify.ts'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argv: any = parseCmdOptions();
      expect(argv.dryRun).toEqual(false);
      expect(argv.smart).toEqual(false);
    });
  });
  test('buildRunScriptParams', () => {
    process.argv = ['/usr/local/bin/ts-node', 'migrationExport.ts'];
    const { smartClient, dryRun } = buildRunScriptParams();
    expect(dryRun).toEqual(false);
    expect(smartClient).toEqual(false);
  });

  describe('runScript', () => {
    it('should run script successfully', async () => {
      process.env.EXPORT_BUCKET_NAME = 'fake-bucket-name';
      const fakeFileBody =
        JSON.stringify({
          resourceType: 'Patient',
          id: 'unit_test_patient',
          meta: {
            tag: []
          }
        }) +
        '\n' +
        JSON.stringify({
          resourceType: 'Patient',
          id: 'unit_test_patient2',
          meta: {
            tag: []
          }
        });

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params.Key).toBe('Patient/Patient-0.ndjson');
          callback(null, { Body: fakeFileBody, $response: {} });
        }
      );
      await expect(
        runScript(true, false, false, {
          jobId: 'fakeJobId-1',
          file_names: { Patient: ['Patient/Patient-0.ndjson'] }
        })
      ).resolves.not.toThrowError();
    });
  });
  describe('verifyResource', () => {
    test('nonBinary', async () => {
      const healthLakeResource = {
        resourceType: 'Patient',
        id: 'unit_test_patient',
        meta: {
          tag: []
        }
      };
      const fhirResource = {
        resourceType: 'Patient',
        id: 'unit_test_patient',
        meta: {
          tag: []
        }
      };

      await expect(verifyResource(fhirResource, healthLakeResource, 'Patient')).resolves.toEqual(true);
    });

    test('Binary', async () => {
      const healthLakeResource = {
        resourceType: 'Binary',
        id: 'unit_test_binary',
        data: 'fakeBinaryResourceData'
      };
      const fhirResource = {
        resourceType: 'Binary',
        id: 'unit_test_binary',
        presignedGetUrl: 'fakePresignedUrl'
      };

      await expect(verifyResource(fhirResource, healthLakeResource, 'Binary')).resolves.toEqual(true);
    });
  });

  describe('verifyFolderImport', () => {
    const fakeFile = {
      jobId: 'verificationUnitTests',
      file_names: {
        'Binary-v1': ['unitTestTenant/verificationUnitTests/Binary-v1/Binary-0.ndjson'],
        'v1-0': ['unitTestTenant/verificationUnitTests/v1-0/Patient-0.ndjson']
      }
    };

    afterEach(() => {
      mock.reset();
    });

    beforeEach(() => {
      mock = new MockAdapter(axios);
    });

    it('should retry failed requests to fwoa', async () => {
      process.env.EXPORT_BUCKET_NAME = 'fake-bucket-name';
      process.env.DATASTORE_ENDPOINT = 'https://example.com';
      const fakeFileBody = [
        {
          resourceType: 'Patient',
          id: 'unit_test_patient',
          meta: {
            tag: []
          }
        }
      ];

      const healthLakeResources = [
        {
          resourceType: 'Patient',
          id: 'unit_test_patient',
          meta: {
            tag: []
          }
        }
      ];

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params.Key).toBe('unitTestTenant/verificationUnitTests/v1-0/Patient-0.ndjson');
          callback(null, { Body: JSON.stringify(fakeFileBody[0]), $response: {} });
        }
      );

      mock
        .onGet(`${process.env.DATASTORE_ENDPOINT}/Patient/unit_test_patient`)
        .replyOnce(200, healthLakeResources[0]);
      mock.onGet(`/Patient/unit_test_patient`).replyOnce(401, null);
      mock.onGet(`/Patient/unit_test_patient`).replyOnce(200, fakeFileBody[0]);

      await expect(verifyFolderImport(false, false, fakeFile)).resolves.not.toThrowError();
    });

    it('should retry failed requests to healthlake', async () => {
      process.env.EXPORT_BUCKET_NAME = 'fake-bucket-name';
      process.env.DATASTORE_ENDPOINT = 'https://example.com';
      const fakeFileBody = [
        {
          resourceType: 'Patient',
          id: 'unit_test_patient',
          meta: {
            tag: []
          }
        }
      ];

      const healthLakeResources = [
        {
          resourceType: 'Patient',
          id: 'unit_test_patient',
          meta: {
            tag: []
          }
        }
      ];

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params.Key).toBe('unitTestTenant/verificationUnitTests/v1-0/Patient-0.ndjson');
          callback(null, { Body: JSON.stringify(fakeFileBody[0]), $response: {} });
        }
      );

      mock.onGet(`${process.env.DATASTORE_ENDPOINT}/Patient/unit_test_patient`).replyOnce(401, null);
      mock
        .onGet(`${process.env.DATASTORE_ENDPOINT}/Patient/unit_test_patient`)
        .replyOnce(200, healthLakeResources[0]);
      mock.onGet(`/Patient/unit_test_patient`).replyOnce(200, fakeFileBody[0]);

      await expect(verifyFolderImport(false, false, fakeFile)).resolves.not.toThrowError();
    });
  });
});
