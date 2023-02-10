/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { BulkDataAuth } from './authorization';
import { ExportType } from './bulkDataAccess';
import { TypeOperation, SystemOperation } from './constants';
import { MethodNotAllowedError } from './errors/MethodNotAllowedError';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chunkArray(myArray: any[], chunkSize: number): any[][] {
  const results = [];

  while (myArray.length) {
    results.push(myArray.splice(0, chunkSize));
  }

  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clone(item: any): any {
  return JSON.parse(JSON.stringify(item));
}

export function cleanAuthHeader(authorizationHeader?: string): string {
  let token = authorizationHeader || '';
  if (token.substr(0, 'Bearer '.length) === 'Bearer ') {
    token = token.substr('Bearer '.length);
  }
  return token;
}

/**
 * Returns everything before the query with the starting and ending '/' removed
 * ex: /Patient/?name=Joe returns Patient
 */
function cleanUrlPath(urlPath: string): string {
  let path = urlPath.split('?')[0];
  if (path[0] === '/') {
    path = path.substr(1);
  }
  if (path[path.length - 1] === '/') {
    path = path.substring(0, path.length - 1);
  }
  return path;
}

function getExportType(urlPath: string): ExportType {
  let exportType: ExportType = 'system';
  if (urlPath.includes('/Patient/')) {
    exportType = 'patient';
  }
  if (urlPath.includes('/Group/')) {
    exportType = 'group';
  }
  return exportType;
}

export function getRequestInformation(
  verb: string,
  urlPath: string
): {
  operation: TypeOperation | SystemOperation;
  resourceType?: string;
  id?: string;
  vid?: string;
  bulkDataAuth?: BulkDataAuth;
} {
  const path = cleanUrlPath(urlPath);
  const urlSplit = path.split('/');
  const exportJobUrlRegExp = /\$export\/[\w|-]+/;
  switch (verb) {
    case 'PUT': {
      return {
        operation: 'update',
        resourceType: urlSplit[0],
        id: urlSplit[1]
      };
    }
    case 'PATCH': {
      return {
        operation: 'patch',
        resourceType: urlSplit[0],
        id: urlSplit[1]
      };
    }
    case 'DELETE': {
      if (exportJobUrlRegExp.test(urlPath)) {
        const exportType = getExportType(urlPath);
        const operation = 'cancel-export';
        return {
          operation: 'delete',
          bulkDataAuth: {
            exportType,
            operation
          }
        };
      }
      return {
        operation: 'delete',
        resourceType: urlSplit[0],
        id: urlSplit[1]
      };
    }
    case 'GET': {
      if (urlPath.includes('$export')) {
        const exportType = getExportType(urlPath);
        if (exportJobUrlRegExp.test(urlPath)) {
          const operation = 'get-status-export';
          return {
            operation: 'read',
            bulkDataAuth: {
              exportType,
              operation
            }
          };
        }
        return {
          operation: 'read',
          bulkDataAuth: {
            exportType,
            operation: 'initiate-export'
          }
        };
      }
      if (urlSplit[urlSplit.length - 1].startsWith('_history')) {
        // if the last section of the url string starts with history
        if (urlSplit[0].startsWith('_history')) {
          // '_history' is at root or url
          return { operation: 'history-system' };
        }
        if (urlSplit[1].startsWith('_history')) {
          return { operation: 'history-type', resourceType: urlSplit[0] };
        }
        return {
          operation: 'history-instance',
          resourceType: urlSplit[0],
          id: urlSplit[1]
        };
      }
      if (path.includes('_history/')) {
        return {
          operation: 'vread',
          resourceType: urlSplit[0],
          id: urlSplit[1],
          vid: urlSplit[3]
        };
      }
      // For a generic read it has to be [type]/[id]
      if (urlSplit.length === 2)
        return {
          operation: 'read',
          resourceType: urlSplit[0],
          id: urlSplit[1]
        };
      if (path.includes('metadata')) return { operation: 'read', resourceType: 'metadata' };
      if (path.length === 0) return { operation: 'search-system' };
      return { operation: 'search-type', resourceType: urlSplit[0] };
    }
    case 'POST': {
      if (path.includes('_search')) {
        if (urlSplit[0] === '_search') {
          return { operation: 'search-system' };
        }
        return { operation: 'search-type', resourceType: urlSplit[0] };
      }
      if (path.length === 0) return { operation: 'transaction' };
      return { operation: 'create', resourceType: urlSplit[0] };
    }
    default: {
      throw new MethodNotAllowedError('Unable to parse the http verb');
    }
  }
}
