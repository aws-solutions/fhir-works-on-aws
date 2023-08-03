/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import child_process from 'child_process';
import fs, { PathLike } from 'fs';
import AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import { convertBinaryResource, parseCmdOptions, logs } from './binaryConverter';
import { ExportOutput } from './migrationUtils';

AWSMock.setSDKInstance(AWS);
let fakeFile: ExportOutput = {
  jobId: 'binaryUnitTests',
  file_names: { Binary: ['Binary/Binary-0.ndjson'] }
};
const env = process.env;

describe('binaryConverter', () => {
  beforeAll(() => {
    jest.spyOn(logs, 'write').mockImplementation((log: string) => {
      console.log(log);
      return true;
    });
    jest.spyOn(logs, 'end').mockImplementation();
    jest.spyOn(child_process, 'execSync').mockImplementation();
  });

  afterEach(() => {
    AWSMock.restore();
    process.env = env;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env.BINARY_BUCKET_NAME = 'unit_test_binary_bucket_name';
    process.env.EXPORT_BUCKET_NAME = 'unit_test_export_bucket_name';
    process.env.API_AWS_REGION = 'us-east-1';
    process.env.GLUE_JOB_NAME = 'fake-job-name';
    process.env.DATASTORE_ID = 'fake-ds-id';
    process.env.DATASTORE_ENDPOINT = 'fake-endpoint';
    process.env.DATA_ACCESS_ROLE_ARN = 'fake-role-arn';
    process.env.IMPORT_KMS_KEY_ARN = 'fake-kms-arn';
    process.env.IMPORT_OUTPUT_S3_BUCKET_NAME = 'fake-import-output-bucket-name';
    process.env.HEALTHLAKE_CLIENT_TOKEN = 'fake-client-id';
    process.env.EXPORT_BUCKET_URI = 'fake-export-uri';
    process.env.IMPORT_OUTPUT_S3_URI = 'fake-import-uri';
  });

  describe('parseCmdOptions', () => {
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
    afterAll(() => {
      AWSMock.restore();
    });

    afterEach(() => {
      // reset the output
      fakeFile = {
        jobId: 'binaryUnitTests',
        file_names: { 'Binary-v1': ['binaryUnitTests/Binary-v1/Binary-0.ndjson'] }
      };
      jest.resetAllMocks();
    });

    test('multi-tenancy = false', async () => {
      delete process.env.MIGRATION_TENANT_ID;
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

      // mock the readdirSync call. we need to do type-casting here since jest doesn't
      // know which overload to use for mocking and defaults to the wrong one
      (jest.spyOn(fs, 'readdirSync') as unknown as jest.SpyInstance<string[]>).mockReturnValue([
        'testBinaryObj_1.png'
      ]);

      // mock the two readFileSync calls
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
        return JSON.stringify(binaryResource);
      });
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryObjects/testBinaryObj_1.png`);
        return JSON.stringify(binaryResource);
      });

      // mock the rename call
      jest.spyOn(fs, 'renameSync').mockImplementationOnce((oldPath: PathLike, newPath: PathLike) => {
        expect(oldPath).toBe('./binaryFiles/temp.ndjson');
        expect(newPath).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
      });

      jest.spyOn(fs, 'createWriteStream').mockImplementationOnce((path: PathLike) => {
        expect(path).toBe('./binaryFiles/temp.ndjson');
        return logs;
      });

      await expect(convertBinaryResource(fakeFile)).resolves.not.toThrowError();
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        1,
        `aws s3 sync s3://unit_test_export_bucket_name/binaryUnitTests ./binaryFiles --exclude "*" --include "Binary-v*"`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        2,
        `aws s3 sync s3://unit_test_binary_bucket_name/ ./binaryObjects`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        3,
        `aws s3 sync ./binaryFiles s3://unit_test_export_bucket_name/binaryUnitTests`,
        { stdio: 'ignore' }
      );
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
      fakeFile = {
        jobId: 'binaryUnitTests',
        file_names: { 'Binary-v1': ['unitTestTenant/binaryUnitTests/Binary-v1/Binary-0.ndjson'] }
      };

      // mock the readdirSync call. we need to do type-casting here since jest doesn't
      // know which overload to use for mocking and defaults to the wrong one
      (jest.spyOn(fs, 'readdirSync') as unknown as jest.SpyInstance<string[]>).mockReturnValue([
        'testBinaryObj_1.png'
      ]);

      // mock the two readFileSync calls
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
        return JSON.stringify(binaryResource);
      });
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryObjects/testBinaryObj_1.png`);
        return JSON.stringify(binaryResource);
      });

      // mock the rename call
      jest.spyOn(fs, 'renameSync').mockImplementationOnce((oldPath: PathLike, newPath: PathLike) => {
        expect(oldPath).toBe('./binaryFiles/temp.ndjson');
        expect(newPath).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
      });

      jest.spyOn(fs, 'createWriteStream').mockImplementationOnce((path: PathLike) => {
        expect(path).toBe('./binaryFiles/temp.ndjson');
        return logs;
      });

      await expect(convertBinaryResource(fakeFile)).resolves.not.toThrowError();
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        1,
        `aws s3 sync s3://unit_test_export_bucket_name/unitTestTenant/binaryUnitTests ./binaryFiles --exclude "*" --include "Binary-v*"`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        2,
        `aws s3 sync s3://unit_test_binary_bucket_name/unitTestTenant/ ./binaryObjects`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        3,
        `aws s3 sync ./binaryFiles s3://unit_test_export_bucket_name/unitTestTenant/binaryUnitTests`,
        { stdio: 'ignore' }
      );
    });

    test('multi-tenancy = false, multiple resources', async () => {
      delete process.env.MIGRATION_TENANT_ID;
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const secondBinaryResource: any = {
        resourceType: 'Binary',
        contentType: 'image/jpeg',
        id: 'testBinaryObj2',
        meta: {
          tag: [],
          versionId: 1
        }
      };

      // mock the readdirSync call. we need to do type-casting here since jest doesn't
      // know which overload to use for mocking and defaults to the wrong one
      (jest.spyOn(fs, 'readdirSync') as unknown as jest.SpyInstance<string[]>).mockReturnValue([
        'testBinaryObj_1.png',
        'testBinaryObj2_1.png'
      ]);

      // mock the three readFileSync calls
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
        return JSON.stringify(binaryResource) + '\n' + JSON.stringify(secondBinaryResource);
      });
      jest
        .spyOn(fs, 'readFileSync')
        .mockImplementationOnce((path: number | PathLike): string | Buffer => {
          expect(path).toBe(`./binaryObjects/testBinaryObj_1.png`);
          return JSON.stringify(binaryResource);
        })
        .mockImplementationOnce((path: number | PathLike): string | Buffer => {
          expect(path).toBe(`./binaryObjects/testBinaryObj2_1.png`);
          return JSON.stringify(secondBinaryResource);
        });

      // mock the rename call
      jest.spyOn(fs, 'renameSync').mockImplementationOnce((oldPath: PathLike, newPath: PathLike) => {
        expect(oldPath).toBe('./binaryFiles/temp.ndjson');
        expect(newPath).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
      });

      jest.spyOn(fs, 'createWriteStream').mockImplementationOnce((path: PathLike) => {
        expect(path).toBe('./binaryFiles/temp.ndjson');
        return logs;
      });

      await expect(convertBinaryResource(fakeFile)).resolves.not.toThrowError();
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        1,
        `aws s3 sync s3://unit_test_export_bucket_name/binaryUnitTests ./binaryFiles --exclude "*" --include "Binary-v*"`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        2,
        `aws s3 sync s3://unit_test_binary_bucket_name/ ./binaryObjects`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        3,
        `aws s3 sync ./binaryFiles s3://unit_test_export_bucket_name/binaryUnitTests`,
        { stdio: 'ignore' }
      );
    });

    test('multi-tenancy = false, deleted resource included', async () => {
      delete process.env.MIGRATION_TENANT_ID;
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const secondBinaryResource: any = {
        resourceType: 'Binary',
        contentType: 'image/jpeg',
        id: 'testBinaryObj2',
        meta: {
          tag: [
            {
              display: 'DELETED',
              code: 'DELETED'
            }
          ],
          versionId: 1
        }
      };

      // mock the readdirSync call. we need to do type-casting here since jest doesn't
      // know which overload to use for mocking and defaults to the wrong one
      (jest.spyOn(fs, 'readdirSync') as unknown as jest.SpyInstance<string[]>).mockReturnValue([
        'testBinaryObj_1.png',
        'testBinaryObj2_1.png'
      ]);

      // mock the three readFileSync calls
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
        return JSON.stringify(binaryResource) + '\n' + JSON.stringify(secondBinaryResource);
      });
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce((path: number | PathLike): string | Buffer => {
        expect(path).toBe(`./binaryObjects/testBinaryObj_1.png`);
        return JSON.stringify(binaryResource);
      });

      // mock the rename call
      jest.spyOn(fs, 'renameSync').mockImplementationOnce((oldPath: PathLike, newPath: PathLike) => {
        expect(oldPath).toBe('./binaryFiles/temp.ndjson');
        expect(newPath).toBe(`./binaryFiles/Binary-v1/Binary-0.ndjson`);
      });

      jest.spyOn(fs, 'createWriteStream').mockImplementationOnce((path: PathLike) => {
        expect(path).toBe('./binaryFiles/temp.ndjson');
        return logs;
      });

      await expect(convertBinaryResource(fakeFile)).resolves.not.toThrowError();
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        1,
        `aws s3 sync s3://unit_test_export_bucket_name/binaryUnitTests ./binaryFiles --exclude "*" --include "Binary-v*"`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        2,
        `aws s3 sync s3://unit_test_binary_bucket_name/ ./binaryObjects`,
        { stdio: 'ignore' }
      );
      expect(child_process.execSync).toHaveBeenNthCalledWith(
        3,
        `aws s3 sync ./binaryFiles s3://unit_test_export_bucket_name/binaryUnitTests`,
        { stdio: 'ignore' }
      );
    });
  });
});
