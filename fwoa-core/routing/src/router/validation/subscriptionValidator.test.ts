/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { InvalidResourceError, Search, Persistence } from '@aws/fhir-works-on-aws-interface';
import invalidPatient from '../../sampleData/invalidV4Patient.json';
import validPatient from '../../sampleData/validV4Patient.json';
import DynamoDbDataService from '../__mocks_/dynamoDbDataService';
import ElasticSearchService from '../__mocks_/elasticSearchService';
import SubscriptionValidator, { SubscriptionEndpoint } from './subscriptionValidator';

const search: Search = ElasticSearchService;
const persistence: Persistence = DynamoDbDataService;

const getSubscriptionResource = (endpoint: string) => {
  return {
    resourceType: 'Subscription',
    status: 'requested',
    reason: 'Monitor Patients for Organization 123',
    criteria: 'Patient?managing-organization=Organization/123',
    channel: {
      type: 'rest-hook',
      endpoint,
      payload: 'application/fhir+json',
      header: ['Authorization: Bearer secret-token-abc-123']
    }
  };
};

const getBundleResource = (resourceToAdd: { resourceType: string }) => {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      {
        fullUrl: 'urn:uuid:some-fake-uuid',
        resource: invalidPatient,
        request: {
          method: 'POST',
          url: 'Patient'
        }
      },
      {
        fullUrl: 'urn:uuid:another-fake-uuid',
        resource: resourceToAdd,
        request: {
          method: 'POST',
          url: resourceToAdd.resourceType
        }
      },
      {
        request: {
          method: 'DELETE',
          url: 'Patient/some-fake-id'
        }
      }
    ]
  };
};

const multiTenantAllowList: SubscriptionEndpoint[] = [
  {
    endpoint: 'https://fake-end-point-tenant1',
    headers: ['header-name: header-value'],
    tenantId: 'tenant1'
  },
  {
    endpoint: new RegExp('^https://fake-end-point-tenant2'),
    headers: ['header-name: header-value'],
    tenantId: 'tenant2'
  }
];

const singleTenantAllowList: SubscriptionEndpoint[] = [
  {
    endpoint: 'https://fake-end-point-1',
    headers: ['header-name: header-value']
  },
  {
    endpoint: new RegExp('^https://fake-end-point-2'),
    headers: ['header-name: header-value']
  }
];

const multiTenantValidator = new SubscriptionValidator(search, persistence, multiTenantAllowList, {
  enableMultiTenancy: true
});
const singleTenantValidator = new SubscriptionValidator(search, persistence, singleTenantAllowList);

beforeEach(() => {
  persistence.getActiveSubscriptions = jest.fn().mockResolvedValueOnce(Array(20));
});

describe.each([
  ['multi-tenancy mode', multiTenantValidator, 'https://fake-end-point-tenant1', 'tenant1'],
  ['single-tenancy mode', singleTenantValidator, 'https://fake-end-point-2', undefined]
])(
  'Valid resources in %s',
  (testName: string, validator: SubscriptionValidator, endpoint: string, tenantId: string | undefined) => {
    test('No error when validating valid Subscription resource', async () => {
      const subscription = getSubscriptionResource(endpoint);
      await expect(validator.validate(subscription, { tenantId })).resolves.toEqual(undefined);
    });

    test('No error when validating valid Bundle resource that contains valid Subscription resource', async () => {
      const subscription = getSubscriptionResource(endpoint);
      const bundle = getBundleResource(subscription);
      await expect(validator.validate(bundle, { tenantId })).resolves.toEqual(undefined);
    });

    test('No error when validating resources that are not Subscription or Bundle', async () => {
      await expect(validator.validate(invalidPatient, { tenantId })).resolves.toEqual(undefined);
    });

    test('No error when validating Bundle that does not contain Subscription resource', async () => {
      const bundle = getBundleResource(validPatient);
      await expect(validator.validate(bundle, { tenantId })).resolves.toEqual(undefined);
    });

    test('No error when updating existing Subscription if active subscription is already at 300', async () => {
      persistence.getActiveSubscriptions = jest.fn().mockResolvedValueOnce(Array(300));
      const subscription = getSubscriptionResource(endpoint);
      await expect(validator.validate(subscription, { typeOperation: 'update', tenantId })).resolves.toEqual(
        undefined
      );
    });
  }
);

