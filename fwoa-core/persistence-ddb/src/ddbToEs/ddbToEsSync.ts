/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { Client } from '@elastic/elasticsearch';
import AWS from 'aws-sdk';
import getComponentLogger from '../loggerBuilder';
import DdbToEsHelper from './ddbToEsHelper';
import ESBulkCommand from './ESBulkCommand';

const logger = getComponentLogger();

const BINARY_RESOURCE = 'binary';

function isBinaryResource(image: any): boolean {
  const resourceType = image.resourceType.toLowerCase();
  // Don't index binary files
  return resourceType === BINARY_RESOURCE;
}

function generateAlias(ddbImage: any) {
  const { resourceType, _tenantId } = ddbImage;
  const lowercaseResourceType = resourceType.toLowerCase();
  if (_tenantId) {
    return `${lowercaseResourceType}-alias-tenant-${_tenantId}`;
  }
  return `${lowercaseResourceType}-alias`;
}

function generateIndexName(ddbImage: any) {
  const { resourceType } = ddbImage;
  return resourceType.toLowerCase();
}

function getAlias(ddbImage: any) {
  return {
    alias: generateAlias(ddbImage),
    index: generateIndexName(ddbImage)
  };
}

export class DdbToEsSync {
  private readonly ddbToEsHelper: DdbToEsHelper;

  private readonly getAliasFn: (ddbImage: any) => { alias: string; index: string };

  private readonly disableIndexAndAliasCreation: boolean;

  private readonly knownAliases: Set<string>;

  constructor({
    esClient,
    getAliasFn = getAlias,
    disableIndexAndAliasCreation = false
  }: {
    esClient?: Client;
    getAliasFn?: (ddbImage: any) => { alias: string; index: string };
    disableIndexAndAliasCreation?: boolean;
  } = {}) {
    this.ddbToEsHelper = new DdbToEsHelper({ esClient });
    this.disableIndexAndAliasCreation = disableIndexAndAliasCreation;
    this.getAliasFn = getAliasFn;
    this.knownAliases = new Set();
  }

  async handleDDBStreamEvent(event: any) {
    try {
      const idToCommand: Record<string, ESBulkCommand> = {};
      const aliasesToCreate: { alias: string; index: string }[] = [];

      for (let i = 0; i < event.Records.length; i += 1) {
        const record = event.Records[i];
        logger.debug('EventName: ', record.eventName);

        const removeResource = this.ddbToEsHelper.isRemoveResource(record);
        const ddbJsonImage = removeResource ? record.dynamodb.OldImage : record.dynamodb.NewImage;
        const image = AWS.DynamoDB.Converter.unmarshall(ddbJsonImage);
        logger.debug(image);
        // Don't index binary files
        if (isBinaryResource(image)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const alias = this.getAliasFn(image);

        if (!this.knownAliases.has(alias.alias)) {
          aliasesToCreate.push(alias);
        }

        const cmd = removeResource
          ? this.ddbToEsHelper.createBulkESDelete(image, alias.alias)
          : this.ddbToEsHelper.createBulkESUpsert(image, alias.alias);

        if (cmd) {
          // Note this will overwrite the item if present
          // DDB streams guarantee in-order delivery of all mutations to each item
          // Meaning the last record in the event stream is the "newest"
          idToCommand[cmd.id] = cmd;
        }
      }
      if (!this.disableIndexAndAliasCreation) {
        await this.ddbToEsHelper.createIndexAndAliasIfNotExist(aliasesToCreate);
        // update cache of all known aliases
        aliasesToCreate.forEach((alias) => this.knownAliases.add(alias.alias));
      }
      await this.ddbToEsHelper.executeEsCmds(Object.values(idToCommand));
    } catch (e) {
      logger.error(
        'Synchronization failed! The resources that could be effected are: ',
        event.Records.map(
          (record: {
            eventName: string;
            dynamodb: { OldImage: AWS.DynamoDB.AttributeMap; NewImage: AWS.DynamoDB.AttributeMap };
          }) => {
            const image = this.ddbToEsHelper.isRemoveResource(record)
              ? record.dynamodb.OldImage
              : record.dynamodb.NewImage;
            return `{id: ${image.id.S}, vid: ${image.vid.N}}`;
          }
        )
      );

      logger.error('Failed to update ES records', e);
      throw e;
    }
  }
}
