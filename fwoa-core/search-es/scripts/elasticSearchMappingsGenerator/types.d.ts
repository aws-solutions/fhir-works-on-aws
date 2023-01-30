export type SearchField = {
  field: string;
  type?: any;
  error?: string;
};
export interface Compiled {
  resourceType: string;
  path: string;
  condition?: string[];
}
export declare enum SearchParamType {
  Date = "date",
  Number = "number",
  Quantity = "quantity",
  Reference = "reference",
  String = "string",
  Token = "token",
  URI = "uri",
}
export interface CompiledSearchParameter {
  name: string;
  url: string;
  type: SearchParamType;
  description: string;
  base: string;
  compiled: Compiled[];
  target?: string[];
}
export declare namespace FhirProfiles {
  interface Profiles {
    resourceType: string;
    id: string;
    meta: Meta;
    type: string;
    entry: Entry[];
  }
  interface Entry {
    fullUrl: string;
    resource: Resource;
  }
  interface Resource {
    resourceType: ResourceType;
    id: string;
    meta: Meta;
    text: Text;
    extension: ResourceExtension[];
    url: string;
    version: Version;
    name: string;
    status: ResourceStatus;
    date: Date;
    publisher: Publisher;
    contact: Contact[];
    description: string;
    fhirVersion: Version;
    mapping?: ResourceMapping[];
    kind: Kind;
    abstract: boolean;
    type: string;
    snapshot: Snapshot;
    differential: Differential;
    baseDefinition?: string;
    derivation?: Derivation;
    purpose?: string;
  }
  interface Contact {
    telecom: Telecom[];
  }
  interface Telecom {
    system: System;
    value: string;
  }
  enum System {
    URL = "url",
  }
  enum Derivation {
    Constraint = "constraint",
    Specialization = "specialization",
  }
  interface Differential {
    element: DifferentialElement[];
  }
  interface DifferentialElement {
    id: string;
    extension?: BindingExtension[];
    path: string;
    short?: string;
    definition?: string;
    min?: number;
    max: string;
    condition?: string[];
    constraint?: Constraint[];
    mapping?: ElementMapping[];
    representation?: Representation[];
    type?: TypeElement[];
    slicing?: Slicing;
    comment?: string;
    alias?: string[];
    requirements?: string;
    isModifier?: boolean;
    isModifierReason?: string;
    isSummary?: boolean;
    minValueInteger?: number;
    maxValueInteger?: number;
    maxLength?: number;
    example?: Example[];
    binding?: Binding;
    orderMeaning?: string;
    meaningWhenMissing?: string;
  }
  interface Binding {
    extension: BindingExtension[];
    strength: Strength;
    description?: string;
    valueSet: string;
  }
  interface BindingExtension {
    url: string;
    valueString?: string;
    valueCanonical?: string;
    valueBoolean?: boolean;
    valueCode?: ValueCode;
  }
  enum ValueCode {
    Draft = "draft",
    Normative = "normative",
    The400 = "4.0.0",
    TrialUse = "trial-use",
  }
  enum Strength {
    Example = "example",
    Extensible = "extensible",
    Preferred = "preferred",
    Required = "required",
  }
  interface Constraint {
    key: string;
    severity: Severity;
    human: string;
    expression: string;
    xpath: string;
    source?: string;
  }
  enum Severity {
    Error = "error",
    Warning = "warning",
  }
  interface Example {
    label: Label;
    valueCode?: string;
    valueString?: string;
    valuePeriod?: ValuePeriod;
    valueUrl?: string;
    valueUri?: string;
  }
  enum Label {
    General = "General",
  }
  interface ValuePeriod {
    start: Date;
    end: Date;
  }
  interface ElementMapping {
    identity: Identity;
    map: string;
  }
  enum Identity {
    Dex = "dex",
    Iso11179 = "iso11179",
    Loinc = "loinc",
    Orim = "orim",
    Rim = "rim",
    Servd = "servd",
    V2 = "v2",
    Vcard = "vcard",
  }
  enum Representation {
    XHTML = "xhtml",
    XMLAttr = "xmlAttr",
  }
  interface Slicing {
    discriminator: Discriminator[];
    description: Description;
    rules: Rules;
  }
  enum Description {
    ExtensionsAreAlwaysSlicedByAtLeastURL = "Extensions are always sliced by (at least) url",
  }
  interface Discriminator {
    type: TypeEnum;
    path: System;
  }
  enum TypeEnum {
    Value = "value",
  }
  enum Rules {
    Open = "open",
  }
  interface TypeElement {
    extension?: TypeExtension[];
    code: string;
    targetProfile?: string[];
    profile?: string[];
  }
  interface TypeExtension {
    url: string;
    valueUrl?: string;
    valueString?: string;
  }
  interface ResourceExtension {
    url: string;
    valueCode: ValueCode;
  }
  enum Version {
    The401 = "4.0.1",
  }
  enum Kind {
    ComplexType = "complex-type",
    PrimitiveType = "primitive-type",
  }
  interface ResourceMapping {
    identity: Identity;
    uri: string;
    name: Name;
  }
  enum Name {
    HL7V2Mapping = "HL7 v2 Mapping",
    IHEDataElementExchangeDEX = "IHE Data Element Exchange (DEX)",
    ISO11179 = "ISO 11179",
    LOINCCodeForTheElement = "LOINC code for the element",
    OntologicalRIMMapping = "Ontological RIM Mapping",
    RIMMapping = "RIM Mapping",
    ServD = "ServD",
    VCardMapping = "vCard Mapping",
  }
  interface Meta {
    lastUpdated: Date;
  }
  enum Publisher {
    HL7FHIRStandard = "HL7 FHIR Standard",
  }
  enum ResourceType {
    StructureDefinition = "StructureDefinition",
  }
  interface Snapshot {
    element: SnapshotElement[];
  }
  interface SnapshotElement {
    id: string;
    extension?: BindingExtension[];
    path: string;
    short: string;
    definition: string;
    min: number;
    max: string;
    base: Base;
    condition?: string[];
    constraint?: Constraint[];
    isModifier: boolean;
    mapping?: ElementMapping[];
    representation?: Representation[];
    type?: TypeElement[];
    isSummary?: boolean;
    slicing?: Slicing;
    comment?: string;
    alias?: string[];
    requirements?: string;
    isModifierReason?: string;
    minValueInteger?: number;
    maxValueInteger?: number;
    maxLength?: number;
    example?: Example[];
    binding?: Binding;
    orderMeaning?: string;
    meaningWhenMissing?: string;
  }
  interface Base {
    path: string;
    min: number;
    max: string;
  }
  enum ResourceStatus {
    Active = "active",
    Draft = "draft",
  }
  interface Text {
    status: TextStatus;
    div: string;
  }
  enum TextStatus {
    Generated = "generated",
  }
}
//# sourceMappingURL=types.d.ts.map
