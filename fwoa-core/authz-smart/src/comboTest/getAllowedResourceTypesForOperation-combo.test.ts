import { AllowedResourceTypesForOperationRequest } from '@aws/fhir-works-on-aws-interface';
import { SMARTHandler } from '../smartHandler';
import TestCaseUtil, { BaseCsvRow } from './testCaseUtil.test';
import * as testStubs from './testStubs';
import { convertNAtoUndefined } from './testStubs';

interface CsvRow extends BaseCsvRow {
  fhirServiceBaseUrl: string;
  id: string;
  'patient/Patient.read': string;
  'patient/Patient.*': string;
  'patient/Observation.read': string;
  'patient/Observation.*': string;
  'patient/Binary.read': string;
  'patient/Binary.*': string;
  'user/Patient.read': string;
  'user/Patient.*': string;
  'user/Observation.read': string;
  'user/Observation.*': string;
  'user/Binary.read': string;
  'user/Binary.*': string;
  'system/Patient.read': string;
  'system/Patient.*': string;
  'system/Observation.read': string;
  'system/Observation.*': string;
  'system/Binary.read': string;
  'system/Binary.*': string;
}

const testCaseUtil = new TestCaseUtil<CsvRow>(
  './params/getAllowedResourceTypesForOperation-params.csv',
  'GetAllowedResourceTypesForOperation'
);

const loadAndPrepareTestCases = (): any[] => {
  const testCases: any[] = [];
  const csv = testCaseUtil.loadTestCase({
    fhirServiceBaseUrl: (s: string) => convertNAtoUndefined(s)
  });
  csv.forEach((inputRow, index) => {
    const testCase: any = {};
    const row = inputRow.csvRow;
    testCase.testName = `Combo Test Row ${index}`;
    testCase.request = {
      userIdentity: inputRow.userIdentity,
      operation: row.operation
    };
    testCase.rawCsvRow = row;
    testCases.push([JSON.stringify(testCase, null, 2), testCase]);
  });
  return testCases;
};

describe('getAllowedResourceTypesForOperation-combo', () => {
  const testResults: any[] = [];
  const keysToOutput: any[] = [
    { field: 'testName', title: 'Test Number' },
    { field: 'request.operation', title: 'Operation' },
    { field: 'request.userIdentity.scopes', title: ' Scopes' },
    { field: 'testResult', title: 'Allowed Resources' }
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
    undefined
  );

  test.each(testCases)('CASE: %s', async (testCaseString, testCase) => {
    let testResult: any;
    try {
      testResult = await authZHandler.getAllowedResourceTypesForOperation(
        <AllowedResourceTypesForOperationRequest>testCase.request
      );
      expect(testResult).toMatchSnapshot();
    } catch (e) {
      testResult = { message: (e as Error).message };
      expect(e).toMatchSnapshot();
    }
    testResults.push({ ...testCase, testResult });
  });
});
