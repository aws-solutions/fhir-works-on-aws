import { VerifyAccessTokenRequest } from '@aws/fhir-works-on-aws-interface';
import * as smartAuthorizationHelper from '../smartAuthorizationHelper';
import { SMARTHandler } from '../smartHandler';
import TestCaseUtil, { BaseCsvRow } from './testCaseUtil.test';
import * as testStubs from './testStubs';
import { convertNAtoUndefined } from './testStubs';

interface CsvRow extends BaseCsvRow {
  id: string;
  vid: string;
  fhirServiceBaseUrl: string;
  'patient/Patient.read': string;
  'patient/Patient.write': string;
  'patient/MedicationRequest.read': string;
  'patient/MedicationRequest.write': string;
  'patient/Binary.read': string;
  'patient/Binary.write': string;
  'user/Patient.read': string;
  'user/Patient.write': string;
  'user/MedicationRequest.read': string;
  'user/MedicationRequest.write': string;
  'user/Binary.read: string': string;
  'user/Binary.write': string;
  'system/Patient.read': string;
  'system/Patient.write': string;
  'system/MedicationRequest.read': string;
  'system/MedicationRequest.write': string;
  'system/Binary.read': string;
  'system/Binary.write': string;
}

const testCaseUtil = new TestCaseUtil<CsvRow>(
  './params/VerifyAccessToken-NoBulkDataAuth-params.csv',
  'verifyAccessToken'
);

const loadAndPrepareTestCases = (): any[] => {
  const testCases: any[] = [];
  const csv = testCaseUtil.loadTestCase({
    isUserScopeAllowedForSystemExport: (s: string) => s === 'true',
    fhirServiceBaseUrl: (s: string) => convertNAtoUndefined(s)
  });
  csv.forEach((inputRow, index) => {
    const result: any = {};

    const row = inputRow.csvRow;
    result.testName = `Combo Test Row ${index}`;
    result.request = {
      accessToken: 'fake',
      operation: row.operation,
      resourceType: row.resourceType || '',
      bulkDataAuth: undefined,
      fhirServiceBaseUrl: testStubs.convertToBaseUrl(row.fhirServiceBaseUrl)
    };
    result.decodedAccessToken = {
      ...testStubs.baseAccessNoScopes,
      scp: testCaseUtil.getScopesFromResult(row),
      fhirUser: testStubs.getFhirUserType(row.fhirUser)
    };
    if (row.patientContext) {
      result.decodedAccessToken = {
        ...result.decodedAccessToken,
        ...testStubs.patientContext
      };
    }
    testCases.push([JSON.stringify(result, null, 2), result]);
  });
  return testCases;
};

describe('verifyAccessToken-combo', () => {
  const testResults: any[] = [];
  const keysToOutput: any[] = [
    { field: 'testName', title: 'Test Number' },
    { field: 'request.operation', title: 'Operation' },
    { field: 'request.resourceType', title: ' Resource' },
    { field: 'decodedAccessToken.fhirUser', title: 'fhirUser' },
    { field: 'decodedAccessToken.ext.launch_response_patient', title: 'Patient in Context' },
    { field: 'message', title: 'Error' },
    { field: 'usableScopes', title: 'Usable Scopes' },
    { field: 'decodedAccessToken.scp', title: 'Scopes' }
  ];

  afterAll(async () => {
    await testCaseUtil.writeTestResultsToCsv(testResults, keysToOutput);
  });
  const testCases = loadAndPrepareTestCases();
  const authZConfig = testStubs.baseAuthZConfig();
  const authZHandler: SMARTHandler = new SMARTHandler(
    authZConfig,
    testStubs.apiUrl,
    '4.0.1',
    undefined,
    undefined,
    true
  );

  test.each(testCases)('CASE: %s', async (testCaseString, testCase) => {
    // Handling mocking modules when code is in TS: https://stackoverflow.com/a/60693903/14310364
    jest
      .spyOn(smartAuthorizationHelper, 'verifyJwtToken')
      .mockImplementation(() => Promise.resolve(testCase.decodedAccessToken));
    let testResult: any;
    try {
      testResult = await authZHandler.verifyAccessToken(<VerifyAccessTokenRequest>testCase.request);
      expect(testResult).toMatchSnapshot();
    } catch (e) {
      testResult = { message: (e as Error).message };
      expect(e).toMatchSnapshot();
    }
    testResults.push({ ...testCase, ...testResult });
  });
});
