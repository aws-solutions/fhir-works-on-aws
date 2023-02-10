/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/*
This scripts generates the JSON files at src/schema. Before running the script download the JSON FHIR definition package and copy
the profiles-resources.json file into this directory.

It is recommended to install ts-node to execute .ts files in the command line
> npm install -g ts-node

You can download the latest FHIR definition from https://www.hl7.org/fhir/downloads.html or find older FHIR versions at http://hl7.org/fhir/directory.html

Run the script:
> cd to this current directory
> ts-node generateResourceReferenceMatrixFile.ts <fhirVersion>
*/

import * as fs from 'fs';
import getComponentLogger from '../src/loggerBuilder';

const logger = getComponentLogger();

interface Type {
  code: string;
  targetProfile: string[];
}
interface Element {
  id: string;
  type: Type[];
}

interface PathMap {
  [sourceResourceType: string]: { [requestorResourceType: string]: string[] };
}

const readProfileFile = (path: string): any[] => {
  const data = JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
  return data.entry.map((x: any) => x.resource);
};

const compile = (resources: any[]) => {
  const filter = resources.filter(
    (resource) => resource.baseDefinition === 'http://hl7.org/fhir/StructureDefinition/DomainResource'
  );

  const pathMap: PathMap = {};
  filter.forEach((resource) => {
    return resource.snapshot.element
      .filter((element: Element) => !!element.type)
      .forEach((element: Element) => {
        return element.type
          .filter((type: Type) => type.code === 'Reference' && !!type.targetProfile)
          .forEach((type: Type) => {
            const sourceType = resource.type;
            const path = element.id.replace(`${resource.type}.`, '').replace('[x]', 'Reference');
            // R3; targetProfile == string / R4; targetProfile == array
            let profiles = type.targetProfile;
            if (!Array.isArray(profiles)) {
              profiles = [profiles];
            }
            profiles.forEach((target: string) => {
              const requestorType = target.replace('http://hl7.org/fhir/StructureDefinition/', '');
              if (!pathMap[sourceType]) {
                pathMap[sourceType] = {};
              }
              if (!pathMap[sourceType][requestorType]) {
                pathMap[sourceType][requestorType] = [];
              }
              pathMap[sourceType][requestorType].push(path);
            });
          });
      });
  });

  return pathMap;
};

const run = async () => {
  const args = process.argv.slice(2);
  if (!args[0]) {
    logger.error('Error. Missing fhirVersion parameter');
    logger.error('Usage: ts-node run.ts <fhirVersion>');
  }
  const fhirVersion = args[0];
  if (!fhirVersion.startsWith('4') || fhirVersion.startsWith('3')) {
    logger.error('*******************************');
    logger.error('this script was only tested with base STU3 & R4 profiles');
    logger.error(`you are attempting to use ${fhirVersion} proceed with caution`);
    logger.error('*******************************');
  }
  logger.info('reading file');
  const resources = readProfileFile(`${fhirVersion}-profiles-resources.json`);
  logger.info('compiling file');
  const pathMap = compile(resources);
  logger.info('writing compiled output');
  fs.writeFileSync(
    `../src/schema/fhirResourceReferencesMatrix.v${fhirVersion}.json`,
    JSON.stringify(pathMap)
  );
};

run().then(logger.info).catch(logger.error);
