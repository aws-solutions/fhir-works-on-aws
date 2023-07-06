/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { exec } from 'child_process';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import createBundle from '../createPatientPractitionerEncounterBundle.json';
import { getFhirClient, getFhirClientSMART } from '../migrationUtils';

dotenv.config({ path: path.resolve(__dirname, './.env') });

const binaryResource: { resourceType: string; contentType: string } = {
  resourceType: 'Binary',
  contentType: 'image/jpeg'
};

const binaryObject: string = 'exampleBinaryStreamData';
const executeCommand = async (command: string): Promise<unknown> =>
  // eslint-disable-next-line security/detect-child-process
  await new Promise((resolve) => exec(command, resolve));

describe('migration: end to end test', () => {
  let fhirClient: AxiosInstance;
  jest.setTimeout(90 * 1000);

  test('SMART: end to end test', async () => {
    fhirClient = await getFhirClientSMART();
    const startTime = new Date();
    console.log('before createBundle');
    const postResponse = await fhirClient.post('/', createBundle);
    console.log('before binary');
    const binaryResponse = await fhirClient.post('/Binary', binaryResource);
    console.log('before presigned URL');
    await axios.put(binaryResponse.data.presignedPutUrl, Buffer.from(binaryObject));
    console.log(
      'Successfully sent create resource request to FHIR server',
      JSON.stringify(postResponse.data)
    );

    await expect(
      executeCommand(`ts-node ../migrationExport.ts -s --since=${startTime.toISOString()}`)
    ).resolves.toEqual(expect.anything());
    await expect(executeCommand(`ts-node ../binaryConverter.ts`)).resolves.toEqual(expect.anything());
    await expect(executeCommand(`ts-node ../migrationimport.ts -s`)).resolves.toEqual(expect.anything());
  });

  test('non-SMART: end to end test', async () => {
    fhirClient = await getFhirClient();
    const startTime = new Date();
    const postResponse = await fhirClient.post('/', createBundle);
    const binaryResponse = await fhirClient.post('/Binary', binaryResource);
    await axios.put(binaryResponse.data.presignedPutUrl, Buffer.from(binaryObject));
    console.log(
      'Successfully sent create resource request to FHIR server',
      JSON.stringify(postResponse.data)
    );

    await expect(
      executeCommand(`ts-node ../migrationExport.ts --since=${startTime.toISOString()}`)
    ).resolves.toEqual(expect.anything());
    await expect(executeCommand(`ts-node ../binaryConverter.ts`)).resolves.toEqual(expect.anything());
    await expect(executeCommand(`ts-node ../migrationimport.ts`)).resolves.toEqual(expect.anything());
  });
});
