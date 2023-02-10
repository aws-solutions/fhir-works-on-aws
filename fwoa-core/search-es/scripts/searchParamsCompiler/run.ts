/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/*
This scripts generates the JSON files at src/schema. Before running the script download the JSON FHIR definition package and copy
the search-parameters.json file into this directory.

You can download the latest FHIR definition from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html

It is recommended to install ts-node to execute .ts files in the command line
> npm install -g ts-node

If you are modifying the grammar at reducedFHIRPath.ne you need to compile it. The nearley compiler needs to be installed separately:
> npm install -g nearley
> nearleyc reducedFHIRPath.ne -o reducedFHIRPath.ts

Run the script:
> ts-node run.ts <fhirVersion>
 */

import * as fs from 'fs';
import { SearchImplementationGuides } from '../../src/implementationGuides';
import getComponentLogger from '../../src/loggerBuilder';

const logger = getComponentLogger();

const readSearchParamsFile = (path: string) => {
  const data = JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
  return data.entry.map((x: any) => x.resource);
};

const run = async () => {
  const args = process.argv.slice(2);
  if (!args[0]) {
    logger.error('Error. Missing fhirVersion parameter');
    logger.error('Usage: ts-node run.ts <fhirVersion>');
  }
  const fhirVersion = args[0];
  const searchParams = readSearchParamsFile('search-parameters.json');
  const compiledSearchParams = await SearchImplementationGuides.compile(searchParams);

  fs.writeFileSync(
    `../../src/schema/compiledSearchParameters.${fhirVersion}.json`,
    JSON.stringify(compiledSearchParams)
  );
};

run().then(logger.info).catch(logger.error);
