import { DynamoDBStreamEvent } from 'aws-lambda/trigger/dynamodb-stream';
import { FHIRSearchParametersRegistry } from '../FHIRSearchParametersRegistry';
import { buildNotification, filterOutIneligibleResources, parseSubscription } from './subscriptions';

describe('filterOutIneligibleResources', () => {
  const dynamoDBStreamEvent = (): DynamoDBStreamEvent => ({
    Records: [
      {
        eventID: '3db0558e9432f45190f2adfae4bdfaed',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-west-2',
        dynamodb: {
          ApproximateCreationDateTime: 1629925579,
          Keys: {
            vid: {
              N: '1'
            },
            id: {
              S: 'b75eef29-4d3b-4454-ba27-6436e55d6a29'
            }
          },
          NewImage: {
            vid: {
              N: '1'
            },
            documentStatus: {
              S: 'AVAILABLE'
            },
            id: {
              S: 'b75eef29-4d3b-4454-ba27-6436e55d6a29'
            },
            resourceType: {
              S: 'Patient'
            }
          },
          SequenceNumber: '330610500000000075165486233',
          SizeBytes: 322,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        },
        eventSourceARN:
          'arn:aws:dynamodb:us-west-2:555555555555:table/resource-db-dev/stream/2021-06-17T09:08:31.388'
      }
    ]
  });

  test('good event', () => {
    expect(filterOutIneligibleResources(dynamoDBStreamEvent())).toMatchInlineSnapshot(`
            Array [
              Object {
                "documentStatus": "AVAILABLE",
                "id": "b75eef29-4d3b-4454-ba27-6436e55d6a29",
                "resourceType": "Patient",
                "vid": 1,
              },
            ]
        `);
  });

  describe('Ineligible Resources', () => {
    test('REMOVE event name', () => {
      const event = dynamoDBStreamEvent();
      event.Records[0].eventName = 'REMOVE';
      expect(filterOutIneligibleResources(event)).toMatchInlineSnapshot(`Array []`);
    });

    test('documentStatus is not active', () => {
      const event = dynamoDBStreamEvent();
      event.Records[0].dynamodb!.NewImage!.documentStatus.S = 'LOCKED';
      expect(filterOutIneligibleResources(event)).toMatchInlineSnapshot(`Array []`);
    });
  });
});

describe('buildNotification', () => {
  test('maps fields correctly ', () => {
    const notification = buildNotification(
      {
        channelType: 'rest-hook',
        channelHeader: ['SomeHeader: token-abc-123'],
        channelPayload: 'application/fhir+json',
        endpoint: 'https://endpoint.com',
        parsedCriteria: { searchParams: [], resourceType: 'DocumentReference' },
        subscriptionId: '111',
        tenantId: 't1'
      },
      {
        meta: {
          lastUpdated: '2021-10-08T12:37:44.998Z',
          versionId: '1'
        },
        id: '222',
        resourceType: 'DocumentReference'
      }
    );

    expect(notification).toMatchInlineSnapshot(`
            Object {
              "channelHeader": Array [
                "SomeHeader: token-abc-123",
              ],
              "channelPayload": "application/fhir+json",
              "channelType": "rest-hook",
              "endpoint": "https://endpoint.com",
              "matchedResource": Object {
                "id": "222",
                "lastUpdated": "2021-10-08T12:37:44.998Z",
                "resourceType": "DocumentReference",
                "versionId": "1",
              },
              "subscriptionId": "111",
              "tenantId": undefined,
            }
        `);
  });

  test('multi-tenant id', () => {
    const notification = buildNotification(
      {
        channelType: 'rest-hook',
        channelHeader: ['SomeHeader: token-abc-123'],
        channelPayload: 'application/fhir+json',
        endpoint: 'https://endpoint.com',
        parsedCriteria: { searchParams: [], resourceType: 'DocumentReference' },
        subscriptionId: '111',
        tenantId: 't1'
      },
      {
        meta: {
          lastUpdated: '2021-10-08T12:37:44.998Z',
          versionId: '1'
        },
        _tenantId: 't1',
        id: 't1|222',
        _id: '222',
        resourceType: 'DocumentReference'
      }
    );

    expect(notification).toMatchInlineSnapshot(`
            Object {
              "channelHeader": Array [
                "SomeHeader: token-abc-123",
              ],
              "channelPayload": "application/fhir+json",
              "channelType": "rest-hook",
              "endpoint": "https://endpoint.com",
              "matchedResource": Object {
                "id": "222",
                "lastUpdated": "2021-10-08T12:37:44.998Z",
                "resourceType": "DocumentReference",
                "versionId": "1",
              },
              "subscriptionId": "111",
              "tenantId": "t1",
            }
        `);
  });
});

describe('parseSubscription', () => {
  test('maps fields correctly', () => {
    expect(
      parseSubscription(
        {
          resourceType: 'Subscription',
          id: 'example',
          text: {
            status: 'generated',
            div: '<div xmlns="http://www.w3.org/1999/xhtml">[Put rendering here]</div>'
          },
          status: 'requested',
          contact: [
            {
              system: 'phone',
              value: 'ext 4123'
            }
          ],
          end: '2021-01-01T00:00:00Z',
          reason: 'Monitor new neonatal function',
          criteria: 'Observation?',
          channel: {
            type: 'rest-hook',
            endpoint: 'https://biliwatch.com/customers/mount-auburn-miu/on-result',
            payload: 'application/fhir+json',
            header: ['SomeHeader: token-abc-123']
          }
        },
        new FHIRSearchParametersRegistry('4.0.1')
      )
    ).toMatchInlineSnapshot(`
            Object {
              "channelHeader": Array [
                "SomeHeader: token-abc-123",
              ],
              "channelPayload": "application/fhir+json",
              "channelType": "rest-hook",
              "endpoint": "https://biliwatch.com/customers/mount-auburn-miu/on-result",
              "parsedCriteria": Object {
                "resourceType": "Observation",
                "searchParams": Array [],
              },
              "subscriptionId": "example",
              "tenantId": undefined,
            }
        `);
  });
});
