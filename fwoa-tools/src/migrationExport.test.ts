/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
jest.mock('./migrationUtils', () => ({ checkConfiguration: () => {} }));
jest.mock('./exportHelper', () => ({
  startExportJob: () => {
    return { jobId: 'fakeJobId1', jobRunId: 'fakeJobRunId1' };
  },
  getExportStatus: () => {},
  getExportStateFile: () => {
    return {
      jobId: 'fakeJobId-1',
      file_names: ['file1', 'file2']
    };
  }
}));

import { buildRunScriptParams, parseCmdOptions, runScript } from './migrationExport';

describe('migrationExport', () => {
  describe('parseCmdOptions', () => {
    test('smart, dryrun, and since enabled', () => {
      process.argv = [
        '/usr/local/bin/ts-node',
        'migrationExport.ts',
        '-s',
        '-d',
        '-t',
        '1800-01-01T00:00:00.000Z'
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argv: any = parseCmdOptions();
      expect(argv.dryRun).toEqual(true);
      expect(argv.smart).toEqual(true);
      expect(argv.since).toEqual('1800-01-01T00:00:00.000Z');
    });
    test('smart, dryrun, and since not enabled', () => {
      process.argv = ['/usr/local/bin/ts-node', 'migrationExport.ts'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argv: any = parseCmdOptions();
      expect(argv.dryRun).toEqual(false);
      expect(argv.smart).toEqual(false);
      expect(argv.since).toBeNull();
    });
  });

  test('buildRunScriptParams', () => {
    process.argv = ['/usr/local/bin/ts-node', 'migrationExport.ts'];
    const { smartClient, dryRun, since, snapshotExists, snapshotLocation } = buildRunScriptParams();
    expect(dryRun).toEqual(false);
    expect(smartClient).toEqual(false);
    expect(snapshotExists).toEqual(false);
    expect(snapshotLocation).toBeNull();
    expect(since).toBeNull();
  });
  describe('runScript', () => {
    test('smartClient - false', async () => {
      await expect(
        runScript(false, false, '1800-01-01T00:00:00.000Z', false, '')
      ).resolves.not.toThrowError();
    });
    test('smartClient - true', async () => {
      await expect(runScript(true, false, '1800-01-01T00:00:00.000Z', false, '')).resolves.not.toThrowError();
    });
    test('runScript - tenantId', async () => {
      process.env.MIGRATION_TENANT_ID = 'tenant1';
      await expect(
        runScript(false, false, '1800-01-01T00:00:00.000Z', false, '')
      ).resolves.not.toThrowError();
    });
    test('runScript - invalidSinceDate', async () => {
      process.argv = ['/usr/local/bin/ts-node', 'migrationExport.ts', '-t', 'abc'];
      await expect(runScript(false, false, 'incorrectSinceDate', false, '')).rejects.toThrowError(
        'Provided since timestamp not in correct format (ISO 8601)'
      );
    });
  });
});
