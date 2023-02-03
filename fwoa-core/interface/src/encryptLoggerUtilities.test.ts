/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import { encryptKMS, encryptSelectedField } from './encryptLoggerUtilities';
import inputLogger from './InputExampleEncryptedLoggerBuilder.json';

//use jest.fn mock for class

describe('test logger utilities', () => {
  // afterEach(() => {
  //   jest.clearAllMocks();
  // });
  describe('encryptSelectedField', () => {
    // const mockConsoleLog = jest.spyOn(console,'error');
    test('happy case"', async () => {
      //BUILD
      const exampleMessage = inputLogger;
      const encryptRes: string =
        'AQICAHjcGHP1MkH7KGBnyHnq4XZ51xDg95nNn8z4adVcGyROBAEKAH777oJlzDgWqcoTpJyZAAAAgzCBgAYJKoZIhvcNAQcGoHMwcQIBADBsBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDKxAIrGoAXjhz1C6zAIBEIA/WZ1Qqt0C7/mL1LMZ0lWw0T6pOP4P5+ZmiKnw/8N1BvVcuPuGiWqtEkftKDL/2fVKlt/x1SuMQXQ4O8e0ULQ8';
      AWSMock.setSDKInstance(AWS);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AWSMock.mock('KMS', 'encrypt', (params: any, callback: Function) => {
        callback(null, {
          CiphertextBlob: Buffer.from(encryptRes)
        });
      });
      const info = {
        meta: { metaData: ['logMetadata.EncryptedPayLoad'], componenet: 'routing' },
        message: exampleMessage
      };

      //OPERATION
      const result = await encryptSelectedField(info);
      // // console.error(exampleInfo);
      // const encryptedComponentLogger = makeEncryptLogger({ metaData: ['logMetadata.EncryptedPayLoad'], componenet: 'routing' })
      // encryptedComponentLogger.log(exampleMessage);

      //CHECK
      expect(result).toMatchSnapshot();
      // expect(encrptLogger.log).toMatchInlineSnapshot();
    });
    test('test error: Invalid data input to encrypt', async () => {
      //BUILD
      const exampleMessage = inputLogger;
      const info = {
        meta: { metaData: 'safasdfa', componenet: 'routing' },
        message: exampleMessage
      };
      //CHECK
      await expect(encryptSelectedField(info)).rejects.toThrow('Invalid data input to encrypt');
    });
    test('test error: Invalid data type for field input', async () => {
      const exampleMessage = inputLogger;
      const info = {
        meta: { metaData: [2342], componenet: 'routing' },
        message: exampleMessage
      };
      await expect(encryptSelectedField(info)).rejects.toThrow('Invalid data type for field input');
    });
    test('test error: Invalid field to encrypt', async () => {
      //BUILD
      const exampleMessage = inputLogger;
      const info = {
        meta: { metaData: ['asdas'], componenet: 'routing' },
        message: exampleMessage
      };

      //CHECK
      await expect(encryptSelectedField(info)).rejects.toThrow('Invalid field to encrypt');
    });
  });

  describe('encryptKMS', () => {
    test('Success string encryption', async () => {
      // BUILD
      const encryptRes: string =
        'AQICAHjcGHP1MkH7KGBnyHnq4XZ51xDg95nNn8z4adVcGyROBAEKAH777oJlzDgWqcoTpJyZAAAAgzCBgAYJKoZIhvcNAQcGoHMwcQIBADBsBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDKxAIrGoAXjhz1C6zAIBEIA/WZ1Qqt0C7/mL1LMZ0lWw0T6pOP4P5+ZmiKnw/8N1BvVcuPuGiWqtEkftKDL/2fVKlt/x1SuMQXQ4O8e0ULQ8';
      AWSMock.setSDKInstance(AWS);
      //eslint-disable-next-line @typescript-eslint/ban-types
      AWSMock.mock('KMS', 'encrypt', (params: any, callback: Function) => {
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
      const encryptRes: string = 'ASDFGHJKLKJ';
      AWSMock.setSDKInstance(AWS);
      //eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/ban-types
      AWSMock.mock('KMS', 'encrypt', (params, callback: Function) => {
        if (params.Plaintext) {
          callback(null, {
            CiphertextBlob: encryptRes,
            KeyId: '12314324324',
            EncryptionAlgorithm: 'SYMMETRIC_DEFAULT'
          });
        }
        callback(new Error('Invalid input'));
      });

      // CHECK
      await expect(encryptKMS('', '123456789012')).rejects.toThrowError('Invalid input');
    });
  });
});
