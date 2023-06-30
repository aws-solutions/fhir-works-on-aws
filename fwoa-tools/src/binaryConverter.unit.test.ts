/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  convertBinaryResource,
  getBinaryObject,
  getBinaryResource,
  uploadBinaryResource
} from './binaryConverter';
import AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';

AWSMock.setSDKInstance(AWS);

describe('binaryConverter', async () => {
  afterEach(() => {
    AWSMock.restore();
  });

  describe('convertBinaryResource', async () => {});

  describe('getBinaryObject', async () => {});

  describe('getBinaryResource', async () => {});

  describe('uploadBinaryResource', async () => {});
});
