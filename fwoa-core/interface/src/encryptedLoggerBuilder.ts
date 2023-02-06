// import _ from 'lodash';
import { createLogger, Logger } from 'winston';
import Transport from 'winston-transport';
import { encryptSelectedField } from './encryptLoggerUtilities';

class SimpleEncryptConsole extends Transport {
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any
  async log(info: any, callback: () => void) {
    try {
      setImmediate(() => this.emit('logged', info));
      // encrypt
      const encryptedMessage = await encryptSelectedField(info);

      const msg = [info.meta, JSON.stringify(encryptedMessage, null, ' ')];
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

export function makeEncryptLogger(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any,
  logLevel: string | undefined = process.env.LOG_LEVEL
): Logger {
  return createLogger({
    level: logLevel,
    transports: [new SimpleEncryptConsole()],
    defaultMeta: { meta: metadata }
  });
}
