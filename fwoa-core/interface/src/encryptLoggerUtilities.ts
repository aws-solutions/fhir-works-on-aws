import AWS from 'aws-sdk';

export async function encryptSelectedField(info: any): Promise<string> {
  if (!Array.isArray(info.meta.metaData) || !info.meta.metaData.length) {
    throw new Error('Invalid data input to encrypt');
  }
  const loggingMessage = { ...info.message };
  const field = info.meta.metaData[0];
  if (typeof field !== 'string') {
    throw new Error('Invalid data type for field input');
  }
  const _ = require('lodash');
  const fieldToEncryptArray = field.split('.');
  // change hard code to general encrypt for multiple fields
  if (_.has(loggingMessage, fieldToEncryptArray)) {
    const fieldsContentsStringToEncrypt = JSON.stringify(
      _.get(loggingMessage, fieldToEncryptArray),
      null,
      ' '
    );
    const encryptedFieldsContentsString = await encryptKMS(
      fieldsContentsStringToEncrypt,
      `${process.env.LOGGING_MIDDLEWARE_KMS_KEY}`
    );
    _.set(loggingMessage, fieldToEncryptArray, encryptedFieldsContentsString);
    return loggingMessage;
  } else {
    throw new Error('Invalid field to encrypt');
  }
}

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
