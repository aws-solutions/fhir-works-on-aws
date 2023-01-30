"use strict";
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeFromField = void 0;
const fhirTypes = [
  "base64Binary",
  "boolean",
  "canonical",
  "code",
  "date",
  "dateTime",
  "decimal",
  "id",
  "instant",
  "integer",
  "markdown",
  "oid",
  "positiveInt",
  "string",
  "time",
  "unsignedInt",
  "uri",
  "url",
  "uuid",
  "Address",
  "Age",
  "Annotation",
  "Attachment",
  "CodeableConcept",
  "Coding",
  "ContactPoint",
  "Count",
  "Distance",
  "Duration",
  "HumanName",
  "Identifier",
  "Money",
  "Period",
  "Quantity",
  "Range",
  "Ratio",
  "Reference",
  "SampledData",
  "Signature",
  "Timing",
  "ContactDetail",
  "Contributor",
  "DataRequirement",
  "Expression",
  "ParameterDefinition",
  "RelatedArtifact",
  "TriggerDefinition",
  "UsageContext",
  "Dosage",
  "Meta",
];
const capitalizeFirstLetter = (string) => {
  return string[0].toUpperCase() + string.slice(1);
};
// eslint-disable-next-line import/prefer-default-export
function getTypeFromField(field) {
  return fhirTypes.find((t) => field.endsWith(capitalizeFirstLetter(t)));
}
exports.getTypeFromField = getTypeFromField;
//# sourceMappingURL=choiceDataTypes.js.map
