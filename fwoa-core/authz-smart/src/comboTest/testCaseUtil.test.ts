import { writeFileSync } from 'fs';
import * as path from 'path';
import { SystemOperation, TypeOperation } from '@aws/fhir-works-on-aws-interface';
import { json2csvAsync } from 'json-2-csv';
import { UserIdentity } from '../smartConfig';
import { FHIR_PATIENT_SCOPE_REGEX, FHIR_USER_SCOPE_REGEX, filterOutUnusableScope } from '../smartScopeHelper';
import {
  convertNAtoUndefined,
  getFhirUserObject,
  getFhirUserType,
  scopeRule,
  getResourceType,
  ResourceBodyDescription
} from './testStubs';

// eslint-disable-next-line import/no-extraneous-dependencies
const { load } = require('csv-load-sync');

const OUTPUT_FOLDER_NAME = 'output';

export interface BaseCsvRow {
  operation: string;
  fhirUser?: string;
  patientContext?: string;
  resourceType?: string;
  resourceBody?: ResourceBodyDescription;
}

export default class TestCaseUtil<CsvRow extends BaseCsvRow> {
  private readonly csvFilePath: string;

  private readonly outputFilePath: string;

  constructor(csvFilePath: string, outputFilePath: string) {
    this.csvFilePath = csvFilePath;
    this.outputFilePath = outputFilePath;
  }

  loadTestCase(
    csvConvertRule?: any,
    useDefaultResourceType?: boolean
  ): { csvRow: CsvRow; userIdentity: UserIdentity }[] {
    const csvRow: CsvRow[] = load(path.resolve(__dirname, this.csvFilePath), {
      convert: {
        resourceType: (s: string) => convertNAtoUndefined(s),
        fhirUser: (s: string) => convertNAtoUndefined(s),
        patientContext: (s: string) => convertNAtoUndefined(s),
        ...csvConvertRule
      }
    });
    const testCases: { csvRow: CsvRow; userIdentity: UserIdentity }[] = [];
    csvRow.forEach((row) => {
      const scopes = this.getScopesFromResult(row);
      const userIdentity: UserIdentity = {
        scopes
      };

      const fhirUserClaim = getFhirUserType(row.fhirUser);
      const patientContextClaim = getFhirUserType(row.patientContext);

      let resourceType = row.resourceType ? row.resourceType : getResourceType(row.resourceBody);
      // This is setting the default resourceType to Patient for the specific case
      // of performing a test search on only one resource
      if (useDefaultResourceType && !resourceType) {
        resourceType = 'Patient';
      }
      const operation = row.operation ? row.operation : 'transaction';

      const usableScopes = filterOutUnusableScope(
        scopes,
        scopeRule(),
        operation as TypeOperation | SystemOperation,
        false,
        resourceType,
        undefined,
        patientContextClaim,
        fhirUserClaim
      );

      if (fhirUserClaim && usableScopes.some((scope) => FHIR_USER_SCOPE_REGEX.test(scope))) {
        userIdentity.fhirUserObject = getFhirUserObject(row.fhirUser);
      }
      if (patientContextClaim && usableScopes.some((scope) => FHIR_PATIENT_SCOPE_REGEX.test(scope))) {
        userIdentity.patientLaunchContext = getFhirUserObject(row.patientContext);
      }
      userIdentity.usableScopes = usableScopes;
      testCases.push({ csvRow: row, userIdentity });
    });
    return testCases;
  }

  // eslint-disable-next-line class-methods-use-this
  async writeTestResultsToCsv(
    testResults: { testCase: any; testResult: any }[],
    keysToOutput: { field: string; title: string | undefined }[]
  ) {
    if (process.env.GENERATE_CSV_FOR_REVIEW !== 'true') {
      return;
    }

    const csv = await json2csvAsync(testResults, { keys: keysToOutput });
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(path.join(__dirname, `./${OUTPUT_FOLDER_NAME}/${this.outputFilePath}.csv`), csv, {
      flag: 'w'
    });
  }

  getScopesFromResult = (result: CsvRow) => {
    const scopes: string[] = [];
    Object.entries(result).forEach(([key, value]) => {
      if (
        (key.startsWith('system/') || key.startsWith('user/') || key.startsWith('patient/')) &&
        value === key
      ) {
        scopes.push(key);
      }
    });
    return scopes;
  };
}
