import AWS from 'aws-sdk';

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
  const loggingMessage = { ...info.message };
  const field = info.meta.metaData;
  const _ = require('lodash');
  if (typeof field !== 'string' || !field.length) {
    throw new Error('Invalid field input to encrypt');
  }
  if (_.has(loggingMessage, field)) {
    const fieldsContentsStringToEncrypt = JSON.stringify(_.get(loggingMessage, field), null, ' ');
    const encryptedFieldsContentsString = await encryptKMS(
      fieldsContentsStringToEncrypt,
      `${process.env.LOGGING_MIDDLEWARE_KMS_KEY}`
    );
    _.set(loggingMessage, field, encryptedFieldsContentsString);
    return loggingMessage;
  }
  throw new Error('Input field does not exist in logger, cannot to encrypt');
}
