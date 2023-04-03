/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { BadRequestError, clone, generateMeta } from '@aws/fhir-works-on-aws-interface';
import flatten from 'flat';
import { DDB_HASH_KEY_SEPARATOR, SEPARATOR } from '../constants';
import DOCUMENT_STATUS from './documentStatus';

export const DOCUMENT_STATUS_FIELD = 'documentStatus';
export const LOCK_END_TS_FIELD = 'lockEndTs';
export const VID_FIELD = 'vid';
export const REFERENCES_FIELD = '_references';
export const TENANT_ID_FIELD = '_tenantId';
export const INTERNAL_ID_FIELD = '_id';
export const SUBSCRIPTION_FIELD = '_subscriptionStatus';
const HASH_KEY_MAX_LENGTH = 100;

export const buildHashKey = (id: string, tenantId?: string): string => {
  const hashKey = tenantId ? `${tenantId}|${id}` : id;
  if (hashKey.length >= HASH_KEY_MAX_LENGTH) {
    throw new BadRequestError('id length is too long');
  }
  return hashKey;
};

export class DynamoDbUtil {
  static cleanItem(item: any) {
    const cleanedItem = clone(item);

    delete cleanedItem[DOCUMENT_STATUS_FIELD];
    delete cleanedItem[LOCK_END_TS_FIELD];
    delete cleanedItem[VID_FIELD];
    delete cleanedItem[REFERENCES_FIELD];
    delete cleanedItem[SUBSCRIPTION_FIELD];

    // Return id instead of full id (this is only a concern in results from ES)
    const id = item.id.split(SEPARATOR)[0];
    cleanedItem.id = id;

    if (cleanedItem.id.includes(DDB_HASH_KEY_SEPARATOR)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [tenantId, resourceId] = cleanedItem.id.split(DDB_HASH_KEY_SEPARATOR);
      if (resourceId === undefined) {
        throw new Error(`Invalid schema for resource Id: ${cleanedItem.id}`);
      }
      cleanedItem.id = resourceId;
    }

    delete cleanedItem[TENANT_ID_FIELD];
    delete cleanedItem[INTERNAL_ID_FIELD];

    return cleanedItem;
  }

  static prepItemForDdbInsert(
    resource: any,
    id: string,
    vid: number,
    documentStatus: DOCUMENT_STATUS,
    tenantId?: string
  ) {
    const item = clone(resource);
    item.id = buildHashKey(id, tenantId);
    item.vid = vid;

    // versionId and lastUpdated for meta object should be system generated
    const { versionId, lastUpdated } = generateMeta(vid.toString());
    if (!item.meta) {
      item.meta = { versionId, lastUpdated };
    } else {
      item.meta = { ...item.meta, versionId, lastUpdated };
    }

    item[DOCUMENT_STATUS_FIELD] = documentStatus;
    item[LOCK_END_TS_FIELD] = Date.now();

    const activeSubscription =
      (documentStatus === DOCUMENT_STATUS.AVAILABLE || documentStatus === DOCUMENT_STATUS.PENDING) &&
      resource.resourceType === 'Subscription' &&
      (resource.status === 'active' || resource.status === 'requested');
    if (activeSubscription) {
      item[SUBSCRIPTION_FIELD] = 'active';
      item.status = 'active';
    }

    if (tenantId) {
      item[TENANT_ID_FIELD] = tenantId;
      item[INTERNAL_ID_FIELD] = id;
    }

    // Format of flattenedResource
    // https://www.npmjs.com/package/flat
    // flatten({ key1: { keyA: 'valueI' } })  => { key1.keyA: 'valueI'}
    const flattenedResources: Record<string, string> = flatten(resource);
    const references = Object.keys(flattenedResources)
      .filter((key: string) => {
        return key.endsWith('.reference');
      })
      .map((key: string) => {
        return flattenedResources[key];
      });
    item[REFERENCES_FIELD] = references;
    return item;
  }
}
