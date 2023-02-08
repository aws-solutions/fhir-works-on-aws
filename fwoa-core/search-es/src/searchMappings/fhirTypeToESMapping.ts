/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

/** ************************************
 * Primitive Types
 ************************************ */

const STRING_MAPPING = {
  type: 'text',
  fields: {
    keyword: {
      type: 'keyword',
      ignore_above: 256
    }
  }
};

const KEYWORD_MAPPING = {
  type: 'keyword'
};

const DOUBLE_MAPPING = {
  type: 'float'
};

const INTEGER_MAPPING = {
  type: 'long'
};

const DATE_MAPPING = {
  type: 'date'
};

const BOOLEAN_MAPPING = {
  type: 'boolean'
};

/** ************************************
 * Complex Types
 ************************************ */

/**
 * https://www.hl7.org/fhir/datatypes.html#CodeableConcept
 */
const codeableConceptMapping = {
  properties: {
    coding: {
      properties: {
        code: STRING_MAPPING,
        display: STRING_MAPPING,
        system: STRING_MAPPING
      }
    },
    text: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#Coding
 */
const codingMapping = {
  properties: {
    code: STRING_MAPPING,
    system: STRING_MAPPING,
    display: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#contactpoint
 */
const contactPointMapping = {
  properties: {
    system: STRING_MAPPING,
    value: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#identifier
 */
const identifierMapping = {
  properties: {
    system: STRING_MAPPING,
    value: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#quantity
 */
const quantityMapping = {
  properties: {
    value: DOUBLE_MAPPING,
    system: STRING_MAPPING,
    code: STRING_MAPPING,
    unit: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#Money
 * https://www.hl7.org/fhir/STU3/datatypes.html#Money
 *
 * Money was a specialization of Quantity in STU3 and it is a type in R4.
 * We simply index it as Quantity as it is compatible with the R4 definition
 */
const moneyMapping = quantityMapping;

/**
 * https://www.hl7.org/fhir/datatypes.html#period
 */
const periodMapping = {
  properties: {
    end: DATE_MAPPING,
    start: DATE_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#range
 */
const rangeMapping = {
  properties: {
    low: quantityMapping,
    high: quantityMapping
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#timing
 * Note from the FHIR spec: The specified scheduling details are ignored and only the outer limits matter.
 * This is to keep the server load processing queries reasonable. https://www.hl7.org/fhir/search.html#date
 */
const timingMapping = {
  properties: {
    repeat: {
      properties: {
        boundsRange: rangeMapping,
        boundsPeriod: periodMapping
      }
    }
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#sampleddata
 * Normative Candidate Note: This DataType is not normative - it is still undergoing Trial Use while more experience is gathered.
 * We index all fields since usage may change quickly
 */
const sampledDataMapping = {
  properties: {
    origin: quantityMapping,
    period: DOUBLE_MAPPING,
    factor: DOUBLE_MAPPING,
    lowerLimit: DOUBLE_MAPPING,
    upperLimit: DOUBLE_MAPPING,
    dimensions: INTEGER_MAPPING,
    data: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/references.html#Reference
 */
const referenceMapping = {
  properties: {
    reference: STRING_MAPPING,
    type: STRING_MAPPING,
    identifier: identifierMapping
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#address
 */
const addressMapping = {
  properties: {
    text: STRING_MAPPING,
    line: STRING_MAPPING,
    city: STRING_MAPPING,
    district: STRING_MAPPING,
    state: STRING_MAPPING,
    postalCode: STRING_MAPPING
  }
};

/**
 * https://www.hl7.org/fhir/datatypes.html#HumanName
 */
const humanNameMapping = {
  properties: {
    text: STRING_MAPPING,
    family: STRING_MAPPING,
    given: STRING_MAPPING,
    prefix: STRING_MAPPING,
    suffix: STRING_MAPPING
  }
};

const fhirTypeMapping: Record<string, any> = {
  Address: addressMapping,
  Age: quantityMapping,
  Attachment: undefined, // not actually searchable
  CodeableConcept: codeableConceptMapping,
  Coding: codingMapping,
  ContactPoint: contactPointMapping,
  Duration: quantityMapping,
  HumanName: humanNameMapping,
  Identifier: identifierMapping,
  Money: moneyMapping,
  Period: periodMapping,
  Quantity: quantityMapping,
  Range: rangeMapping,
  Ratio: undefined, // There is no standard parameter for searching values of type Ratio (https://www.hl7.org/fhir/observation.html)
  Reference: referenceMapping,
  SampledData: sampledDataMapping,
  Timing: timingMapping,
  base64Binary: STRING_MAPPING,
  boolean: BOOLEAN_MAPPING,
  canonical: STRING_MAPPING,
  code: KEYWORD_MAPPING,
  date: DATE_MAPPING,
  dateTime: DATE_MAPPING,
  decimal: DOUBLE_MAPPING,
  'http://hl7.org/fhirpath/System.String': STRING_MAPPING,
  id: STRING_MAPPING,
  instant: DATE_MAPPING,
  integer: INTEGER_MAPPING,
  markdown: STRING_MAPPING,
  oid: STRING_MAPPING,
  positiveInt: INTEGER_MAPPING,
  string: STRING_MAPPING,
  time: undefined, // time alone without a date cannot be mapped to the date type. Not truly used by any search parameter
  uri: STRING_MAPPING,
  url: STRING_MAPPING
};

// eslint-disable-next-line import/prefer-default-export
export function fhirToESMapping(searchField: { field: string; type: string }): {
  field: string;
  mapping: any;
} {
  if (!(searchField.type in fhirTypeMapping)) {
    throw new Error(`There is not a mapping available for the type: ${searchField.type}`);
  }

  return {
    field: searchField.field,
    mapping: fhirTypeMapping[searchField.type]
  };
}
