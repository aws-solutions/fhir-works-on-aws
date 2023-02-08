/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Client } from '@elastic/elasticsearch';
// @ts-ignore
import { AmazonConnection, AmazonTransport } from 'aws-elasticsearch-connector';
import AWS from 'aws-sdk';

const { IS_OFFLINE } = process.env;

let esDomainEndpoint = process.env.ELASTICSEARCH_DOMAIN_ENDPOINT || 'https://fake-es-endpoint.com';
if (IS_OFFLINE === 'true') {
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2',
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
  });
  esDomainEndpoint = process.env.OFFLINE_ELASTICSEARCH_DOMAIN_ENDPOINT || 'https://fake-es-endpoint.com';
}

// eslint-disable-next-line import/prefer-default-export
export const ElasticSearch = new Client({
  node: esDomainEndpoint,
  Connection: AmazonConnection,
  Transport: AmazonTransport
});
