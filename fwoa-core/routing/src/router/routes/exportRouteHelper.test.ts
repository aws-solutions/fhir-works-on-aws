// eslint-disable-next-line import/no-extraneous-dependencies
import { FhirVersion, BASE_R4_RESOURCES } from '@aws/fhir-works-on-aws-interface';
import { mockRequest, mockResponse } from 'mock-req-res';
import { utcTimeRegExp } from '../../regExpressions';
import ExportRouteHelper from './exportRouteHelper';

describe('buildInitiateExportRequest', () => {
  const r4Version: FhirVersion = '4.0.1';
  const mockedAllowedResourceTypes = BASE_R4_RESOURCES;
  const mockedResponse = mockResponse({
    locals: {
      userIdentity: { sub: 'abcd-1234' },
      requestContext: { verb: 'GET', hostname: 'test.acme.com' },
      serverUrl: 'http://test.acme.com'
    }
  });

  test('System Export request with query parameters', () => {
    const req = mockRequest({
      query: {
        _outputFormat: 'ndjson',
        _since: '2020-09-01T00:00:00Z',
        _type: 'Patient'
      },
      headers: {
        prefer: 'respond-async'
      }
    });

    const actualInitiateExportRequest = ExportRouteHelper.buildInitiateExportRequest(
      req,
      mockedResponse,
      'system',
      mockedAllowedResourceTypes,
      r4Version
    );
    expect(actualInitiateExportRequest).toMatchObject({
      requesterUserId: 'abcd-1234',
      transactionTime: expect.stringMatching(utcTimeRegExp),
      exportType: 'system',
      outputFormat: 'ndjson',
      since: '2020-09-01T00:00:00.000Z',
      type: 'Patient',
      serverUrl: 'http://test.acme.com',
      allowedResourceTypes: mockedAllowedResourceTypes,
      fhirVersion: r4Version
    });
  });

  test('System Export request with invalid _since query parameter', async () => {
    const req = mockRequest({
      query: {
        _outputFormat: 'ndjson',
        _since: '/2020-09-01T00:00:00Z',
        _type: 'Patient'
      },
      headers: {
        prefer: 'respond-async'
      }
    });
    await expect(() =>
      ExportRouteHelper.buildInitiateExportRequest(
        req,
        mockedResponse,
        'system',
        BASE_R4_RESOURCES,
        r4Version
      )
    ).toThrowError(
      "Query '_since' should be in the FHIR Instant format: YYYY-MM-DDThh:mm:ss.sss+zz:zz (e.g. 2015-02-07T13:28:17.239+02:00 or 2017-01-01T00:00:00Z)"
    );
  });

  test('Group Export request with query parameters', () => {
    const req = mockRequest({
      query: {
        _outputFormat: 'ndjson',
        _since: '2020-09-01T00:00:00.000Z',
        _type: 'Patient'
      },
      params: {
        id: '1'
      }
    });

    const actualInitiateExportRequest = ExportRouteHelper.buildInitiateExportRequest(
      req,
      mockedResponse,
      'group',
      mockedAllowedResourceTypes,
      r4Version
    );
    expect(actualInitiateExportRequest).toMatchObject({
      requesterUserId: 'abcd-1234',
      transactionTime: expect.stringMatching(utcTimeRegExp),
      exportType: 'group',
      outputFormat: 'ndjson',
      since: '2020-09-01T00:00:00.000Z',
      type: 'Patient',
      groupId: '1',
      serverUrl: 'http://test.acme.com',
      allowedResourceTypes: mockedAllowedResourceTypes,
      fhirVersion: r4Version
    });
  });

  test('Group Export request without query parameters', () => {
    const req = mockRequest({
      params: {
        id: '1'
      }
    });

    const actualInitiateExportRequest = ExportRouteHelper.buildInitiateExportRequest(
      req,
      mockedResponse,
      'group',
      mockedAllowedResourceTypes,
      r4Version
    );
    expect(actualInitiateExportRequest).toMatchObject({
      requesterUserId: 'abcd-1234',
      exportType: 'group',
      outputFormat: undefined,
      since: undefined,
      type: undefined,
      groupId: '1',
      serverUrl: 'http://test.acme.com',
      allowedResourceTypes: mockedAllowedResourceTypes,
      fhirVersion: r4Version
    });
  });

  test('Group Export request with non-supported outputFormat', () => {
    expect.hasAssertions();
    const req = mockRequest({
      query: {
        _outputFormat: 'json'
      },
      params: {
        id: '1'
      }
    });

    try {
      ExportRouteHelper.buildInitiateExportRequest(
        req,
        mockedResponse,
        'group',
        mockedAllowedResourceTypes,
        r4Version
      );
    } catch (e) {
      expect((e as any).name).toEqual('BadRequestError');
      expect((e as any).message).toEqual('We only support exporting resources into ndjson formatted file');
    }
  });
  test('Group Export request with non-supported since', () => {
    expect.hasAssertions();
    const req = mockRequest({
      query: {
        _since: '2020-10-12'
      },
      params: {
        id: '1'
      }
    });

    try {
      ExportRouteHelper.buildInitiateExportRequest(
        req,
        mockedResponse,
        'group',
        mockedAllowedResourceTypes,
        r4Version
      );
    } catch (e) {
      expect((e as any).name).toEqual('BadRequestError');
      expect((e as any).message).toEqual(
        "Query '_since' should be in the FHIR Instant format: YYYY-MM-DDThh:mm:ss.sss+zz:zz (e.g. 2015-02-07T13:28:17.239+02:00 or 2017-01-01T00:00:00Z)"
      );
    }
  });
});

