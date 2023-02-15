/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { createLogger, Logger } from 'winston';
import Transport from 'winston-transport';
import { runLoggerLevel } from './loggerUtilities';

class SimpleConsole extends Transport {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(info: any, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    const msg = [info.meta, info.message];
    if (info[Symbol.for('splat')]) {
      msg.push(...info[Symbol.for('splat')]);
    }
    runLoggerLevel(info, msg);
    if (callback) {
      callback();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any,import/prefer-default-export
export function makeLogger(metadata?: any, logLevel?: string): Logger {
  return createLogger({
    level: logLevel ?? process.env.LOG_LEVEL,
    transports: [new SimpleConsole()],
    defaultMeta: { meta: metadata }
  });
}
