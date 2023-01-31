import express from 'express';
import { generateServerlessRouter } from './app';
import r4FhirConfigNoGeneric from './sampleData/r4FhirConfigGeneric';

const request = require('supertest');

describe('generateServerlessRouter', () => {
  const fhirConfig = r4FhirConfigNoGeneric();
  const app = generateServerlessRouter(fhirConfig, ['Patient']);
  const requestWithSupertest = request(app);

  test('Get request should return application/fhir+json', async () => {
    app.get('/test', async (req: express.Request, res: express.Response) => {
      res.send({ data: 'test' });
    });
    const res = await requestWithSupertest.get('/test');
    expect(res.headers['content-type']).toEqual('application/fhir+json; charset=utf-8');
  });

  test('Post request should return application/fhir+json', async () => {
    app.post('/test', async (req: express.Request, res: express.Response) => {
      res.send({ data: 'test' });
    });
    const res = await requestWithSupertest.post('/test', {});
    expect(res.headers['content-type']).toEqual('application/fhir+json; charset=utf-8');
  });

  test('Post request should return application/json if user sent application/json', async () => {
    app.post('/test', async (req: express.Request, res: express.Response) => {
      res.send({ data: 'test' });
    });
    const res = await requestWithSupertest.post('/test', {}).set('Accept', 'application/json');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
  });
});
