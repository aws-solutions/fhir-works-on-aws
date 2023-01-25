interface RequestResult {
  request: any;
  expectedRequest: any;
  expectedLock: any;
  expectedStagingResponse: any;
  idToVersionId: Record<string, number>;
}
export default class GenerateStagingRequestsFactory {
  static getCreate(): RequestResult;
  static getRead(): RequestResult;
  static getUpdate(): RequestResult;
  static getDelete(): RequestResult;
}
export {};
//# sourceMappingURL=GenerateStagingRequestsFactory.d.ts.map
