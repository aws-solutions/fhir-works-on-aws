/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import AWS from 'aws-sdk';
import { GetObjectRequest, ListObjectsV2Request } from 'aws-sdk/clients/s3';
import * as AWSMock from 'aws-sdk-mock';
import {
  checkConvertedBinaryFileSize,
  checkFolderSizeOfResource,
  deleteFhirResourceFromHealthLakeIfNeeded
} from './migrationImport';
import { ExportOutput } from './migrationUtils';

AWSMock.setSDKInstance(AWS);

describe('migrationImport', () => {
  const logs = fs.createWriteStream('migrationImport_unit_test.log');

  afterAll(() => {
    logs.end();
  });

  describe('deleteFhirResourceFromHealthLakeIfNeeded', () => {
    const fakeFile: ExportOutput = {
      jobId: 'importUnitTests',
      file_names: { Patient: ['Patient/Patient-0.ndjson'] }
    };

    beforeAll(() => {
      process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'unit_test_import_output_bucket_name';
      process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    });

    afterEach(() => {
      AWSMock.restore();
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
      await expect(
        deleteFhirResourceFromHealthLakeIfNeeded('Patient', logs, fakeFile)
      ).resolves.not.toThrowError();
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
      await expect(
        checkFolderSizeOfResource(['Patient'], logs, 'testBinaryJobId')
      ).resolves.not.toThrowError();
    });

    it('should not pass for folders less than 500GB', async () => {
      AWSMock.mock(
        'S3',
        'listObjectsV2',
        // eslint-disable-next-line @typescript-eslint/ban-types
        (params: ListObjectsV2Request, callback: Function) => {
          expect(params.Prefix).toBe('testBinaryJobId/Patient');
          callback(null, {
            Contents: [{ Size: 436870912000 }, { Size: 436870912000 }],
            $response: {}
          });
        }
      );
      await expect(checkFolderSizeOfResource(['Patient'], logs, 'testBinaryJobId')).rejects.toThrowError();
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
      await expect(checkConvertedBinaryFileSize(logs, 'testBinaryJobId')).resolves.not.toThrowError();
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
      await expect(checkConvertedBinaryFileSize(logs, 'testBinaryJobId')).rejects.toThrowError();
    });
  });
});
