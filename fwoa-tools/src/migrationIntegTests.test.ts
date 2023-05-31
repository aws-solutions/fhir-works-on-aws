/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import axios, { AxiosInstance } from 'axios';
import { binaryObject, binaryResource, getFhirClient, getFhirClientSMART } from './migrationUtils';
import * as dotenv from 'dotenv';
import ExportHelper from './exportHelper';
import createBundle from './createPatientPractitionerEncounterBundle.json';
import { exec } from 'child_process';

dotenv.config({ path: '.env' });

const executeCommand = async (command: string) => await new Promise((resolve) => exec(command, resolve));

describe('migration: end to end test', () => {
  let fhirClient: AxiosInstance;

  test('SMART: end to end test', async () => {
    fhirClient = await getFhirClientSMART(true);
    const startTime = new Date();
    const postResponse = await fhirClient.post('/', createBundle);
    const binaryResponse = await fhirClient.post('/Binary', binaryResource);
    await axios.put(binaryResponse.data.presignedPutUrl, Buffer.from(binaryObject));
    console.log(
      'Successfully sent create resource request to FHIR server',
      JSON.stringify(postResponse.data)
    );

    await expect(
      executeCommand(`ts-node ./migrationExport.ts -s --since=${startTime.toISOString}`)
    ).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node ./binaryConverter.ts`)).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node ./migrationimport.ts -s`)).resolves.not.toThrowError();
  });

  test('non-SMART: end to end test', async () => {
    fhirClient = await getFhirClient(true);
    const startTime = new Date();
    const postResponse = await fhirClient.post('/', createBundle);
    const binaryResponse = await fhirClient.post('/Binary', binaryResource);
    await axios.put(binaryResponse.data.presignedPutUrl, Buffer.from(binaryObject));
    console.log(
      'Successfully sent create resource request to FHIR server',
      JSON.stringify(postResponse.data)
    );

    await expect(
      executeCommand(`ts-node ./migrationExport.ts --since=${startTime.toISOString}`)
    ).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node ./binaryConverter.ts`)).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node ./migrationimport.ts`)).resolves.not.toThrowError();
  });
});
