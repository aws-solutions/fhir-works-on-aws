/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { DynamoDb, DynamoDbDataService } from '@aws/fhir-works-on-aws-persistence-ddb';
import { StreamSubscriptionMatcher } from '@aws/fhir-works-on-aws-search-es';

import { fhirVersion } from '../../config';
import { loadImplementationGuides } from '../../implementationGuides/loadCompiledIGs';

const dynamoDbDataService = new DynamoDbDataService(DynamoDb);

const topicArn = process.env.SUBSCRIPTIONS_TOPIC as string;

const streamSubscriptionMatcher = new StreamSubscriptionMatcher(dynamoDbDataService, topicArn, {
  fhirVersion,
  compiledImplementationGuides: loadImplementationGuides('fhir-works-on-aws-search-es')
});

exports.handler = async (event: any) => {
  await streamSubscriptionMatcher.match(event);
};
