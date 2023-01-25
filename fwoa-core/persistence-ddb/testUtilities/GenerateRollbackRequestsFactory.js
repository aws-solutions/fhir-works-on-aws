'use strict';
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const v4_1 = __importDefault(require('uuid/v4'));
const dynamoDbParamBuilder_1 = __importDefault(require('../src/dataServices/dynamoDbParamBuilder'));
class GenerateRollbackRequestsFactory {
  static buildBundleEntryResponse(operation, vid) {
    let resource = {};
    if (operation === 'read') {
      resource = {
        active: true,
        resourceType: 'Patient',
        birthDate: '1995-09-24',
        meta: {
          lastUpdated: '2020-04-10T20:41:39.912Z',
          versionId: '1'
        },
        managingOrganization: {
          reference: 'Organization/2.16.840.1.113883.19.5',
          display: 'Good Health Clinic'
        },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p></p></div>',
          status: 'generated'
        },
        id: '47135b80-b721-430b-9d4b-1557edc64947',
        vid,
        name: [
          {
            family: 'Langard',
            given: ['Abby']
          }
        ],
        gender: 'female'
      };
    }
    const id = (0, v4_1.default)();
    const resourceType = 'Patient';
    const bundleEntryResponse = {
      id,
      vid,
      operation,
      lastModified: '2020-04-23T15:19:35.843Z',
      resourceType,
      resource
    };
    return bundleEntryResponse;
  }
  static buildExpectedBundleEntryResult(bundleEntryResponse) {
    const { id, vid, resourceType, operation } = bundleEntryResponse;
    let expectedResult = {};
    if (operation === 'create' || operation === 'update') {
      expectedResult = {
        transactionRequests: [dynamoDbParamBuilder_1.default.buildDeleteParam(id, parseInt(vid, 10))],
        itemsToRemoveFromLock: [
          {
            id,
            vid,
            resourceType
          }
        ]
      };
    } else if (operation === 'read' || operation === 'delete') {
      expectedResult = { transactionRequests: [], itemsToRemoveFromLock: [] };
    }
    return expectedResult;
  }
}
exports.default = GenerateRollbackRequestsFactory;
//# sourceMappingURL=GenerateRollbackRequestsFactory.js.map