describe('getExportUrl', () => {
  describe('All params', () => {
    const baseUrl = 'http://API_URL.com';
    const outputFormat = 'ndjson';
    const since = '2020-09-02T00:00:00-05:00';
    const type = 'Patient';
    const queryParams = { outputFormat, since, type };
    const groupId = '12';
    test('System', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'system', queryParams, groupId);
      expect(result).toEqual(
        'http://api_url.com/$export?_outputFormat=ndjson&_since=2020-09-02T00%3A00%3A00-05%3A00&_type=Patient'
      );
    });
    test('Patient', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'patient', queryParams, groupId);
      expect(result).toEqual(
        'http://api_url.com/Patient/$export?_outputFormat=ndjson&_since=2020-09-02T00%3A00%3A00-05%3A00&_type=Patient'
      );
    });
    test('Group', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'group', queryParams, groupId);
      expect(result).toEqual(
        'http://api_url.com/Group/12/$export?_outputFormat=ndjson&_since=2020-09-02T00%3A00%3A00-05%3A00&_type=Patient'
      );
    });
  });
  describe('Subset params: only type', () => {
    const baseUrl = 'http://API_URL.com';
    const type = 'Patient';
    const queryParams = { type };
    const groupId = '12';
    test('System', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'system', queryParams, groupId);
      expect(result).toEqual('http://api_url.com/$export?_type=Patient');
    });
    test('Patient', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'patient', queryParams, groupId);
      expect(result).toEqual('http://api_url.com/Patient/$export?_type=Patient');
    });
    test('Group', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'group', queryParams, groupId);
      expect(result).toEqual('http://api_url.com/Group/12/$export?_type=Patient');
    });
  });
  describe('Subset params: only outputFormat and since', () => {
    const baseUrl = 'http://API_URL.com';
    const outputFormat = 'ndjson';
    const since = '2020-09-02T00:00:00-05:00';
    const queryParams = { outputFormat, since };
    const groupId = '12';
    test('System', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'system', queryParams, groupId);
      expect(result).toEqual(
        'http://api_url.com/$export?_outputFormat=ndjson&_since=2020-09-02T00%3A00%3A00-05%3A00'
      );
    });
    test('Patient', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'patient', queryParams, groupId);
      expect(result).toEqual(
        'http://api_url.com/Patient/$export?_outputFormat=ndjson&_since=2020-09-02T00%3A00%3A00-05%3A00'
      );
    });
    test('Group', () => {
      const result = ExportRouteHelper.getExportUrl(baseUrl, 'group', queryParams, groupId);
      expect(result).toEqual(
        'http://api_url.com/Group/12/$export?_outputFormat=ndjson&_since=2020-09-02T00%3A00%3A00-05%3A00'
      );
    });
  });
});
