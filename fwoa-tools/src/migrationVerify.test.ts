/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

jest.mock('./migrationUtils', () => ({
    checkConfiguration: () => {},
    getFhirClientSMART: () => {
        //eslint-disable-next-line
        return axios.create();
    },
    getFhirClient: () => {
        //eslint-disable-next-line
        return axios.create();
    }
}));

import AWS from 'aws-sdk';
import {GetObjectRequest} from "aws-sdk/clients/s3";
import * as AWSMock from 'aws-sdk-mock';
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {logs} from "./migrationImport";
import {parseCmdOptions, buildRunScriptParams, verifyFolderImport, runScript, verifyResource} from "./migrationVerify";

let mock: MockAdapter;
AWSMock.setSDKInstance(AWS);

describe('migrationVerify', () => {
    beforeAll(() => {
        jest.spyOn(logs, 'write').mockImplementation((log: string) => {
            console.log(log);
            return true;
        });
        jest.spyOn(logs, 'end').mockImplementation(jest.fn());
    });
    beforeEach(() => {
        mock = new MockAdapter(axios);
        AWSMock.restore();
    })
    afterEach(() => {
        mock.reset();
        AWSMock.restore();
    })
    describe('parseCmdOptions', () => {
        test('smart and dryrun enabled', () => {
            process.argv = [
                '/usr/local/bin/ts-node',
                'migrationVerify.ts',
                '-s',
                '-d',
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const argv: any = parseCmdOptions();
            expect(argv.dryRun).toEqual(true);
            expect(argv.smart).toEqual(true);
        });
        test('smart and dryrun not enabled', () => {
            process.argv = [
                '/usr/local/bin/ts-node',
                'migrationVerify.ts'
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const argv: any = parseCmdOptions();
            expect(argv.dryRun).toEqual(false);
            expect(argv.smart).toEqual(false);
        });
    })
    test ('buildRunScriptParams', () => {
        process.argv = [
            '/usr/local/bin/ts-node',
            'migrationExport.ts'
        ];
        const {smartClient, dryRun} = buildRunScriptParams();
        expect(dryRun).toEqual(false);
        expect(smartClient).toEqual(false);
    })

    test('runScript', async() => {
        process.env.EXPORT_BUCKET_NAME = 'fake-bucket-name'
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
        await expect(runScript(true, false, {
            jobId: 'fakeJobId-1',
            file_names:
                { Patient: ['Patient/Patient-0.ndjson'] }
        })).resolves;
    })
    describe('verifyResource', () => {
        test('nonBinary', (async() => {
            const fhirClient = axios.create();
            const healthLakeResource = {
                "resourceType": "Patient",
                "id": "unit_test_patient",
                "meta": {
                    "tag": []
                }
            };
            const fhirResource = {
                "resourceType": "Patient",
                "id": "unit_test_patient",
                "meta": {
                    "tag": []
                }
            };
            mock.onGet(/.*/g).reply(200, fhirResource);

            await expect(verifyResource(fhirClient, healthLakeResource, 'unit_test_patient', 'Patient'))
                .resolves.toEqual(true);
        }))

        test('Binary', (async() => {
            const fhirClient = axios.create();
            const healthLakeResource = {
                "resourceType": "Binary",
                "id": "unit_test_binary",
                "data": "fakeBinaryResourceData"
            };
            const fhirResource = {
                "resourceType": "Binary",
                "id": "unit_test_binary",
                "presignedGetUrl": "fakePresignedUrl"
            };
            mock.onGet(/.*/g).reply(200, fhirResource);

            await expect(verifyResource(fhirClient, healthLakeResource, 'unit_test_binary', 'Binary'))
                .resolves.toEqual(true);
        }))

    })
})