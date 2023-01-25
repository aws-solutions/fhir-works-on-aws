/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { DdbToEsSync } from './ddbToEsSync';

const ddbToEsSync = new DdbToEsSync();

// This is a separate lambda function from the main FHIR API server lambda.
// This lambda picks up changes from DDB by way of DDB stream, and sends those changes to ElasticSearch Service for indexing.
// This allows the FHIR API Server to query ElasticSearch service for search requests
export async function handleDdbToEsEvent(event: any) {
  return ddbToEsSync.handleDDBStreamEvent(event);
}
