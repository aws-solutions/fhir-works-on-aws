/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import inputLogger from './inputExampleEncryptSelectedField.json';
import { encryptKMS, encryptSelectedField } from './loggerUtilities';

process.env.LOGGING_MIDDLEWARE_KMS_KEY = 'fake-key-id';

describe('test logger utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
    AWSMock.restore('KMS');
  });
  describe('encryptSelectedField', () => {
    test('test happy case"', async () => {
      //BUILD
      const exampleMessage = inputLogger;
      const encryptRes: string = 'FakeEncryptedString';
      AWSMock.setSDKInstance(AWS);

      // eslint-disable-next-line @typescript-eslint/ban-types
      AWSMock.mock('KMS', 'encrypt', (params: { KeyId: string; Plaintext: string }, callback: Function) => {
        callback(null, {
          CiphertextBlob: Buffer.from(encryptRes),
          KeyId: '1233424123312',
          EncryptionAlgorithm: 'SYMMETRIC_DEFAULT'
        });
      });
      const info = {
        meta: { encryptedField: 'logMetadata.payLoadToEncrypt', component: 'routing' },
        message: exampleMessage
      };

      //OPERATION
      const result = await encryptSelectedField(info);

      //CHECK
      expect(result).toMatchSnapshot();
    });
    describe('invalid inputs', () => {
      test('test error: empty field name to encrypt', async () => {
        //BUILD
        const exampleMessage = inputLogger;
        const info = {
          meta: { encryptedField: '', componenet: 'routing' },
          message: exampleMessage
        };

        //CHECK
        await expect(encryptSelectedField(info)).rejects.toThrow('Invalid field input to encrypt');
      });
      test('test error: Invalid data type for field input', async () => {
        const exampleMessage = inputLogger;
        const info = {
          meta: { encryptedField: 2342, componenet: 'routing' },
          message: exampleMessage
        };
        await expect(encryptSelectedField(info)).rejects.toThrow('Invalid field input to encrypt');
      });
      test('test error: Invalid field name to encrypt', async () => {
        //BUILD
        const exampleMessage = inputLogger;
        const info = {
          meta: { encryptedField: 'asdas', componenet: 'routing' },
          message: exampleMessage
        };

        //CHECK
        await expect(encryptSelectedField(info)).rejects.toThrow(
          'field does not exist in loggingMessage, cannot encrypt'
        );
      });
    });
  });
  describe('encryptKMS', () => {
    test('Successfully encrypt string', async () => {
      // BUILD
      const encryptRes: string = 'FakeEncryptedString';
      AWSMock.setSDKInstance(AWS);
      //eslint-disable-next-line @typescript-eslint/ban-types
      AWSMock.mock('KMS', 'encrypt', (params: { KeyId: string; Plaintext: string }, callback: Function) => {
        callback(null, {
          CiphertextBlob: Buffer.from(encryptRes),
          KeyId: '1233424123312',
          EncryptionAlgorithm: 'SYMMETRIC_DEFAULT'
        });
      });

      // OPERATE
      const result = await encryptKMS('example', '1233424123312');

      // CHECK
      expect(result).toEqual(Buffer.from(encryptRes).toString('base64'));
    });
    test('Input string is empty', async () => {
      // BUILD
      const encryptRes: string = 'FakeEncryptedString';
      AWSMock.setSDKInstance(AWS);
      //eslint-disable-next-line @typescript-eslint/ban-types
      AWSMock.mock('KMS', 'encrypt', (params: { KeyId: string; Plaintext: string }, callback: Function) => {
        if (params.Plaintext) {
          callback(null, {
            CiphertextBlob: encryptRes,
            KeyId: '12314324324',
            EncryptionAlgorithm: 'SYMMETRIC_DEFAULT'
          });
        }
        callback(new Error('Invalid input'));
      });

      // OPERATE & CHECK
      await expect(encryptKMS('', '123456789012')).rejects.toThrowError('Invalid input');
    });
  });
});
