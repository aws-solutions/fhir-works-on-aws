/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { getFhirClient, getFhirClientSMART } from '../migrationUtils';

describe('MigrationUtils', () => {
  describe('getFhirClient', () => {
    test('client should be able to authenticate', async () => {
      await expect(getFhirClient()).resolves.not.toThrowError();
    });

    // we are expecting that the cognito user is an auditor so that they cannot write to the system
    test('client should not be able to C/U/D', async () => {
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
      await expect(getFhirClientSMART()).resolves.not.toThrowError();
    });

    // we are only using system/*.read scopes so we cannot write to the system
    test('client should not be able to C/U/D', async () => {
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
