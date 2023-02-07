/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-underscore-dangle */
import URL from 'url';

import {
  Search,
  TypeSearchRequest,
  SearchResult,
  SearchResponse,
  GlobalSearchRequest,
  SearchEntry,
  SearchFilter,
  FhirVersion,
  InvalidSearchParameterError
} from '@aws/fhir-works-on-aws-interface';
import { Client, RequestParams } from '@elastic/elasticsearch';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { partition, merge, isEmpty } from 'lodash';
import {
  DEFAULT_SEARCH_RESULTS_PER_PAGE,
  SEARCH_PAGINATION_PARAMS,
  ITERATIVE_INCLUSION_PARAMETERS,
  SORT_PARAMETER,
  MAX_ES_WINDOW_SIZE,
  MAX_CHAINED_PARAMS_RESULT
} from './constants';
import { ElasticSearch } from './elasticSearch';
import { parseQueryString, parseQuery, ParsedFhirQueryParams } from './FhirQueryParser';
import { FHIRSearchParametersRegistry } from './FHIRSearchParametersRegistry';
import getComponentLogger from './loggerBuilder';
import { buildQueryForAllSearchParameters, buildSortClause } from './QueryBuilder';
import parseChainedParameters, { ChainParameter } from './QueryBuilder/chain';
import {
  buildIncludeQueries,
  buildRevIncludeQueries,
  InclusionSearchParameter,
  WildcardInclusionSearchParameter
} from './searchInclusions';

export interface Query {
  resourceType: string;
  queryRequest: RequestParams.Search<Record<string, any>>;
}

const logger = getComponentLogger();

const MAX_INCLUDE_ITERATIVE_DEPTH = 5;

const getAliasName = (resourceType: string, tenantId?: string) => {
  const lowercaseResourceType = resourceType.toLowerCase();
  if (tenantId) {
    return `${lowercaseResourceType}-alias-tenant-${tenantId}`;
  }
  return `${lowercaseResourceType}-alias`;
};

// eslint-disable-next-line import/prefer-default-export
export class ElasticSearchService implements Search {
  private readonly esClient: Client;

  private readonly searchFiltersForAllQueries: SearchFilter[];

  private readonly cleanUpFunction: (resource: any) => any;

  private readonly fhirVersion: FhirVersion;

  private readonly fhirSearchParametersRegistry: FHIRSearchParametersRegistry;

  private readonly enableMultiTenancy: boolean;

  private readonly useKeywordSubFields: boolean;

  /**
   * @param searchFiltersForAllQueries - If you are storing both History and Search resources
   * in your elastic search you can filter out your History elements by supplying a list of SearchFilters
   *
   * @param cleanUpFunction - If you are storing non-fhir related parameters pass this function to clean
   * the return ES objects
   * @param fhirVersion
   * @param compiledImplementationGuides - The output of ImplementationGuides.compile.
   * This parameter enables support for search parameters defined in Implementation Guides.
   * @param esClient
   * @param options.enableMultiTenancy - whether or not to enable multi-tenancy. When enabled a tenantId is required for all requests.
   * @param options.useKeywordSubFields - whether or not to append `.keyword` to fields in search queries. You should enable this if you do dynamic mapping. NOTE: Parameter`id` will not be affected by this due to it being of `keyword` type by default
   */
  constructor(
    searchFiltersForAllQueries: SearchFilter[] = [],
    cleanUpFunction: (resource: any) => any = function passThrough(resource: any) {
      return resource;
    },
    fhirVersion: FhirVersion = '4.0.1',
    compiledImplementationGuides?: any,
    esClient: Client = ElasticSearch,
    {
      enableMultiTenancy = false,
      useKeywordSubFields = true
    }: { enableMultiTenancy?: boolean; useKeywordSubFields?: boolean } = {}
  ) {
    this.searchFiltersForAllQueries = searchFiltersForAllQueries;
    this.cleanUpFunction = cleanUpFunction;
    this.fhirVersion = fhirVersion;
    this.fhirSearchParametersRegistry = new FHIRSearchParametersRegistry(
      fhirVersion,
      compiledImplementationGuides
    );
    this.esClient = esClient;
    this.useKeywordSubFields = useKeywordSubFields;
    this.enableMultiTenancy = enableMultiTenancy;
  }

