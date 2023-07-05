/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';
import { GetObjectRequest, ListObjectsV2Request } from 'aws-sdk/clients/s3';
import * as AWSMock from 'aws-sdk-mock';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  checkConvertedBinaryFileSize,
  checkFolderSizeOfResource,
  deleteFhirResourceFromHealthLakeIfNeeded,
  deleteResourcesInBundle
} from './migrationImport';
import { Bundle, ExportOutput, getEmptyFHIRBundle } from './migrationUtils';

AWSMock.setSDKInstance(AWS);
const env = process.env;

describe('migrationImport', () => {
  afterAll(() => {
    process.env = env;
  });

  describe('deleteFhirResourceFromHealthLakeIfNeeded', () => {
    const fakeFile: ExportOutput = {
      jobId: 'importUnitTests',
      file_names: { Patient: ['Patient/Patient-0.ndjson'] }
    };
    let mock: MockAdapter;

    beforeEach(() => {
      process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'unit_test_import_output_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
      mock = new MockAdapter(axios);
    });

    afterEach(() => {
      AWSMock.restore();
      mock.reset();
    });

    it('should not delete resources if none are marked for deletion', async () => {
      const fakeFileBody =
        '{"resourceType": "Patient", "id": "unit_test_patient", "meta": {"tag":[]}}\n{"resourceType": "Patient", "id": "unit_test_patient2", "meta": {"tag":[]}}';
      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params.Key).toBe('Patient/Patient-0.ndjson');
          callback(null, { Body: fakeFileBody, $response: {} });
        }
      );
      await expect(deleteFhirResourceFromHealthLakeIfNeeded('Patient', fakeFile)).resolves.not.toThrowError();
    });

    it('should delete resources if marked for deletion', async () => {
      process.env.DATASTORE_ENDPOINT = 'https://fake-endpoint.endpoint/';
      const fakeFileBody =
        '{"resourceType": "Patient", "id": "unit_test_patient", "meta": {"tag":[]}}\n{"resourceType": "Patient", "id": "unit_test_patient2", "meta": {"tag":[{"display": "DELETED", "code": "DELETED"}]}}';
      AWSMock.mock(
        'S3',
        'getObject',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: GetObjectRequest, callback: Function) => {
          expect(params.Key).toBe('Patient/Patient-0.ndjson');
          callback(null, { Body: fakeFileBody, $response: {} });
        }
      );
      mock.onPost(/.*/g).reply(200, { data: 'successful delete' });
      await expect(deleteFhirResourceFromHealthLakeIfNeeded('Patient', fakeFile)).resolves.not.toThrowError();
    });
  });

  describe('deleteResourcesInBundle', () => {
    let mock: MockAdapter;

    beforeEach(() => {
      process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'unit_test_import_output_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
      mock = new MockAdapter(axios);
    });

    afterEach(() => {
      AWSMock.restore();
      mock.reset();
    });

    it('should create bundle correctly', async () => {
      const mockBundle: Bundle = getEmptyFHIRBundle();
      mockBundle.entry = [
        { request: { method: 'DELETE', url: 'test1' } },
        { request: { method: 'DELETE', url: 'test2' } }
      ];
      mock.onPost(/.*/g).reply(200, { data: 'successful delete' });
      await expect(deleteResourcesInBundle(['test1', 'test2'])).resolves.not.toThrowError();
      expect(mock.history.post[0].data).toEqual(JSON.stringify(mockBundle));
    });
  });

  describe('checkFolderSizeOfResource', () => {
    beforeAll(() => {
      process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'unit_test_import_output_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    });

    afterEach(() => {
      AWSMock.restore();
    });

    it('should pass for folders less than 500GB', async () => {
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params.Prefix).toBe('testBinaryJobId/Patient');
          callback(null, {
            Contents: [{ Size: 500000 }, { Size: 500000 }],
            $response: {}
          });
        }
      );
      await expect(checkFolderSizeOfResource(['Patient'], 'testBinaryJobId')).resolves.not.toThrowError();
    });

    it('should not pass for folders greater than 500GB', async () => {
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params.Prefix).toBe('testImportJobId/Patient');
          callback(null, {
            Contents: [{ Size: 436870912000 }, { Size: 436870912000 }],
            $response: {}
          });
        }
      );
      await expect(checkFolderSizeOfResource(['Patient'], 'testImportJobId')).rejects.toThrowError();
    });
  });

  describe('checkConvertedBinaryFileSize', () => {
    beforeAll(() => {
      process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'unit_test_import_output_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    });

    afterEach(() => {
      AWSMock.restore();
    });

    it('should pass for Binary File sizes less than 5GB', async () => {
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params.Prefix).toBe('testBinaryJobId/Binary_converted');
          callback(null, {
            Contents: [{ Key: 'testBinaryObj_1.png', Size: 5 }],
            $response: {}
          });
        }
      );
      await expect(checkConvertedBinaryFileSize('testBinaryJobId')).resolves.not.toThrowError();
    });

    it('should not pass if Binary File size greater than 5GB', async () => {
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params.Prefix).toBe('testBinaryJobId/Binary_converted');
          callback(null, {
            Contents: [{ Key: 'testBinaryObj_1.png', Size: 6368709120 }],
            $response: {}
          });
        }
      );
      await expect(checkConvertedBinaryFileSize('testBinaryJobId')).rejects.toThrowError();
    });
  });
});
