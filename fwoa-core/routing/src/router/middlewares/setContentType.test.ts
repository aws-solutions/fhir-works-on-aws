/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import express from 'express';
import { setContentTypeMiddleware } from './setContentType';

async function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe('setContentTypeMiddleware', () => {
  test('Request should return application/fhir+json by default', async () => {
    const nextMock = jest.fn();
    const req = { headers: {} } as unknown as express.Request;
    const contentType = jest.fn();
    const res = {
      contentType
    } as unknown as express.Response;

    setContentTypeMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith();
    expect(contentType).toHaveBeenCalledWith('application/fhir+json');
  });

  test('request should return application/json if user request application/json in accept header', async () => {
    const nextMock = jest.fn();
    const req = {
      headers: {
        accept: 'application/json'
      }
    } as unknown as express.Request;
    const contentType = jest.fn();
    const res = {
      contentType
    } as unknown as express.Response;

    setContentTypeMiddleware(req, res, nextMock);
    await sleep(1);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith();
    expect(contentType).toHaveBeenCalledWith('application/json');
  });
});