  private assertValidTenancyMode(tenantId?: string) {
    if (this.enableMultiTenancy && tenantId === undefined) {
      throw new Error(
        'This instance has multi-tenancy enabled, but the incoming request is missing tenantId'
      );
    }
    if (!this.enableMultiTenancy && tenantId !== undefined) {
      throw new Error('This instance has multi-tenancy disabled, but the incoming request has a tenantId');
    }
  }

  async getCapabilities() {
    return this.fhirSearchParametersRegistry.getCapabilities();
  }

  private getFilters(request: TypeSearchRequest) {
    const { searchFilters, tenantId } = request;
    const filters: any[] = ElasticSearchService.buildElasticSearchFilter([
      ...this.searchFiltersForAllQueries,
      ...(searchFilters ?? [])
    ]);

    if (this.enableMultiTenancy) {
      filters.push({
        match: {
          _tenantId: tenantId
        }
      });
    }

    return filters;
  }

  /*
    searchParams => {field: value}
     */
  async typeSearch(request: TypeSearchRequest): Promise<SearchResponse> {
    this.assertValidTenancyMode(request.tenantId);
    const { queryParams, resourceType } = request;
    try {
      const from = queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]
        ? Number(queryParams[SEARCH_PAGINATION_PARAMS.PAGES_OFFSET])
        : 0;

      const size = queryParams[SEARCH_PAGINATION_PARAMS.COUNT]
        ? Number(queryParams[SEARCH_PAGINATION_PARAMS.COUNT])
        : DEFAULT_SEARCH_RESULTS_PER_PAGE;

      if (from + size > MAX_ES_WINDOW_SIZE) {
        logger.info(
          `Search request is out of bound. Trying to access ${from} to ${
            from + size
          } which is outside of the max: ${MAX_ES_WINDOW_SIZE}`
        );
        throw new InvalidSearchParameterError(
          `Search parameters: ${SEARCH_PAGINATION_PARAMS.PAGES_OFFSET} and ${SEARCH_PAGINATION_PARAMS.COUNT} are accessing items outside the max range (${MAX_ES_WINDOW_SIZE}). Please narrow your search to access the remaining items`
        );
      }

      const filter = this.getFilters(request);
      const parsedChainParameters = parseChainedParameters(
        this.fhirSearchParametersRegistry,
        request.resourceType,
        request.queryParams
      );
      let chainedParameterQuery;
      if (parsedChainParameters.length > 0) {
        chainedParameterQuery = await this.getChainedParametersQuery(parsedChainParameters, request, filter);
        if (isEmpty(chainedParameterQuery)) {
          // chained parameter query did not return any results
          return {
            result: {
              numberOfResults: 0,
              entries: [],
              message: ''
            }
          };
        }
      }

      const parsedFhirQueryParams: ParsedFhirQueryParams = parseQuery(
        this.fhirSearchParametersRegistry,
        request.resourceType,
        request.queryParams
      );

      const query = buildQueryForAllSearchParameters(
        this.fhirSearchParametersRegistry,
        request,
        parsedFhirQueryParams.searchParams,
        this.useKeywordSubFields,
        filter,
        chainedParameterQuery
      );

      const params: Query = {
        resourceType,
        queryRequest: {
          from,
          size,
          track_total_hits: true,
          body: {
            query
          }
        }
      };

      if (request.queryParams[SORT_PARAMETER]) {
        params.queryRequest.body!.sort = buildSortClause(
          this.fhirSearchParametersRegistry,
          resourceType,
          request.queryParams[SORT_PARAMETER]
        );
      }
      const { total, hits } = await this.executeQuery(params, request);
      const result: SearchResult = {
        numberOfResults: total,
        entries: this.hitsToSearchEntries({
          hits,
          baseUrl: request.baseUrl,
          mode: 'match'
        }),
        message: ''
      };

      if (from !== 0) {
        result.previousResultUrl = this.createURL(
          request.baseUrl,
          {
            ...queryParams,
            [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from - size,
            [SEARCH_PAGINATION_PARAMS.COUNT]: size
          },
          resourceType
        );
      }
      if (from + size < total) {
        result.nextResultUrl = this.createURL(
          request.baseUrl,
          {
            ...queryParams,
            [SEARCH_PAGINATION_PARAMS.PAGES_OFFSET]: from + size,
            [SEARCH_PAGINATION_PARAMS.COUNT]: size
          },
          resourceType
        );
      }

      if (parsedFhirQueryParams.inclusionSearchParams) {
        const includedResources = await this.processSearchInclusions(
          result.entries,
          request,
          parsedFhirQueryParams.inclusionSearchParams
        );
        result.entries.push(...includedResources);

        const iterativelyIncludedResources = await this.processIterativeSearchInclusions(
          result.entries,
          request,
          parsedFhirQueryParams.inclusionSearchParams
        );
        result.entries.push(...iterativelyIncludedResources);
      }

      return { result };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  // Return translated chained parameters that can be used as normal search parameters
  // eslint-disable-next-line class-methods-use-this
  private async getChainedParametersQuery(
    parsedChainParameters: ChainParameter[],
    request: TypeSearchRequest,
    filters: any[] = []
  ): Promise<{}> {
    let combinedChainedParameters = {};

    // eslint-disable-next-line no-restricted-syntax
    for (const { chain, initialValue } of parsedChainParameters) {
      let stepValue = initialValue;
      let chainComplete = true;
      const lastChain: { resourceType: string; searchParam: string } = chain.pop()!;
      // eslint-disable-next-line no-restricted-syntax
      for (const { resourceType, searchParam } of chain) {
        const stepRequest: TypeSearchRequest = {
          ...request,
          resourceType,
          queryParams: { [searchParam]: stepValue }
        };
        const parsedFhirQueryParams: ParsedFhirQueryParams = parseQuery(
          this.fhirSearchParametersRegistry,
          stepRequest.resourceType,
          stepRequest.queryParams
        );
        const stepQuery = buildQueryForAllSearchParameters(
          this.fhirSearchParametersRegistry,
          stepRequest,
          parsedFhirQueryParams.searchParams,
          this.useKeywordSubFields,
          filters
        );
        const params: Query = {
          resourceType,
          queryRequest: {
            size: MAX_CHAINED_PARAMS_RESULT,
            track_total_hits: true,
            body: {
              query: stepQuery,
              fields: ['id'],
              _source: false
            }
          }
        };
        // eslint-disable-next-line no-await-in-loop
        const { total, hits } = await this.executeQuery(params, request);
        if (total === 0) {
          chainComplete = false;
          break;
        }
        if (total > MAX_CHAINED_PARAMS_RESULT) {
          throw new InvalidSearchParameterError(
            `Chained parameter ${searchParam} result in more than ${MAX_CHAINED_PARAMS_RESULT} ${resourceType} resource. Please provide more precise queries.`
          );
        }
        stepValue = hits.map((hit) => `${resourceType}/${hit.fields.id[0]}`);
      }
      if (chainComplete) {
        combinedChainedParameters = merge(combinedChainedParameters, {
          [lastChain.searchParam]: stepValue
        });
      }
    }
    return combinedChainedParameters;
  }

  // eslint-disable-next-line class-methods-use-this
  private async executeQuery(
    searchQuery: Query,
    request: TypeSearchRequest
  ): Promise<{ hits: any[]; total: number }> {
    try {
      const searchQueryWithAlias = {
        ...searchQuery.queryRequest,
        index: getAliasName(searchQuery.resourceType, request.tenantId),
        ...(request.sessionId && { preference: request.sessionId })
      };
      if (logger.isDebugEnabled()) {
        logger.debug(`Elastic search query: ${JSON.stringify(searchQueryWithAlias, null, 2)}`);
      }
      const apiResponse = await this.esClient.search(searchQueryWithAlias);
      return {
        total: apiResponse.body.hits.total.value,
        hits: apiResponse.body.hits.hits
      };
    } catch (error) {
      // Indexes are created the first time a resource of a given type is written to DDB.
      if (error instanceof ResponseError && error.meta.body.error.type === 'index_not_found_exception') {
        logger.info(
          `Search index for ${getAliasName(
            searchQuery.resourceType,
            request.tenantId
          )} does not exist. Returning an empty search result`
        );
        return {
          total: 0,
          hits: []
        };
      }

      throw error;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async executeQueries(searchQueries: Query[], request: TypeSearchRequest): Promise<{ hits: any[] }> {
    if (searchQueries.length === 0) {
      return {
        hits: []
      };
    }

    const searchQueriesWithAlias = searchQueries.map((searchQuery) => ({
      ...searchQuery.queryRequest,
      index: getAliasName(searchQuery.resourceType, request.tenantId)
    }));

    if (logger.isDebugEnabled()) {
      logger.debug(`Elastic msearch query: ${JSON.stringify(searchQueriesWithAlias, null, 2)}`);
    }
    const apiResponse = await this.esClient.msearch({
      body: searchQueriesWithAlias.flatMap((query) => [
        {
          index: query.index,
          ...(request.sessionId && { preference: request.sessionId })
        },
        { size: query.size, query: query.body!.query }
      ])
    });

    return (apiResponse.body.responses as any[])
      .filter((response) => {
        if (response.error) {
          if (response.error.type === 'index_not_found_exception') {
            // Indexes are created the first time a resource of a given type is written to DDB.
            logger.info(
              `Search index for ${response.error.index} does not exist. Returning an empty search result`
            );
            return false;
          }
          throw response.error;
        }
        return true;
      })
      .reduce(
        (acc, response) => {
          acc.hits.push(...response.hits.hits);
          return acc;
        },
        {
          hits: []
        }
      );
  }

  private hitsToSearchEntries({
    hits,
    baseUrl,
    mode = 'match'
  }: {
    hits: any[];
    baseUrl: string;
    mode: 'match' | 'include';
  }): SearchEntry[] {
    return hits.map((hit: any): SearchEntry => {
      // Modify to return resource with FHIR id not Dynamo ID
      const resource = this.cleanUpFunction(hit._source);
      return {
        search: {
          mode
        },
        fullUrl: URL.format({
          host: baseUrl,
          pathname: `/${resource.resourceType}/${resource.id}`
        }),
        resource
      };
    });
  }

  private async processSearchInclusions(
    searchEntries: SearchEntry[],
    request: TypeSearchRequest,
    inclusionSearchParameters: (InclusionSearchParameter | WildcardInclusionSearchParameter)[],
    iterative?: true
  ): Promise<SearchEntry[]> {
    const { allowedResourceTypes, baseUrl } = request;
    const filter: any[] = this.getFilters(request);

    const includeSearchQueries: Query[] = buildIncludeQueries(
      inclusionSearchParameters,
      searchEntries.map((x) => x.resource),
      filter,
      this.fhirSearchParametersRegistry,
      iterative
    );

    const revIncludeSearchQueries: Query[] = buildRevIncludeQueries(
      inclusionSearchParameters,
      searchEntries.map((x) => x.resource),
      filter,
      this.fhirSearchParametersRegistry,
      this.useKeywordSubFields,
      iterative
    );

    const lowerCaseAllowedResourceTypes = new Set(allowedResourceTypes.map((r: string) => r.toLowerCase()));
    const allowedInclusionQueries = [...includeSearchQueries, ...revIncludeSearchQueries].filter((query) =>
      lowerCaseAllowedResourceTypes.has(query.resourceType.toLowerCase())
    );

    const { hits } = await this.executeQueries(allowedInclusionQueries, request);
    return this.hitsToSearchEntries({ hits, baseUrl, mode: 'include' });
  }

  private async processIterativeSearchInclusions(
    searchEntries: SearchEntry[],
    request: TypeSearchRequest,
    inclusionSearchParams: (InclusionSearchParameter | WildcardInclusionSearchParameter)[]
  ): Promise<SearchEntry[]> {
    if (!ITERATIVE_INCLUSION_PARAMETERS.some((param) => request.queryParams[param])) {
      return [];
    }
    const result: SearchEntry[] = [];
    const resourceIdsAlreadyInResult: Set<string> = new Set(
      searchEntries.map((searchEntry) => searchEntry.resource.id)
    );
    const resourceIdsWithInclusionsAlreadyResolved: Set<string> = new Set();

    logger.info('Iterative inclusion search starts');

    let resourcesToIterate = searchEntries;
    for (let i = 0; i < MAX_INCLUDE_ITERATIVE_DEPTH; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const resourcesFound = await this.processSearchInclusions(
        resourcesToIterate,
        request,
        inclusionSearchParams,
        true
      );

      resourcesToIterate.forEach((resource) =>
        resourceIdsWithInclusionsAlreadyResolved.add(resource.resource.id)
      );
      if (resourcesFound.length === 0) {
        logger.info(`Iteration ${i} found zero results. Stopping`);
        break;
      }

      resourcesFound.forEach((resourceFound) => {
        // Avoid duplicates in result. In some cases different include/revinclude clauses can end up finding the same resource.
        if (!resourceIdsAlreadyInResult.has(resourceFound.resource.id)) {
          resourceIdsAlreadyInResult.add(resourceFound.resource.id);
          result.push(resourceFound);
        }
      });

      if (i === MAX_INCLUDE_ITERATIVE_DEPTH - 1) {
        logger.info('MAX_INCLUDE_ITERATIVE_DEPTH reached. Stopping');
        break;
      }
      resourcesToIterate = resourcesFound.filter(
        (r) => !resourceIdsWithInclusionsAlreadyResolved.has(r.resource.id)
      );
      logger.info(`Iteration ${i} found ${resourcesFound.length} resources`);
    }
    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  private createURL(host: string, query: any, resourceType?: string) {
    return URL.format({
      host,
      pathname: `/${resourceType}`,
      query
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
    logger.info(request);
    this.assertValidTenancyMode(request.tenantId);
    throw new Error('Method not implemented.');
  }

  validateSubscriptionSearchCriteria(searchCriteria: string): void {
    const { inclusionSearchParams, chainedSearchParams, otherParams } = parseQueryString(
      this.fhirSearchParametersRegistry,
      searchCriteria
    );
    if (inclusionSearchParams || chainedSearchParams || otherParams) {
      throw new InvalidSearchParameterError(
        'Search string used for field criteria contains unsupported parameter, please remove: ' +
          '_revinclude, _include, _sort, _count and chained parameters'
      );
    }
  }

  private static buildSingleElasticSearchFilterPart(
    key: string,
    value: string,
    operator: '==' | '!=' | '>' | '<' | '>=' | '<='
  ): any {
    switch (operator) {
      case '==': {
        return {
          match: {
            [key]: value
          }
        };
      }
      case '!=': {
        return {
          bool: {
            must_not: [
              {
                term: {
                  [key]: value
                }
              }
            ]
          }
        };
      }
      case '>': {
        return {
          range: {
            [key]: {
              gt: value
            }
          }
        };
      }
      case '<': {
        return {
          range: {
            [key]: {
              lt: value
            }
          }
        };
      }
      case '>=': {
        return {
          range: {
            [key]: {
              gte: value
            }
          }
        };
      }
      case '<=': {
        return {
          range: {
            [key]: {
              lte: value
            }
          }
        };
      }
      default: {
        throw new Error('Unknown comparison operator');
      }
    }
  }

  private static buildElasticSearchFilterPart(searchFilter: SearchFilter): any {
    const { key, value, comparisonOperator, logicalOperator } = searchFilter;

    if (value.length === 0) {
      throw new Error('Malformed SearchFilter, at least 1 value is required for the comparison');
    }
    const parts: any[] = value.map((v: string) =>
      ElasticSearchService.buildSingleElasticSearchFilterPart(key, v, comparisonOperator)
    );

    if (logicalOperator === 'AND' && parts.length > 1) {
      return {
        bool: {
          should: parts
        }
      };
    }

    return parts;
  }

  /**
   * ES filter is created where all 'AND' filters are required and at least 1 'OR' condition is met
   * @returns the `filter` part of the ES query
   */
  private static buildElasticSearchFilter(searchFilters: SearchFilter[]): any[] {
    const partitions: SearchFilter[][] = partition(
      searchFilters,
      (filter) => filter.logicalOperator === 'OR'
    );
    const orSearchFilterParts: any[] = partitions[0]
      .map(ElasticSearchService.buildElasticSearchFilterPart)
      .flat();
    const andSearchFilterParts: any[] = partitions[1]
      .map(ElasticSearchService.buildElasticSearchFilterPart)
      .flat();
    let filterQuery: any[] = [];
    if (andSearchFilterParts.length > 0) {
      filterQuery = andSearchFilterParts;
    }
    if (orSearchFilterParts.length > 0) {
      filterQuery.push({
        bool: {
          should: orSearchFilterParts
        }
      });
    }

    return filterQuery;
  }
}
