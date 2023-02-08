/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { FhirConfig, UnauthorizedError } from '@aws/fhir-works-on-aws-interface';
import express from 'express';
import { setTenantIdMiddleware } from './setTenantId';

async function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe('SetTenantIdMiddleware', () => {
  describe('success cases', () => {
    test('simple tenantId in custom claim', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'tenantId'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            tenantId: 't1',
            aud: 'aud-Claim-That-Does-Not-Match-For-TenantId-Extraction'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith();
      expect(res.locals.tenantId).toEqual('t1');
    });

    test('simple tenantId in aud claim', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            aud: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev/tenant/t1'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith();
      expect(res.locals.tenantId).toEqual('t1');
    });

    test('simple tenantId in aud claim array', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            aud: [
              'https://xxxx.execute-api.us-east-2.amazonaws.com/dev/tenant/t1',
              'https://somethingelse.com'
            ]
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith();
      expect(res.locals.tenantId).toEqual('t1');
    });

    test('simple tenantId in both aud claim and custom claim', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'tenantId'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            aud: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev/tenant/t1',
            tenantId: 't1'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith();
      expect(res.locals.tenantId).toEqual('t1');
    });

    test('nested tenantId claim', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'obj.tenantId'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            obj: {
              tenantId: 't1'
            },
            aud: ['item1', 'item2']
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith();
      expect(res.locals.tenantId).toEqual('t1');
    });
  });

  describe('error cases', () => {
    test('bad path', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'somePathThatIsNotInTheToken'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            tenantId: 't1',
            aud: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(new UnauthorizedError('Unauthorized'));
    });

    test('invalidTenantId', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'tenantId'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            tenantId: 'InvalidTenantId_#$%&*?',
            aud: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(new UnauthorizedError('Unauthorized'));
    });

    test('tenantId in token does not match tenantId in path', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'tenantId'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: { tenantIdFromPath: 't2' } } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            tenantId: 't1',
            aud: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(new UnauthorizedError('Unauthorized'));
    });

    test('tenantId in aud claim does not match tenantId in custom claim', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true,
          tenantIdClaimPath: 'tenantId'
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: { tenantIdFromPath: 't1' } } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            tenantId: 't1',
            aud: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev/tenant/t2'
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(new UnauthorizedError('Unauthorized'));
    });

    test('aud claim array with no valid tenantId', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            aud: [
              'https://something.com',
              'https://somethingelse.com',
              'https://aontherdomain.com/some/path/t1'
            ]
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(new UnauthorizedError('Unauthorized'));
    });

    test('different tenantIds in aud claim array', async () => {
      const fhirConfig = {
        multiTenancyConfig: {
          enableMultiTenancy: true
        },
        server: {
          url: 'https://xxxx.execute-api.us-east-2.amazonaws.com/dev'
        }
      } as FhirConfig;

      const setTenantIdMiddlewareFn = setTenantIdMiddleware(fhirConfig);
      const nextMock = jest.fn();
      const req = { params: {} } as unknown as express.Request;
      const res = {
        locals: {
          userIdentity: {
            claim1: 'val1',
            aud: [
              'https://xxxx.execute-api.us-east-2.amazonaws.com/dev/tenant/t1',
              'https://xxxx.execute-api.us-east-2.amazonaws.com/dev/tenant/t2',
              'https://somethingelse.com'
            ]
          }
        }
      } as unknown as express.Response;

      setTenantIdMiddlewareFn(req, res, nextMock);

      await sleep(1);

      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(new UnauthorizedError('Unauthorized'));
    });
  });
});
