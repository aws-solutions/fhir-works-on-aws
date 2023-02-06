import {
  Search,
  SearchResponse,
  GlobalSearchRequest,
  TypeSearchRequest,
  SearchCapabilityStatement
} from '@aws/fhir-works-on-aws-interface';

const ElasticSearchService: Search = class {
  /*
    searchParams => {field: value}
     */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async typeSearch(request: TypeSearchRequest) {
    return {
      success: true,
      result: {
        numberOfResults: 0,
        message: '',
        entries: []
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
    throw new Error('Method not implemented.');
  }

  static async getCapabilities(): Promise<SearchCapabilityStatement> {
    throw new Error('Method not implemented.');
  }

  static validateSubscriptionSearchCriteria(searchCriteria: string): void {
    console.log(searchCriteria);
  }
};
export default ElasticSearchService;
