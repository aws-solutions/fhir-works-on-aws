/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

/**
 * Extensions are commonly used by implementation guides.
 * We index several extension fields so that many IGs can be used without needing to reindex
 */
export const EXTENSION_FIELDS = [
  'extension.url',
  'extension.extension.valueCoding', // used by US Core. Note that extensions can be nested

  // index some of the most common fields
  'extension.valueString',
  'extension.valueDecimal',
  'extension.valueBoolean',
  'extension.valueDateTime',
  'extension.valueDate',
  'extension.valueCoding',
  'extension.valueCodeableConcept',
  'extension.valueReference',

  'extension.extension.valueString',
  'extension.extension.valueDecimal',
  'extension.extension.valueBoolean',
  'extension.extension.valueDateTime',
  'extension.extension.valueDate',
  'extension.extension.valueCodeableConcept'
];
/**
 * There are some fields from the foundational FHIR resources for which it's way simpler to just inspect the type manually
 */
export const EDGE_CASES: any = {
  StructureDefinition: {
    // All 3 use peculiar interactions between ElementDefinition and Element
    'snapshot.element.base.path': 'string',
    'differential.element.base.path': 'string',
    'snapshot.element.binding.valueSet': 'canonical'
  },
  ConceptMap: {
    'group.element.target.product.property': 'uri' // uses contentReference
  },
  Resource: {
    'extension.url': 'uri'
  },
  Device: {
    // The xpath expressions in the search params are wrong
    deviceName: undefined,
    udiCarrier: undefined
  }
};
