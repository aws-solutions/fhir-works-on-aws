/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SearchImplementationGuides } from './index';

const { compile } = SearchImplementationGuides;

describe('compile', () => {
  test(`simple path - Patient.communication.language`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/Patient-language',
        name: 'language',
        code: 'language',
        type: 'token',
        description: 'Language code (irrespective of use value)',
        base: ['Patient'],
        expression: 'Patient.communication.language',
        xpath: 'f:Patient/f:communication/f:language'
      }
    ]);

    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`simple where - Library.relatedArtifact.where(type='predecessor').resource`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/Library-predecessor',
        name: 'predecessor',
        code: 'predecessor',
        description: 'What resource is being referenced',
        base: ['Library'],
        type: 'reference',
        expression: "Library.relatedArtifact.where(type='predecessor').resource",
        xpath: "f:Library/f:relatedArtifact[f:type/@value='predecessor']/f:resource",
        target: ['Account', 'ActivityDefinition']
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`where with resolve() is - Person.link.target.where(resolve() is RelatedPerson)`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/Person-relatedperson',
        name: 'relatedperson',
        code: 'relatedperson',
        type: 'reference',
        description: 'The Person links to this RelatedPerson',
        base: ['Person'],
        expression: 'Person.link.target.where(resolve() is RelatedPerson)',
        xpath: 'f:Person/f:link/f:target',
        target: ['RelatedPerson']
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });
  test(`as - (ConceptMap.source as uri)`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/ConceptMap-source-uri',
        name: 'source-uri',
        code: 'source-uri',
        type: 'reference',
        description: 'The source value set that contains the concepts that are being mapped',
        base: ['ConceptMap'],
        expression: '(ConceptMap.source as uri)',
        xpath: 'f:ConceptMap/f:sourceUri',
        target: ['ValueSet']
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });
  test(`OR operator - CapabilityStatement.title | CodeSystem.title | ConceptMap.title | ImplementationGuide.title | MessageDefinition.title | OperationDefinition.title | StructureDefinition.title | StructureMap.title | TerminologyCapabilities.title | ValueSet.title`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/conformance-title',
        name: 'title',
        code: 'title',
        type: 'string',
        description: 'Multiple Resources...',
        base: [
          'CapabilityStatement',
          'CodeSystem',
          'ConceptMap',
          'ImplementationGuide',
          'MessageDefinition',
          'OperationDefinition',
          'StructureDefinition',
          'StructureMap',
          'TerminologyCapabilities',
          'ValueSet'
        ],
        expression:
          'CapabilityStatement.title | CodeSystem.title | ConceptMap.title | ImplementationGuide.title | MessageDefinition.title | OperationDefinition.title | StructureDefinition.title | StructureMap.title | TerminologyCapabilities.title | ValueSet.title',
        xpath:
          'f:CapabilityStatement/f:title | f:CodeSystem/f:title | f:ConceptMap/f:title | f:ImplementationGuide/f:title | f:MessageDefinition/f:title | f:OperationDefinition/f:title | f:StructureDefinition/f:title | f:StructureMap/f:title | f:TerminologyCapabilities/f:title | f:ValueSet/f:title'
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });
  test(`OR operator with same base resource - (ExampleScenario.useContext.value as Quantity) | (ExampleScenario.useContext.value as Range)`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/ExampleScenario-context-quantity',
        name: 'context-quantity',
        code: 'context-quantity',
        type: 'quantity',
        description: 'A quantity- or range-valued use context assigned to the example scenario',
        base: ['ExampleScenario'],
        expression:
          '(ExampleScenario.useContext.value as Quantity) | (ExampleScenario.useContext.value as Range)',
        xpath: 'f:ExampleScenario/f:useContext/f:valueQuantity | f:ExampleScenario/f:useContext/f:valueRange'
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`simple where url value - Patient.extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.value.code`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/test',
        name: 'test',
        code: 'test',
        type: 'token',
        description: 'test',
        base: ['Patient'],
        expression:
          "Patient.extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.value.code",
        xpath:
          "f:Patient/f:extension[@url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-race']/f:extension/f:valueCoding/f:code/@value"
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`.extension() function - DocumentReference.extension('http://example.org/fhir/StructureDefinition/participation-agreement')`, async () => {
    // example extension from https://www.hl7.org/fhir/R4/searchparameter-example-extension.json.html
    const extensionSearchParam = {
      resourceType: 'SearchParameter',
      id: 'example-extension',
      url: 'http://hl7.org/fhir/SearchParameter/example-extension',
      name: 'Example Search Parameter on an extension',
      description: 'Search by url for a participation agreement, which is stored in a DocumentReference',
      code: 'part-agree',
      base: ['DocumentReference'],
      type: 'reference',
      expression:
        "DocumentReference.extension('http://example.org/fhir/StructureDefinition/participation-agreement')",
      xpath:
        "f:DocumentReference/f:extension[@url='http://example.org/fhir/StructureDefinition/participation-agreement']",
      target: ['DocumentReference']
    };
    const compiled = compile([extensionSearchParam]);
    await expect(compiled).resolves.toMatchSnapshot();

    // .extension('x') is syntactic sugar for extension.where(url = 'x')
    await expect(compiled).resolves.toEqual(
      await compile([
        {
          ...extensionSearchParam,
          expression: `DocumentReference.extension.where(url = 'http://example.org/fhir/StructureDefinition/participation-agreement')`
        }
      ])
    );
  });

  test(`xpath explicitly expands choice of data types and fhirPath does not`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/Consent-source-reference',
        name: 'source-reference',
        code: 'source-reference',
        type: 'reference',
        description: 'test',
        base: ['Consent'],
        expression: 'Consent.source',
        xpath: 'f:Consent/f:sourceAttachment | f:Consent/f:sourceReference',
        target: ['ValueSet']
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`fhirPath with broader conditions than xPath`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/Device-device-name',
        name: 'device-name',
        code: 'device-name',
        type: 'string',
        description: 'test',
        base: ['Device'],
        expression: 'Device.deviceName.name | Device.type.coding.display | Device.type.text',
        xpath: 'f:Device/f:deviceName'
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`expression with extra whitespaces`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/test',
        name: 'test',
        code: 'test',
        type: 'token',
        description: 'test',
        base: ['Patient'],
        expression: "Patient.x.where(field         =         'value')",
        xpath: "f:Patient/f:x[f:field  =  'value']"
      }
    ]);
    await expect(compiled).resolves.toMatchSnapshot();
  });

  test(`Invalid input`, async () => {
    const compiled = compile([
      {
        foo: 'bar'
      }
    ]);
    await expect(compiled).rejects.toThrowError();
  });

  test(`unparsable FHIRPath expression`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/test',
        name: 'test',
        code: 'test',
        type: 'token',
        description: 'test',
        base: ['Patient'],
        expression: 'some random FHIRPath expression that cannot be parsed',
        xpath: 'some random FHIRPath expression that cannot be parsed'
      }
    ]);
    await expect(compiled).rejects.toThrowError();
  });
  test(`search param of type reference with no target`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/ConceptMap-source-uri',
        name: 'source-uri',
        code: 'source-uri',
        type: 'reference',
        description: 'The source value set that contains the concepts that are being mapped',
        base: ['ConceptMap'],
        expression: '(ConceptMap.source as uri)',
        xpath: 'f:ConceptMap/f:sourceUri'
      }
    ]);
    await expect(compiled).rejects.toThrowError();
  });

  test(`search param of type reference with empty target`, async () => {
    const compiled = compile([
      {
        resourceType: 'SearchParameter',
        url: 'http://hl7.org/fhir/SearchParameter/ConceptMap-source-uri',
        name: 'source-uri',
        code: 'source-uri',
        type: 'reference',
        description: 'The source value set that contains the concepts that are being mapped',
        base: ['ConceptMap'],
        expression: '(ConceptMap.source as uri)',
        xpath: 'f:ConceptMap/f:sourceUri',
        target: []
      }
    ]);
    await expect(compiled).rejects.toThrowError();
  });
});
