/**
 * Parses FHIR profiles json files
 * https://www.hl7.org/fhir/definitions.json.zip
 * http://hl7.org/fhir/STU3/definitions.json.zip
 */
export declare class ProfilesRegistry {
  private readonly structureDefinitions;
  /**
   * @param pathToFhirDefinitionsFolder - path to the unzipped FHIR definitions folder (most likely downloaded from @link https://www.hl7.org/fhir/definitions.json.zip)
   */
  constructor(pathToFhirDefinitionsFolder: string);
  getTypeForField(resourceType: string, field: string): string | undefined;
  getFhirVersion(): string;
}
//# sourceMappingURL=profilesRegistry.d.ts.map
