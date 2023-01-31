import _ from 'lodash';
import { createLogger, Logger } from 'winston';
import Transport from 'winston-transport';
import { encryptKMS } from './utilities';

class SimpleEncryptConsole extends Transport {
  async log(info: any, callback: () => void) {
    try {
      setImmediate(() => this.emit('logged', info));

      // encrypt
      const msg = [info.meta, info.message];
      const fieldToEncryptArray = info.meta.metaData ? info.meta.metaData[0].split('.') : '';
      if (fieldToEncryptArray[0]) {
        const fieldsContentsStringToEncrypt = JSON.stringify(
          _.get(info.message, fieldToEncryptArray),
          null,
          ' '
        );
        const encryptedFieldsContentsString = await encryptKMS(
          fieldsContentsStringToEncrypt,
          `${process.env.LOGGING_MIDDLEWARE_KMS_KEY}`
        );
        _.set(info.message, fieldToEncryptArray, encryptedFieldsContentsString);
      }
      msg[1] = JSON.stringify(info.message, null, ' ');
      if (info[Symbol.for('splat')]) {
        msg.push(...info[Symbol.for('splat')]);
      }

      // Use console here so request ID and log level can be automatically attached in CloudWatch log
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

      if (callback) {
        callback();
      }
    } catch (error) {
      console.log(error);
    }
  }
}
// eslint-disable-next-line import/prefer-default-export
export function makeEncryptLogger(
  metadata?: any,
  logLevel: string | undefined = process.env.LOG_LEVEL
): Logger {
  return createLogger({
    level: logLevel,
    transports: [new SimpleEncryptConsole()],
    defaultMeta: { meta: metadata }
  });
}
