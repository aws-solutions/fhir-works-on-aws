import { AuthorizationBundleRequest } from '@aws/fhir-works-on-aws-interface';
import { SMARTHandler } from '../smartHandler';
import TestCaseUtil, { BaseCsvRow } from './testCaseUtil.test';
import * as testStubs from './testStubs';
import { convertNAtoUndefined } from './testStubs';

interface CsvRow extends BaseCsvRow {
  fhirServiceBaseUrl: string;
  'patient/Patient.read': string;
  'patient/Patient.write': string;
  'patient/Observation.read': string;
  'patient/Observation.write': string;
  'patient/Condition.read': string;
  'patient/Condition.write': string;
  'user/Patient.read': string;
  'user/Patient.write': string;
  'user/Observation.read': string;
  'user/Observation.write': string;
  'user/Condition.read': string;
  'user/Condition.write': string;
  'system/Patient.read': string;
  'system/Patient.write': string;
  'system/Observation.read': string;
  'system/Observation.write': string;
  'system/Condition.read': string;
  'system/Condition.write': string;
}
const testCaseUtil = new TestCaseUtil<CsvRow>(
  './params/isBundleRequestAuthorized-params.csv',
  'isBundleRequestAuthorized'
);

const loadAndPrepareTestCases = () => {
  const testCases: any[] = [];
  const csv = testCaseUtil.loadTestCase({
    fhirServiceBaseUrl: (s: string) => convertNAtoUndefined(s)
  });

  const requests = testStubs.generateBundle();

  csv.forEach((inputRow, index) => {
    const testCase: any = {};
    const row = inputRow.csvRow;
    testCase.testName = `Combo Test Row ${index}`;

    testCase.filteredScopes = inputRow.userIdentity.scopes.filter(
      (scope: string) =>
        (inputRow.userIdentity.patientLaunchContext && scope.startsWith('patient/')) ||
        (inputRow.userIdentity.fhirUserObject && scope.startsWith('user/')) ||
        scope.startsWith('system/')
    );
    testCase.request = {
      userIdentity: inputRow.userIdentity,
      fhirServiceBaseUrl: testStubs.convertToBaseUrl(row.fhirServiceBaseUrl),
      requests
    };
    testCase.rawCsvRow = inputRow.csvRow;
    testCases.push([JSON.stringify(testCase, null, 2), testCase]);
  });
  return testCases;
};

describe('isBundleRequestAuthorized-BulkDataAuth-combo', () => {
  const testResults: any[] = [];
  const keysToOutput: any[] = [
    { field: 'testName', title: 'Test Number' },
    { field: 'rawCsvRow.fhirUser', title: 'FHIR User' },
    { field: 'rawCsvRow.patientContext', title: 'Patient Context' },
    { field: 'rawCsvRow.fhirServiceBaseUrl', title: 'Base Url' },
    { field: 'message', title: 'Error' },
    { field: 'filteredScopes', title: 'Filtered Scopes' },
    { field: 'request.userIdentity.scopes', title: 'Scopes' }
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
    false
  );
  test.each(testCases)('CASE: %s', async (testCaseString, testCase) => {
    let testResult: any;
    try {
      testResult = await authZHandler.isBundleRequestAuthorized(<AuthorizationBundleRequest>testCase.request);
      expect(testResult).toMatchSnapshot();
    } catch (e) {
      testResult = { message: (e as Error).message };
      expect(e).toMatchSnapshot();
    }
    testResults.push({ ...testCase, ...testResult });
  });
});
