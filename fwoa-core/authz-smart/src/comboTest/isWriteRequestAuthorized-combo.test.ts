import { WriteRequestAuthorizedRequest } from '@aws/fhir-works-on-aws-interface';
import { SMARTHandler } from '../smartHandler';
import TestCaseUtil, { BaseCsvRow } from './testCaseUtil.test';
import * as testStubs from './testStubs';
import { convertNAtoUndefined, ResourceBodyDescription } from './testStubs';

interface CsvRow extends BaseCsvRow {
  resourceBody: ResourceBodyDescription;
  fhirServiceBaseUrl: string;
  'patient/Patient.read': string;
  'patient/Observation.write': string;
  'patient/Observation.read': string;
  'patient/Condition.write': string;
  'user/Patient.write': string;
  'user/Patient.read': string;
  'user/Observation.write': string;
  'user/Condition.write': string;
  'system/Patient.write': string;
  'system/Observation.write': string;
  'system/Condition.write': string;
}

const testCaseUtil = new TestCaseUtil<CsvRow>(
  './params/isWriteRequestAuthorized-params.csv',
  'isWriteRequestAuthorized'
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
      operation: row.operation,
      resourceBody: testStubs.getResourceBody(row.resourceBody),
      fhirServiceBaseUrl: testStubs.convertToBaseUrl(row.fhirServiceBaseUrl)
    };
    testCase.rawCsvRow = row;
    testCases.push([JSON.stringify(testCase, null, 2), testCase]);
  });
  return testCases;
};

describe('isWriteRequestAuthorized-combo', () => {
  const testResults: any[] = [];
  const keysToOutput: any[] = [
    { field: 'testName', title: 'Test Number' },
    { field: 'request.operation', title: 'Operation' },
    { field: 'rawCsvRow.fhirUser', title: 'FHIR User' },
    { field: 'rawCsvRow.patientContext', title: 'Patient Context' },
    { field: 'rawCsvRow.resourceBody', title: 'Resource Body' },
    { field: 'rawCsvRow.fhirServiceBaseUrl', title: 'Base Url' },
    { field: 'errorMessage', title: 'Error' },
    { field: 'request.userIdentity.usableScopes', title: 'Usable Scopes' },
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
    undefined
  );

  test.each(testCases)('CASE: %s', async (testCaseString, testCase) => {
    let testResult: any;
    try {
      testResult = await authZHandler.isWriteRequestAuthorized(
        <WriteRequestAuthorizedRequest>testCase.request
      );
      expect(testResult).toMatchSnapshot();
    } catch (e) {
      testResult = { errorMessage: (e as Error).message };
      expect(e).toMatchSnapshot();
    }
    testResults.push({ ...testCase, ...testResult });
  });
});
