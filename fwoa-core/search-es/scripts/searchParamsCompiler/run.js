"use strict";
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
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
const fs = __importStar(require("fs"));
const implementationGuides_1 = require("../../src/implementationGuides");
const loggerBuilder_1 = __importDefault(require("../../src/loggerBuilder"));
const logger = (0, loggerBuilder_1.default)();
const readSearchParamsFile = (path) => {
  const data = JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
  return data.entry.map((x) => x.resource);
};
const run = async () => {
  const args = process.argv.slice(2);
  if (!args[0]) {
    logger.error("Error. Missing fhirVersion parameter");
    logger.error("Usage: ts-node run.ts <fhirVersion>");
  }
  const fhirVersion = args[0];
  const searchParams = readSearchParamsFile("search-parameters.json");
  const compiledSearchParams =
    await implementationGuides_1.SearchImplementationGuides.compile(
      searchParams
    );
  fs.writeFileSync(
    `../../src/schema/compiledSearchParameters.${fhirVersion}.json`,
    JSON.stringify(compiledSearchParams)
  );
};
run().then(logger.info).catch(logger.error);
//# sourceMappingURL=run.js.map
