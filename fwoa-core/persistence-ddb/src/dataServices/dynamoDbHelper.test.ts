import { ResourceNotFoundError } from '@aws/fhir-works-on-aws-interface';
import AWS from 'aws-sdk';
import { QueryInput } from 'aws-sdk/clients/dynamodb';
import * as AWSMock from 'aws-sdk-mock';
import { cloneDeep } from 'lodash';
import { ConditionalCheckFailedExceptionMock } from '../testUtilities/ConditionalCheckFailedException';
import { utcTimeRegExp } from '../testUtilities/regExpressions';
import DOCUMENT_STATUS from './documentStatus';
import { DynamoDBConverter } from './dynamoDb';
import DynamoDbHelper from './dynamoDbHelper';
import { DOCUMENT_STATUS_FIELD, DynamoDbUtil } from './dynamoDbUtil';

AWSMock.setSDKInstance(AWS);

const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
const resourceType = 'Patient';
const resource: any = {
  id,
  vid: 1,
  resourceType: 'Patient',
  name: [
    {
      family: 'Jameson',
      given: ['Matt']
    }
  ],
  meta: { versionId: '1', lastUpdated: new Date().toISOString() }
};
resource[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.AVAILABLE;

function getExpectedResponse(res: any, versionId: string) {
  let expectedResource: any = cloneDeep(res);
  expectedResource = DynamoDbUtil.cleanItem(expectedResource);
  expectedResource.meta = { versionId, lastUpdated: expect.stringMatching(utcTimeRegExp) };

  return {
    message: 'Resource found',
    resource: expectedResource
  };
}
describe('getMostRecentResource', () => {
  afterEach(() => {
    AWSMock.restore();
  });
  test('SUCCESS: Found most recent resource', async () => {
    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {
        Items: [DynamoDBConverter.marshall(resource)]
      });
    });

    const expectedResponse = getExpectedResponse(resource, '1');

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    await expect(ddbHelper.getMostRecentResource(resourceType, id)).resolves.toEqual(expectedResponse);
  });
  test('FAILED: resourceType of request does not match resourceType retrieved', async () => {
    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(new ConditionalCheckFailedExceptionMock(), {});
    });

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    await expect(ddbHelper.getMostRecentResource(resourceType, id)).rejects.toThrowError(
      new ResourceNotFoundError(resourceType, id)
    );
  });

  test('FAILED: Resource not found', async () => {
    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {});
    });

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    await expect(ddbHelper.getMostRecentResource(resourceType, id)).rejects.toThrowError(
      new ResourceNotFoundError(resourceType, id)
    );
  });
});

describe('getMostRecentValidResource', () => {
  afterEach(() => {
    AWSMock.restore();
  });
  const v2Resource = cloneDeep(resource);
  v2Resource.meta = { versionId: '2', lastUpdated: new Date().toISOString() };
  v2Resource.name = [
    {
      family: 'Smith',
      given: ['Matt']
    }
  ];
  v2Resource.vid = 2;

  test('SUCCESS: Latest version is in AVAILABLE status', async () => {
    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {
        Items: [DynamoDBConverter.marshall(v2Resource), DynamoDBConverter.marshall(resource)]
      });
    });

    const expectedResponse = getExpectedResponse(v2Resource, '2');

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    // If latest version is in AVAILABLE status, then the resource being returned should be the latest version
    await expect(ddbHelper.getMostRecentUserReadableResource(resourceType, id)).resolves.toEqual(
      expectedResponse
    );
  });

  test('SUCCESS: Second latest version is in AVAILABLE status', async () => {
    const clonedV2Resource = cloneDeep(v2Resource);
    clonedV2Resource[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;

    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {
        Items: [DynamoDBConverter.marshall(clonedV2Resource), DynamoDBConverter.marshall(resource)]
      });
    });

    const expectedResponse = getExpectedResponse(resource, '1');

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    // If latest version is in PENDING status, then the resource being returned should be the second latest version
    await expect(ddbHelper.getMostRecentUserReadableResource(resourceType, id)).resolves.toEqual(
      expectedResponse
    );
  });

  test('FAILED: resourceType of request does not match resourceType retrieved', async () => {
    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(new ConditionalCheckFailedExceptionMock(), {});
    });

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    await expect(ddbHelper.getMostRecentUserReadableResource(resourceType, id)).rejects.toThrowError(
      new ResourceNotFoundError(resourceType, id)
    );
  });

  test('FAILED: Resource not found', async () => {
    // READ items (Success)
    AWSMock.mock('DynamoDB', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {});
    });

    const ddbHelper = new DynamoDbHelper(new AWS.DynamoDB());
    await expect(ddbHelper.getMostRecentUserReadableResource(resourceType, id)).rejects.toThrowError(
      new ResourceNotFoundError(resourceType, id)
    );
  });
});
