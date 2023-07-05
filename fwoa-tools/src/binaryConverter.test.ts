/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import AWS from 'aws-sdk';
import { GetObjectRequest, ListObjectsV2Request, PutObjectRequest } from 'aws-sdk/clients/s3';
import * as AWSMock from 'aws-sdk-mock';
import {
  convertBinaryResource,
  getBinaryObject,
  getBinaryResource,
  parseCmdOptions,
  uploadBinaryResource
} from './binaryConverter';
import { ExportOutput } from './migrationUtils';

AWSMock.setSDKInstance(AWS);
let fakeFile: ExportOutput = {
  jobId: 'binaryUnitTests',
  file_names: { Binary: ['Binary/Binary-0.ndjson'] }
};

describe('binaryConverter', () => {
  afterEach(() => {
    AWSMock.restore();
  });

  beforeEach(() => {
    jest.resetModules();
    process.env.BINARY_BUCKET_NAME = 'unit_test_binary_bucket_name';
    process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
  });

  describe('parseCmdOptions', () => {
    beforeEach(() => {
      process.env.BINARY_BUCKET_NAME = 'unit_test_binary_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    });

    test('dryrun enabled', () => {
      process.argv = ['/usr/local/bin/ts-node', 'binaryConverter.ts', '-d'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argv: any = parseCmdOptions();
      expect(argv.dryRun).toEqual(true);
    });
    test('dryrun not enabled', () => {
      process.argv = ['/usr/local/bin/ts-node', 'binaryConverter.ts'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argv: any = parseCmdOptions();
      expect(argv.dryRun).toEqual(false);
    });
  });

  describe('convertBinaryResource', () => {
    let logs: fs.WriteStream;
    beforeAll(() => {
      logs = fs.createWriteStream('binary_unit_test.log');
    });

    beforeEach(() => {
      process.env.BINARY_BUCKET_NAME = 'unit_test_binary_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    });

    afterAll(() => {
      logs.end();
      AWSMock.restore();
    });

    afterEach(() => {
      // reset the output
      fakeFile = {
        jobId: 'binaryUnitTests',
        file_names: { Binary: ['Binary/Binary-0.ndjson'] }
      };
    });

    test('multi-tenancy = false', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binaryResource: any = {
        resourceType: 'Binary',
        contentType: 'image/jpeg',
        id: 'testBinaryObj',
        meta: {
          tag: [],
          versionId: 1
        }
      };
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          callback(null, {
            Contents: [{ Key: 'testBinaryObj_1.png' }],
            $response: {}
          });
        }
      );

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          callback(null, { Body: JSON.stringify(binaryResource), $response: {} });
        }
      );
      AWSMock.mock(
        'S3',
        'upload',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: PutObjectRequest, callback: Function) => {
          // check that we are uploading the right binary resource
          expect(params.Key).toBe('binaryUnitTests/Binary_converted_testBinaryObj/Binary-1.ndjson');
          callback(null, { Body: JSON.stringify(binaryResource), $response: {} });
        }
      );
      await expect(convertBinaryResource(logs, fakeFile)).resolves.not.toThrowError();
    });

    test('multi-tenancy = true', async () => {
      process.env.MIGRATION_TENANT_ID = 'unitTestTenant';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binaryResource: any = {
        resourceType: 'Binary',
        contentType: 'image/jpeg',
        id: 'testBinaryObj',
        meta: {
          tag: [],
          versionId: 1
        }
      };
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          callback(null, {
            Contents: [{ Key: 'testBinaryObj_1.png' }],
            $response: {}
          });
        }
      );

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          callback(null, { Body: JSON.stringify(binaryResource), $response: {} });
        }
      );
      AWSMock.mock(
        'S3',
        'upload',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: PutObjectRequest, callback: Function) => {
          // check that we are uploading the right binary resource
          expect(params.Key).toBe(
            'unitTestTenant/binaryUnitTests/Binary_converted_testBinaryObj/Binary-1.ndjson'
          );
          callback(null, { Body: JSON.stringify(binaryResource), $response: {} });
        }
      );
      await convertBinaryResource(logs, fakeFile);
    });
  });

  describe('getBinaryObject', () => {
    afterEach(() => {
      AWSMock.restore();
    });

    beforeEach(() => {
      process.env.BINARY_BUCKET_NAME = 'unit_test_binary_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    });

    test('multi-tenancy = false', async () => {
      delete process.env.MIGRATION_TENANT_ID;
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params).toMatchObject({
            Bucket: 'unit_test_binary_bucket_name',
            Prefix: 'testBinaryObj_1.'
          });
          callback(null, {
            Contents: [{ Key: 'testBinaryObj_1.png' }],
            $response: {}
          });
        }
      );

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params).toMatchObject({
            Bucket: 'unit_test_binary_bucket_name',
            Key: 'testBinaryObj_1.png'
          });
          callback(null, { Body: 'binary data', $response: {} });
        }
      );
      const getBinaryObjectResult = await getBinaryObject('testBinaryObj', 1, new AWS.S3());
      expect(getBinaryObjectResult).toMatchObject({
        Body: 'binary data'
      });
    });

    test('multi-tenancy = true', async () => {
      process.env.MIGRATION_TENANT_ID = 'unit_test_tenant';
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params).toMatchObject({
            Bucket: 'unit_test_binary_bucket_name',
            Prefix: 'unit_test_tenant/testBinaryObj_1.'
          });
          callback(null, {
            Contents: [{ Key: 'unit_test_tenant/testBinaryObj_1.png' }],
            $response: {}
          });
        }
      );

      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params).toMatchObject({
            Bucket: 'unit_test_binary_bucket_name',
            Key: 'unit_test_tenant/testBinaryObj_1.png'
          });
          callback(null, { Body: 'binary data', $response: {} });
        }
      );
      const getBinaryObjectResult = await getBinaryObject('testBinaryObj', 1, new AWS.S3());
      expect(getBinaryObjectResult).toMatchObject({
        Body: 'binary data'
      });
    });
  });

  test('getBinaryResource', async () => {
    AWSMock.mock(
      'S3',
      'getObject',
      // eslint-disable-next-line @typescript-eslint/ban-types
      (params: GetObjectRequest, callback: Function) => {
        expect(params).toMatchObject({
          Bucket: 'unit_test_export_bucket_name',
          Key: 'path/to/testBinaryObj'
        });
        callback(null, { Body: 'binary data', $response: {} });
      }
    );
    const getBinaryResourceResult = await getBinaryResource('path/to/testBinaryObj', new AWS.S3());
    expect(getBinaryResourceResult).toMatchObject({
      Body: 'binary data'
    });
  });

  test('uploadBinaryResource', async () => {
    AWSMock.mock(
      'S3',
      'upload',
      // eslint-disable-next-line @typescript-eslint/ban-types
      (params: PutObjectRequest, callback: Function) => {
        expect(params).toMatchObject({
          Bucket: 'unit_test_export_bucket_name',
          Key: 'path/to/testBinaryObj',
          Body: 'new item Data'
        });
        callback(null, { Body: 'binary data', $response: {} });
      }
    );
    const getBinaryObjectResult = await uploadBinaryResource(
      'path/to/testBinaryObj',
      'new item Data',
      new AWS.S3()
    );
    expect(getBinaryObjectResult).toMatchObject({
      Body: 'binary data'
    });
  });
});
