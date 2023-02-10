import { VerifyAccessTokenRequest } from '@aws/fhir-works-on-aws-interface';
import * as smartAuthorizationHelper from '../smartAuthorizationHelper';
import { SMARTHandler } from '../smartHandler';
import TestCaseUtil, { BaseCsvRow } from './testCaseUtil.test';
import * as testStubs from './testStubs';
import { convertNAtoUndefined } from './testStubs';

interface CsvRow extends BaseCsvRow {
  'BulkDataAuth.operation': string;
  'BulkDataAuth.exportType': string;
  id: string;
  vid: string;
  fhirServiceBaseUrl: string;
  'patient/Patient.read': string;
  'patient/*.read': string;
  'user/Patient.read': string;
  'user/*.read': string;
  'system/Patient.read': string;
  'system/*.read': string;
  isUserScopeAllowedForSystemExport: boolean;
}
const testCaseUtil = new TestCaseUtil<CsvRow>(
  './params/VerifyAccessToken-BulkDataAuth-params.csv',
  'verifyAccessToken-BulkDataAuth'
);

const loadAndPrepareTestCases = () => {
  const testCases: any[] = [];
  const csv = testCaseUtil.loadTestCase({
    isUserScopeAllowedForSystemExport: (s: string) => s === 'true',
    fhirServiceBaseUrl: (s: string) => convertNAtoUndefined(s)
  });

  csv.forEach((inputRow, index) => {
    const testCase: any = {};
    const row = inputRow.csvRow;
    const bulkDataAuth: any = {
      operation: row['BulkDataAuth.operation'],
      exportType: row['BulkDataAuth.exportType']
    };
    testCase.testName = `Combo Test Row ${index}`;
    testCase.request = {
      accessToken: 'fake',
      operation: row.operation,
      resourceType: row.resourceType || '',
      bulkDataAuth,
      fhirServiceBaseUrl: testStubs.convertToBaseUrl(row.fhirServiceBaseUrl)
    };
    testCase.decodedAccessToken = {
      ...testStubs.baseAccessNoScopes,
      scp: testCaseUtil.getScopesFromResult(row),
      fhirUser: testStubs.getFhirUserType(row.fhirUser)
    };
    testCase.isUserScopeAllowedForSystemExport = row.isUserScopeAllowedForSystemExport;
    if (row.patientContext) {
      testCase.decodedAccessToken = {
        ...testCase.decodedAccessToken,
        ...testStubs.patientContext
      };
    }
    testCases.push([JSON.stringify(testCase, null, 2), testCase]);
  });
  return testCases;
};

describe('verifyAccessToken-BulkDataAuth-combo', () => {
  const testResults: any[] = [];
  const keysToOutput: any[] = [
    { field: 'testName', title: 'Test Number' },
    { field: 'request.operation', title: 'Operation' },
    { field: 'request.bulkDataAuth.operation', title: 'Bulk Operation' },
    { field: 'request.bulkDataAuth.exportType', title: 'Bulk Export Type' },
    { field: 'isUserScopeAllowedForSystemExport', title: 'User Scope Allowed' },
    { field: 'request.resourceType', title: ' Resource' },
    { field: 'request.fhirServiceBaseUrl', title: 'Base URL' },
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
  const authZHandlerUserScope: SMARTHandler = new SMARTHandler(
    authZConfig,
    testStubs.apiUrl,
    '4.0.1',
    undefined,
    undefined,
    true
  );
  const authZHandlerNoUserScope: SMARTHandler = new SMARTHandler(
    authZConfig,
    testStubs.apiUrl,
    '4.0.1',
    undefined,
    undefined,
    false
  );
  test.each(testCases)('CASE: %s', async (testCaseString, testCase) => {
    // Handling mocking modules when code is in TS: https://stackoverflow.com/a/60693903/14310364
    jest
      .spyOn(smartAuthorizationHelper, 'verifyJwtToken')
      .mockImplementation(() => Promise.resolve(testCase.decodedAccessToken));
    let testResult: any;
    const authZHandler = testCase.isUserScopeAllowedForSystemExport
      ? authZHandlerUserScope
      : authZHandlerNoUserScope;
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
