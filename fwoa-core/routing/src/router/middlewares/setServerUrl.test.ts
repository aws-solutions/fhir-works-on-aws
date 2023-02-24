/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import express from 'express';
import { FhirConfig } from 'test-e3776dcf-341e-4fc7-bfc6-762082f295fa';
import { setServerUrlMiddleware } from './setServerUrl';

async function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe('createServerUrlMiddleware', () => {
  test('root baseUrl', async () => {
    const fhirConfig = {
      server: {
        url: 'https://fwoa.com'
      }
    } as FhirConfig;

    const serverUrlMiddleware = setServerUrlMiddleware(fhirConfig);

    const nextMock = jest.fn();
    const req = { baseUrl: '/' } as unknown as express.Request;
    const res = {
      locals: {}
    } as unknown as express.Response;

    serverUrlMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith();
    expect(res.locals.serverUrl).toEqual('https://fwoa.com');
  });

  test('path base url', async () => {
    const fhirConfig = {
      server: {
        url: 'https://fwoa.com'
      }
    } as FhirConfig;

    const serverUrlMiddleware = setServerUrlMiddleware(fhirConfig);

    const nextMock = jest.fn();
    const req = { baseUrl: '/some/path' } as unknown as express.Request;
    const res = {
      locals: {}
    } as unknown as express.Response;

    serverUrlMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith();
    expect(res.locals.serverUrl).toEqual('https://fwoa.com/some/path');
  });
});
