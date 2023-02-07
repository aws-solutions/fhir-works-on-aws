import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
import AWS from 'aws-sdk';
import { ParsedFhirQueryParams, parseQueryString } from '../FhirQueryParser';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import getComponentLogger from '../loggerBuilder';

const logger = getComponentLogger();

export interface Subscription {
  subscriptionId: string;
  tenantId?: string;
  channelType: string;
  channelHeader: string[];
  channelPayload: string;
  endpoint: string;
  parsedCriteria: ParsedFhirQueryParams;
}

export interface SubscriptionNotification {
  subscriptionId: string;
  tenantId?: string;
  channelType: string;
  endpoint: string;
  channelPayload: string;
  channelHeader: string[];
  matchedResource: {
    id: string;
    resourceType: string;
    versionId: string;
    lastUpdated: string;
  };
}

export const buildNotification = (
  subscription: Subscription,
  resource: Record<string, any>
): SubscriptionNotification => ({
  subscriptionId: subscription.subscriptionId,
  // eslint-disable-next-line no-underscore-dangle
  tenantId: resource._tenantId,
  channelType: subscription.channelType,
  channelHeader: subscription.channelHeader,
  channelPayload: subscription.channelPayload,
  endpoint: subscription.endpoint,
  matchedResource: {
    // eslint-disable-next-line no-underscore-dangle
    id: resource._tenantId ? resource._id : resource.id,
    resourceType: resource.resourceType,
    lastUpdated: resource.meta?.lastUpdated,
    versionId: resource.meta?.versionId
  }
});

const isCreateOrUpdate = (dynamoDBRecord: DynamoDBRecord): boolean => {
  return dynamoDBRecord.eventName === 'INSERT' || dynamoDBRecord.eventName === 'MODIFY';
};

export const filterOutIneligibleResources = (
  dynamoDBStreamEvent: DynamoDBStreamEvent
): Record<string, any>[] => {
  return dynamoDBStreamEvent.Records.flatMap((dynamoDbRecord) => {
    if (!isCreateOrUpdate(dynamoDbRecord)) {
      // Subscriptions never match deleted resources
      return [];
    }
    if (dynamoDbRecord.dynamodb?.NewImage === undefined) {
      logger.error(
        'dynamodb.NewImage is missing from event. The stream event will be dropped. Is your stream correctly configured?'
      );
      return [];
    }
    const resource = AWS.DynamoDB.Converter.unmarshall(dynamoDbRecord.dynamodb.NewImage);

    if (resource.documentStatus !== 'AVAILABLE') {
      return [];
    }

    return [resource];
  });
};
export const parseSubscription = (
  resource: Record<string, any>,
  fhirSearchParametersRegistry: FHIRSearchParametersRegistry
): Subscription => {
  return {
    channelType: resource?.channel?.type,
    channelHeader: resource?.channel?.header || [],
    channelPayload: resource?.channel?.payload,
    endpoint: resource?.channel?.endpoint,
    parsedCriteria: parseQueryString(fhirSearchParametersRegistry, resource?.criteria),
    // eslint-disable-next-line no-underscore-dangle
    subscriptionId: resource._tenantId ? resource._id : resource.id,
    // eslint-disable-next-line no-underscore-dangle
    tenantId: resource?._tenantId
  };
};