describe.each([
  ['multi-tenancy mode', multiTenantValidator, 'https://fake-end-point-tenant2', 'tenant2'],
  ['single-tenancy mode', singleTenantValidator, 'https://fake-end-point-1', undefined]
])(
  'Invalid resource in %s',
  (testName: string, validator: SubscriptionValidator, endpoint: string, tenantId: string | undefined) => {
    test('Show error when status is not "requested" or "off"', async () => {
      const subscription = getSubscriptionResource(endpoint);
      subscription.status = 'active';
      await expect(validator.validate(subscription, { tenantId })).rejects.toThrowError(
        new InvalidResourceError(
          "Subscription resource is not valid. Error was: data/status should be 'requested' or 'off'"
        )
      );
    });

    test('Show error when payload is not application/fhir+json', async () => {
      const subscription = getSubscriptionResource(endpoint);
      subscription.channel.payload = 'application/xml';
      await expect(validator.validate(subscription, { tenantId })).rejects.toThrowError(
        new InvalidResourceError(
          "Subscription resource is not valid. Error was: data/channel/payload should be equal to 'application/fhir+json'"
        )
      );
    });

    test('Show error when endpoint is not https', async () => {
      const subscription = getSubscriptionResource(endpoint);
      subscription.channel.endpoint = 'http://fake-end-point';
      await expect(validator.validate(subscription, { tenantId })).rejects.toThrowError(
        new InvalidResourceError(
          'Subscription resource is not valid. Error was: data/channel/endpoint should match pattern "^https:"'
        )
      );
    });

    test('Show error when validating Bundle resource that has invalid Subscription resource', async () => {
      const subscription = getSubscriptionResource(endpoint);
      subscription.channel.type = 'email';
      const bundle = getBundleResource(subscription);
      await expect(validator.validate(bundle, { tenantId })).rejects.toThrowError(
        new InvalidResourceError(
          "Subscription resource is not valid. Error was: data/channel/type should be equal to 'rest-hook'"
        )
      );
    });

    test('Show error when creating new Subscription if active subscription is already at 300', async () => {
      persistence.getActiveSubscriptions = jest.fn().mockResolvedValueOnce(Array(300));
      const subscription = getSubscriptionResource(endpoint);
      await expect(
        validator.validate(subscription, { typeOperation: 'create', tenantId })
      ).rejects.toThrowError(new Error('Number of active subscriptions are exceeding the limit of 300'));
    });

    test('Show error when creating 2 new Subscriptions with Bundle if active subscription is at 299', async () => {
      persistence.getActiveSubscriptions = jest.fn().mockResolvedValueOnce(Array(300));
      const subscription = getSubscriptionResource(endpoint);
      const bundle = getBundleResource(subscription);
      bundle.entry.push({
        fullUrl: 'urn:uuid:another-fake-uuid-2',
        resource: subscription,
        request: {
          method: 'POST',
          url: subscription.resourceType
        }
      });
      await expect(validator.validate(bundle, { tenantId })).rejects.toThrowError(
        new Error(
          'Number of active subscriptions are exceeding the limit of 300. Please delete or deactivate subscriptions first, then create new Subscriptions in another request.'
        )
      );
    });
  }
);

describe('Multi-tenancy mode', () => {
  test('Show error when endpoint is not allow listed', async () => {
    const subscription = getSubscriptionResource('https://fake-end-point-tenant1');
    await expect(multiTenantValidator.validate(subscription, { tenantId: 'tenant2' })).rejects.toThrowError(
      new InvalidResourceError(
        'Subscription resource is not valid. Endpoint https://fake-end-point-tenant1 is not allow listed.'
      )
    );
  });

  test('Show error when tenantId is undefined', async () => {
    const subscription = getSubscriptionResource('https://fake-end-point-tenant1');
    await expect(multiTenantValidator.validate(subscription, {})).rejects.toThrowError(
      new InvalidResourceError(
        'This instance has multi-tenancy enabled, but the incoming request is missing tenantId'
      )
    );
  });
});

describe('Single-tenancy mode', () => {
  test('Show error when endpoint is not allow listed', async () => {
    const subscription = getSubscriptionResource('https://fake-end-point-3');
    await expect(singleTenantValidator.validate(subscription, {})).rejects.toThrowError(
      new InvalidResourceError(
        'Subscription resource is not valid. Endpoint https://fake-end-point-3 is not allow listed.'
      )
    );
  });

  test('Show error when tenantId is defined', async () => {
    const subscription = getSubscriptionResource('https://fake-end-point-1');
    await expect(singleTenantValidator.validate(subscription, { tenantId: 'tenant1' })).rejects.toThrowError(
      new InvalidResourceError(
        'This instance has multi-tenancy disabled, but the incoming request has a tenantId'
      )
    );
  });
});
