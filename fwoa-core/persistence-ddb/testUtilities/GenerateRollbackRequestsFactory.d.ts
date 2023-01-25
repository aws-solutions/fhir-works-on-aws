import { BatchReadWriteResponse, TypeOperation } from 'fhir-works-on-aws-interface';
export default class GenerateRollbackRequestsFactory {
  static buildBundleEntryResponse(operation: TypeOperation, vid: string): BatchReadWriteResponse;
  static buildExpectedBundleEntryResult(bundleEntryResponse: BatchReadWriteResponse): any;
}
//# sourceMappingURL=GenerateRollbackRequestsFactory.d.ts.map
