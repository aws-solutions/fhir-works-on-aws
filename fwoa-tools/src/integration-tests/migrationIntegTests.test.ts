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
  jest.setTimeout(10000 * 1000);

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

    await expect(executeCommand(`set -o allexport; source src/.smartenv; set +o allexport`));
    await expect(
      executeCommand(`ts-node src/migrationExport.ts -s --since=${startTime.toISOString()}`)
    ).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node src/binaryConverter.ts`)).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node src/migrationimport.ts -s`)).resolves.not.toThrowError();
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

    await expect(executeCommand(`set -o allexport; source src/.cognitoenv; set +o allexport`));
    await expect(
      executeCommand(`ts-node src/migrationExport.ts --since=${startTime.toISOString()}`)
    ).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node src/binaryConverter.ts`)).resolves.not.toThrowError();
    await expect(executeCommand(`ts-node src/migrationimport.ts`)).resolves.not.toThrowError();
  });
});
