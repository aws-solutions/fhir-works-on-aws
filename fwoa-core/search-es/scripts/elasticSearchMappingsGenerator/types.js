"use strict";
/* eslint-disable no-use-before-define */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirProfiles = exports.SearchParamType = void 0;
var SearchParamType;
(function (SearchParamType) {
  SearchParamType["Date"] = "date";
  SearchParamType["Number"] = "number";
  SearchParamType["Quantity"] = "quantity";
  SearchParamType["Reference"] = "reference";
  SearchParamType["String"] = "string";
  SearchParamType["Token"] = "token";
  SearchParamType["URI"] = "uri";
})(
  (SearchParamType = exports.SearchParamType || (exports.SearchParamType = {}))
);
var FhirProfiles;
(function (FhirProfiles) {
  let System;
  (function (System) {
    System["URL"] = "url";
  })((System = FhirProfiles.System || (FhirProfiles.System = {})));
  let Derivation;
  (function (Derivation) {
    Derivation["Constraint"] = "constraint";
    Derivation["Specialization"] = "specialization";
  })((Derivation = FhirProfiles.Derivation || (FhirProfiles.Derivation = {})));
  let ValueCode;
  (function (ValueCode) {
    ValueCode["Draft"] = "draft";
    ValueCode["Normative"] = "normative";
    ValueCode["The400"] = "4.0.0";
    ValueCode["TrialUse"] = "trial-use";
  })((ValueCode = FhirProfiles.ValueCode || (FhirProfiles.ValueCode = {})));
  let Strength;
  (function (Strength) {
    Strength["Example"] = "example";
    Strength["Extensible"] = "extensible";
    Strength["Preferred"] = "preferred";
    Strength["Required"] = "required";
  })((Strength = FhirProfiles.Strength || (FhirProfiles.Strength = {})));
  let Severity;
  (function (Severity) {
    Severity["Error"] = "error";
    Severity["Warning"] = "warning";
  })((Severity = FhirProfiles.Severity || (FhirProfiles.Severity = {})));
  let Label;
  (function (Label) {
    Label["General"] = "General";
  })((Label = FhirProfiles.Label || (FhirProfiles.Label = {})));
  let Identity;
  (function (Identity) {
    Identity["Dex"] = "dex";
    Identity["Iso11179"] = "iso11179";
    Identity["Loinc"] = "loinc";
    Identity["Orim"] = "orim";
    Identity["Rim"] = "rim";
    Identity["Servd"] = "servd";
    Identity["V2"] = "v2";
    Identity["Vcard"] = "vcard";
  })((Identity = FhirProfiles.Identity || (FhirProfiles.Identity = {})));
  let Representation;
  (function (Representation) {
    Representation["XHTML"] = "xhtml";
    Representation["XMLAttr"] = "xmlAttr";
  })(
    (Representation =
      FhirProfiles.Representation || (FhirProfiles.Representation = {}))
  );
  let Description;
  (function (Description) {
    Description["ExtensionsAreAlwaysSlicedByAtLeastURL"] =
      "Extensions are always sliced by (at least) url";
  })(
    (Description = FhirProfiles.Description || (FhirProfiles.Description = {}))
  );
  let TypeEnum;
  (function (TypeEnum) {
    TypeEnum["Value"] = "value";
  })((TypeEnum = FhirProfiles.TypeEnum || (FhirProfiles.TypeEnum = {})));
  let Rules;
  (function (Rules) {
    Rules["Open"] = "open";
  })((Rules = FhirProfiles.Rules || (FhirProfiles.Rules = {})));
  let Version;
  (function (Version) {
    Version["The401"] = "4.0.1";
  })((Version = FhirProfiles.Version || (FhirProfiles.Version = {})));
  let Kind;
  (function (Kind) {
    Kind["ComplexType"] = "complex-type";
    Kind["PrimitiveType"] = "primitive-type";
  })((Kind = FhirProfiles.Kind || (FhirProfiles.Kind = {})));
  let Name;
  (function (Name) {
    Name["HL7V2Mapping"] = "HL7 v2 Mapping";
    Name["IHEDataElementExchangeDEX"] = "IHE Data Element Exchange (DEX)";
    Name["ISO11179"] = "ISO 11179";
    Name["LOINCCodeForTheElement"] = "LOINC code for the element";
    Name["OntologicalRIMMapping"] = "Ontological RIM Mapping";
    Name["RIMMapping"] = "RIM Mapping";
    Name["ServD"] = "ServD";
    Name["VCardMapping"] = "vCard Mapping";
  })((Name = FhirProfiles.Name || (FhirProfiles.Name = {})));
  let Publisher;
  (function (Publisher) {
    Publisher["HL7FHIRStandard"] = "HL7 FHIR Standard";
  })((Publisher = FhirProfiles.Publisher || (FhirProfiles.Publisher = {})));
  let ResourceType;
  (function (ResourceType) {
    ResourceType["StructureDefinition"] = "StructureDefinition";
  })(
    (ResourceType =
      FhirProfiles.ResourceType || (FhirProfiles.ResourceType = {}))
  );
  let ResourceStatus;
  (function (ResourceStatus) {
    ResourceStatus["Active"] = "active";
    ResourceStatus["Draft"] = "draft";
  })(
    (ResourceStatus =
      FhirProfiles.ResourceStatus || (FhirProfiles.ResourceStatus = {}))
  );
  let TextStatus;
  (function (TextStatus) {
    TextStatus["Generated"] = "generated";
  })((TextStatus = FhirProfiles.TextStatus || (FhirProfiles.TextStatus = {})));
})((FhirProfiles = exports.FhirProfiles || (exports.FhirProfiles = {})));
//# sourceMappingURL=types.js.map
