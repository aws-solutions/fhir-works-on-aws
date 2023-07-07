/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import path from 'path';
import * as dotenv from 'dotenv';
import { getFhirClient, getFhirClientSMART } from '../migrationUtils';

dotenv.config({ path: path.resolve(__dirname, './.env') });

describe('MigrationUtils', () => {
  describe('getFhirClient', () => {
    test('client should be able to authenticate', async () => {
      expect(await getFhirClient()).toBeTruthy();
    });

    // Not needed because this functionality does not exist in any migration scripts
    // we are expecting that the cognito user is an auditor so that they cannot write to the system
    test.skip('client should not be able to C/U/D', async () => {
      const client = await getFhirClient();
      await expect(client.post('Patient', {})).rejects.toMatchObject({
        response: { status: 401 }
      });
      await expect(client.delete('Patient/id')).rejects.toMatchObject({
        response: { status: 401 }
      });
      await expect(client.put('Patient/id', {})).rejects.toMatchObject({
        response: { status: 401 }
      });
    });
  });

  describe('getFhirClientSMART', () => {
    test('client should be able to authenticate', async () => {
      expect(await getFhirClientSMART()).toBeTruthy();
    });

    // Not needed because this functionality does not exist in any migration scripts
    // we are only using system/*.read scopes so we cannot write to the system
    test.skip('client should not be able to C/U/D', async () => {
      const client = await getFhirClientSMART();
      await expect(client.post('Patient', {})).rejects.toMatchObject({
        response: { status: 401 }
      });
      await expect(client.delete('Patient/id')).rejects.toMatchObject({
        response: { status: 401 }
      });
      await expect(client.put('Patient/id', {})).rejects.toMatchObject({
        response: { status: 401 }
      });
    });
  });
});
