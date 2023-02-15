/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import AWS from 'aws-sdk';
import _ from 'lodash';

export async function encryptKMS(plaintext: string, keyId: string): Promise<string> {
  if (!plaintext) throw Error('Invalid input');
  const kms = new AWS.KMS();
  const params = {
    KeyId: keyId,
    Plaintext: plaintext
  };
  const encryptRes = await kms.encrypt(params).promise();
  const encryptedstring = encryptRes.CiphertextBlob;
  return Buffer.from(encryptedstring as Buffer).toString('base64');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function encryptSelectedField(info: any): Promise<string> {
  let loggingMessage = { ...info.message };
  const field = info.meta.encryptedField;
  if (typeof field !== 'string' || !field.length) {
    throw new Error('Invalid field input to encrypt');
  }
  if (!_.has(loggingMessage, field)) {
    throw new Error('field does not exist in loggingMessage, cannot encrypt');
  }
  const fieldsContentsStringToEncrypt = JSON.stringify(_.get(loggingMessage, field), null, ' ');
  const encryptedFieldsContentsString = await encryptKMS(
    fieldsContentsStringToEncrypt,
    process.env.LOGGING_MIDDLEWARE_KMS_KEY as string
  );
  loggingMessage = _.omit(loggingMessage, field);
  _.set(loggingMessage, 'logMetadata.encryptedPayLoad', encryptedFieldsContentsString);
  return loggingMessage;
}

// Use console here so request id and log level can be automatically attached in CloudWatch log
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runLoggerLevel(info: any, msg: Array<{}>): void {
  /* eslint-disable no-console */
  switch (info[Symbol.for('level')]) {
    case 'debug':
      console.debug(...msg);
      break;
    case 'info':
      console.info(...msg);
      break;
    case 'warn':
      console.warn(...msg);
      break;
    case 'error':
      console.error(...msg);
      break;
    default:
      console.log(...msg);
      break;
  }
  /* eslint-enable no-console */
}
