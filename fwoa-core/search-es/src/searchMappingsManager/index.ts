/* eslint-disable no-await-in-loop,no-restricted-syntax */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { Client } from '@elastic/elasticsearch';
import { ElasticSearch } from '../elasticSearch';

const toIndexName = (resourceType: string) => resourceType.toLowerCase();

// eslint-disable-next-line import/prefer-default-export
export class SearchMappingsManager {
  private readonly searchMappings: {
    [resourceType: string]: any;
  };

  private readonly numberOfShards: number;

  private readonly searchClient: Client;

  private readonly ignoreMappingsErrorsForExistingIndices: boolean;

  /**
   * @param options
   *
   * @param options.searchMappings - search mappings for all FHIR resource types
   *
   * @param options.numberOfShards - number of shards for each new index created. See the documentation for guidance on how to choose the right number:
   * https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sizing-domains.html#bp-sharding
   *
   * @param options.searchClient - optionally provide your own search client instance
   *
   * @param options.ignoreMappingsErrorsForExistingIndices - optionally ignore errors for update mappings requests and log them as warnings.
   * This can be convenient if you have existing indices with conflicting mappings
   */
  constructor({
    searchMappings,
    numberOfShards,
    searchClient = ElasticSearch,
    ignoreMappingsErrorsForExistingIndices = false
  }: {
    searchMappings: { [resourceType: string]: any };
    numberOfShards: number;
    searchClient?: Client;
    ignoreMappingsErrorsForExistingIndices?: boolean;
  }) {
    this.searchMappings = searchMappings;
    this.numberOfShards = numberOfShards;
    this.searchClient = searchClient;
    this.ignoreMappingsErrorsForExistingIndices = ignoreMappingsErrorsForExistingIndices;
  }

  /**
   * Updates the mappings for all the FHIR resource types. If an index does not exist, it is created
   */
  async createOrUpdateMappings() {
    const resourceTypesWithErrors = [];
    for (const [resourceType, mappings] of Object.entries(this.searchMappings)) {
      try {
        if (!(await this.indexExists(resourceType))) {
          console.log(`index for ${resourceType} was not found. It will be created`);
          await this.createIndexWithMapping(resourceType, mappings);
        } else {
          try {
            await this.updateMapping(resourceType, mappings);
          } catch (e) {
            if (this.ignoreMappingsErrorsForExistingIndices) {
              console.log(
                `Warning: Failed to update mappings for ${resourceType}`,
                JSON.stringify(e, null, 2)
              );
            } else {
              throw e;
            }
          }
        }
      } catch (e) {
        console.log(e);
        console.log(`Failed to update mapping for ${resourceType}:`, JSON.stringify(e, null, 2));
        resourceTypesWithErrors.push(resourceType);
      }
    }

    if (resourceTypesWithErrors.length > 0) {
      throw new Error(`Failed to update mappings for: ${resourceTypesWithErrors}`);
    }
  }

  async indexExists(resourceType: string): Promise<boolean> {
    return (
      await this.searchClient.indices.exists({
        index: toIndexName(resourceType)
      })
    ).body;
  }

  async updateMapping(resourceType: string, mapping: any) {
    console.log(`sending putMapping request for: ${resourceType}`);
    return this.searchClient.indices.put_mapping({
      index: toIndexName(resourceType),
      body: mapping
    });
  }

  async createIndexWithMapping(resourceType: string, mapping: any) {
    console.log(`creating index for ${resourceType}`);
    return this.searchClient.indices.create({
      index: toIndexName(resourceType),
      body: {
        mappings: mapping,
        settings: {
          number_of_shards: this.numberOfShards
        }
      }
    });
  }
}
