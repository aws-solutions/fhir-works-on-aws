import { ReadResponseAuthorizedRequest } from '@aws/fhir-works-on-aws-interface';
import { SMARTHandler } from '../smartHandler';
import TestCaseUtil, { BaseCsvRow } from './testCaseUtil.test';
import * as testStubs from './testStubs';
import { convertNAtoUndefined } from './testStubs';

interface CsvRow extends BaseCsvRow {
  fhirServiceBaseUrl: string;
  matchMedicationRequest: boolean;
  unmatchCondition: boolean;
  matchPatient: boolean;
  unmatchPatient: boolean;
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
  './params/authorizeAndFilterReadResponse-params.csv',
  'authorizeAndFilterReadResponse'
);

const loadAndPrepareTestCases = (): any[] => {
  const testCases: any[] = [];
  const csv = testCaseUtil.loadTestCase(
    {
      fhirServiceBaseUrl: (s: string) => convertNAtoUndefined(s),
      unmatchPatient: (s: string) => convertNAtoUndefined(s) === undefined,
      matchPatient: (s: string) => convertNAtoUndefined(s) === undefined,
      matchMedicationRequest: (s: string) => convertNAtoUndefined(s) === undefined,
      unmatchCondition: (s: string) => convertNAtoUndefined(s) === undefined
    },
    true
  );
  csv.forEach((inputRow, index) => {
    const testCase: any = {};
    const row = inputRow.csvRow;
    const readResponseAndOperation = testStubs.getReadResponseAndOperation(
      row.matchMedicationRequest,
      row.matchPatient,
      row.unmatchCondition,
      row.unmatchPatient
    );
    testCase.testName = `Combo Test Row ${index}`;
    testCase.request = {
      ...readResponseAndOperation,
      userIdentity: inputRow.userIdentity,
      fhirServiceBaseUrl: testStubs.convertToBaseUrl(row.fhirServiceBaseUrl)
    };
    testCase.rawCsvRow = row;
    testCases.push([JSON.stringify(testCase, null, 2), testCase]);
  });
  return testCases;
};

describe('authorizeAndFilterReadResponse-combo', () => {
  const testResults: any[] = [];
  const keysToOutput: any[] = [
    { field: 'testName', title: 'Test Number' },
    { field: 'rawCsvRow.fhirUser', title: 'FHIR User' },
    { field: 'rawCsvRow.patientContext', title: 'Patient Context' },
    { field: 'rawCsvRow.fhirServiceBaseUrl', title: 'Base Url' },
    { field: 'rawCsvRow.unmatchPatient', title: 'Another Patient?' },
    { field: 'rawCsvRow.matchPatient', title: 'Current Patient?' },
    { field: 'rawCsvRow.matchMedicationRequest', title: 'MedicationRequest?' },
    { field: 'rawCsvRow.unmatchCondition', title: 'Another Condition?' },
    { field: 'previousTotal', title: 'Total Before Filter' },
    { field: 'finalTotal', title: 'Total After Filter' },
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
      testResult = await authZHandler.authorizeAndFilterReadResponse(
        <ReadResponseAuthorizedRequest>testCase.request
      );
      testResult = {
        ...testResult,
        previousTotal: testCase.request.readResponse.total,
        finalTotal: testResult.total
      };
      expect(testResult).toMatchSnapshot();
    } catch (e) {
      testResult = {
        errorMessage: (e as Error).message,
        previousTotal: testCase.request.readResponse.total,
        finalTotal: 0
      };
      expect(e).toMatchSnapshot();
    }
    testResults.push({ ...testCase, ...testResult });
  });
});
