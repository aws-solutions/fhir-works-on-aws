/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { getFhirClient, getFhirClientSMART } from './migrationUtils';
import ExportHelper from './exportHelper';
import { writeFileSync } from 'fs';

const ISOStringRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/g;

if (process.argv.length < 3) {
  throw new Error('Invalid arguments. Usage: ts-node migrationExport.ts <boolean> <opt: ISO timestamp>');
}
// collect optional arguments
let smartClient = Boolean(process.argv[3]);
let since: string;
if (process.argv.length >= 4) {
  since = process.argv[3];
  if (!ISOStringRegex.test(since)) {
    throw new Error('Provided `since` parameter is not in correct format');
  }
}

async function startExport() {
  const fhirClient = await (smartClient ? getFhirClientSMART() : getFhirClient());
  const exportHelper = new ExportHelper(fhirClient);

  const exportJobUrl = await exportHelper.startExportJob({ since });
  const response = await exportHelper.getExportStatus(exportJobUrl);

  return response;
}

startExport()
  .then((response) => {
    console.log('successfully completed export.');
    writeFileSync('exportResults.txt', response.toString());
    console.log('results written to exportResults.txt');
  })
  .catch((error) => {
    console.error('Error:', error);
  });
