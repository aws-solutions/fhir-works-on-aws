import { createLogger, Logger } from 'winston';
import Transport from 'winston-transport';

class SimpleConsole extends Transport {
  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));
    const msg = [info.meta, info.message];
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
  }
}

// eslint-disable-next-line import/prefer-default-export
export function makeLogger(metadata?: any, logLevel: string | undefined = process.env.LOG_LEVEL): Logger {
  return createLogger({
    level: logLevel,
    transports: [new SimpleConsole()],
    defaultMeta: { meta: metadata }
  });
}
