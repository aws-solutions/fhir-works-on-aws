/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { KeyObject } from 'crypto';
import { FhirVersion, UnauthorizedError } from '@aws/fhir-works-on-aws-interface';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
/* eslint-disable import/no-unresolved, import/default, import/namespace, import/no-named-as-default */
import fromKeyLike, { KeyLike } from 'jose/jwk/from_key_like';
import SignJWT from 'jose/jwt/sign';
import generateKeyPair from 'jose/util/generate_key_pair';
/* eslint-enable import/no-unresolved, import/default, import/namespace, import/no-named-as-default */
import jwksClient, { JwksClient } from 'jwks-rsa';
import {
  hasReferenceToResource,
  getFhirResource,
  getFhirUser,
  verifyJwtToken,
  introspectJwtToken
} from './smartAuthorizationHelper';
import { FhirResource, IntrospectionOptions } from './smartConfig';

const apiUrl = 'https://fhirServer.com';
const id = '1234';

describe('getFhirUser', () => {
  test('valid fhirUser', () => {
    expect(getFhirUser(`${apiUrl}/Practitioner/${id}`)).toEqual({
      hostname: apiUrl,
      id,
      resourceType: 'Practitioner'
    });
  });
  test('invalid fhirUser', () => {
    expect(() => {
      getFhirUser('invalidFhirUser');
    }).toThrowError(new UnauthorizedError("Requester's identity is in the incorrect format"));
  });
});
describe('getFhirResource', () => {
  const defaultHostname = 'http://default.com';
  test('valid fhirResource', () => {
    expect(getFhirResource(`${apiUrl}/Practitioner/${id}`, defaultHostname)).toEqual({
      hostname: apiUrl,
      id,
      resourceType: 'Practitioner'
    });
    expect(getFhirResource(`https://fhirServer1234.com/Organization/${id}`, defaultHostname)).toEqual({
      hostname: 'https://fhirServer1234.com',
      id,
      resourceType: 'Organization'
    });
  });
  test('valid fhirResource; With default hostname', () => {
    expect(getFhirResource(`Practitioner/${id}`, defaultHostname)).toEqual({
      hostname: defaultHostname,
      id,
      resourceType: 'Practitioner'
    });
    expect(getFhirResource(`Organization/${id}`, defaultHostname)).toEqual({
      hostname: defaultHostname,
      id,
      resourceType: 'Organization'
    });
  });
  test('invalid fhirResource', () => {
    expect(() => {
      getFhirResource(`bad.hostname/Practitioner/${id}`, defaultHostname);
    }).toThrowError(new UnauthorizedError('Resource is in the incorrect format'));
    expect(() => {
      getFhirResource('invalidFhirResource', defaultHostname);
    }).toThrowError(new UnauthorizedError('Resource is in the incorrect format'));
  });
});

describe('hasReferenceToResource', () => {
  const practitionerFhirUser: FhirResource = {
    hostname: apiUrl,
    id,
    resourceType: 'Practitioner'
  };
  const patientFhirUser: FhirResource = {
    hostname: apiUrl,
    id,
    resourceType: 'Patient'
  };
  const r4Version: FhirVersion = '4.0.1';
  test('requester is a Practitioner; does not have access', () => {
    expect(hasReferenceToResource(practitionerFhirUser, {}, apiUrl, r4Version)).toEqual(false);
  });
  test('requester is a External Practitioner', () => {
    expect(hasReferenceToResource(practitionerFhirUser, {}, 'different.ApiServer.com', r4Version)).toEqual(
      false
    );
    expect(
      hasReferenceToResource(
        practitionerFhirUser,
        {
          resourceType: 'Patient',
          id: '1',
          generalPractitioner: { reference: `${apiUrl}/Practitioner/${id}` }
        },
        'different.ApiServer.com',
        r4Version
      )
    ).toEqual(true);
  });
  test('Bad fhir version', () => {
    expect(() => {
      hasReferenceToResource(practitionerFhirUser, {}, 'different.ApiServer.com', <FhirVersion>'2.0.0');
    }).toThrowError(new Error('Unsupported FHIR version detected'));
  });

  const cases: (string | any | boolean)[] = [
    [
      'single potential path first nested arrays',
      {
        contact: [
          { organization: { reference: `${apiUrl}/Organization/${id}432` } },
          { organization: { reference: `${apiUrl}/Organization/${id}` } },
          { organization: { reference: `${apiUrl}/Organization/${id}5234` } }
        ]
      },
      true
    ],
    [
      'single potential path last nested arrays',
      {
        contact: {
          organization: [
            { uri: `Organization/${id}4321` },
            { reference: `Organization/${id}1234` },
            { reference: `Organization/${id}` }
          ]
        }
      },
      true
    ],
    [
      'single potential path 2 nested arrays',
      {
        contact: [
          {
            organization: [
              { uri: `Organization/${id}4321` },
              { reference: `Organization/${id}1234` },
              { code: `Organization/${id}` }
            ]
          },
          { organization: { reference: `${apiUrl}/Organization/${id}1234` } },
          { organization: { reference: `${apiUrl}/Organization/${id}` } }
        ]
      },
      true
    ],
    [
      '2 potential paths',
      {
        contact: [
          { organization: [{ uri: `Organization/${id}4321` }, { reference: `Organization/${id}1234` }] }
        ],
        generalPractitioner: { reference: `Organization/${id}` }
      },
      true
    ],
    [
      'all potential paths',
      {
        contact: [
          { organization: [{ uri: `Organization/${id}4321` }, { reference: `Organization/${id}1234` }] }
        ],
        generalPractitioner: { reference: `Practitioner/${id}` },
        managingOrganization: [
          { reference: `Organization/${id}1234` },
          { reference: `${apiUrl}/Organization/${id}` }
        ]
      },
      true
    ],
    [
      'all potential paths; no references',
      {
        contact: [
          { organization: [{ uri: `Organization/${id}4321` }, { reference: `Organization/${id}1234` }] }
        ],
        generalPractitioner: { reference: `Practitioner/${id}` },
        managingOrganization: [
          { reference: `Organization/${id}1234` },
          { reference: `Organization/${id}none` }
        ]
      },
      false
    ]
  ];

  test.each(cases)('references in arrays; %p', (_message: string, refObject: any, expectedValue: boolean) => {
    // potential paths: "Organization":["contact.organization","generalPractitioner","managingOrganization"]
    const organizationFhirUser: FhirResource = {
      hostname: apiUrl,
      id,
      resourceType: 'Organization'
    };
    expect(
      hasReferenceToResource(
        organizationFhirUser,
        { ...{ resourceType: 'Patient', id: '1' }, ...refObject },
        apiUrl,
        r4Version
      )
    ).toEqual(expectedValue);
  });

  const versions: FhirVersion[] = ['4.0.1', '3.0.1'];
  describe.each(versions)(
    'requestor is a Patient; Resources are single layer; FHIR Version %p',
    (fhirVersion) => {
      test('fhirUser id matches resource id', () => {
        expect(
          hasReferenceToResource(patientFhirUser, { resourceType: 'Patient', id }, apiUrl, fhirVersion)
        ).toEqual(true);
        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id },
            'different.ApiServer.com',
            fhirVersion
          )
        ).toEqual(false);
      });

      test('fhirUser referenced in resource; Resources uses [x] properties', () => {
        const groupFhirUser: FhirResource = {
          hostname: apiUrl,
          id,
          resourceType: 'Medication'
        };
        expect(
          hasReferenceToResource(
            groupFhirUser,
            {
              resourceType: 'ActivityDefinition',
              id: '1',
              status: 'active',
              productReference: { reference: `${apiUrl}/Medication/${id}` }
            },
            'Difference.api',
            fhirVersion
          )
        ).toEqual(true);
      });

      test('local fhirUser referenced in resource', () => {
        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id: '1', link: { other: { reference: `Patient/${id}` } } },
            apiUrl,
            fhirVersion
          )
        ).toEqual(true);

        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id: '1', link: { other: { reference: `${apiUrl}/Patient/${id}` } } },
            apiUrl,
            fhirVersion
          )
        ).toEqual(true);

        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id: '1', generalPractitioner: { reference: `Patient/${id}` } },
            apiUrl,
            fhirVersion
          )
        ).toEqual(false);
      });
      test('external fhirUser referenced in resource', () => {
        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id: '1', link: { other: { reference: `Patient/${id}` } } },
            'different.ApiServer.com',
            fhirVersion
          )
        ).toEqual(false);

        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id: '1', link: { other: { reference: `${apiUrl}/Patient/${id}` } } },
            'different.ApiServer.com',
            fhirVersion
          )
        ).toEqual(true);

        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Patient', id: '1', generalPractitioner: { reference: `Patient/${id}` } },
            'different.ApiServer.com',
            fhirVersion
          )
        ).toEqual(false);
      });

      test('fhirUser referenced in text', () => {
        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Observation', id: '1', text: '"reference":"Patient/1234"' },
            apiUrl,
            fhirVersion
          )
        ).toEqual(false);
        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Observation', id: '1', text: "'reference':'Patient/1234'" },
            apiUrl,
            fhirVersion
          )
        ).toEqual(false);
        expect(
          hasReferenceToResource(
            patientFhirUser,
            { resourceType: 'Observation', id: '1', text: '"reference":"Patient/1234"' },
            apiUrl,
            fhirVersion
          )
        ).toEqual(false);
      });
    }
  );
});

function getDefaultPayload(iat: number, exp: number, aud: string | string[], iss: string | string[]) {
  return {
    ver: 1,
    jti: 'AT.6a7kncTCpu1X9eo2QhH1z_WLUK4TyV43n_9I6kZNwPY',
    iss,
    aud,
    iat,
    exp,
    cid: '0oa8muazKSyk9gP5y5d5',
    uid: '00u85ozwjjWRd17PB5d5',
    scp: ['fhirUser', 'openid', 'profile', 'launch/encounter', 'patient/Patient.read'],
    sub: 'example@example.com',
    fhirUser: 'Practitioner/1234'
  };
}
async function getSignedJwt(
  payload: any,
  kid: string,
  privateKey: KeyLike,
  headerContainsKidAttribute: boolean = true
) {
  let header: any = { alg: 'RS256', type: 'JWT' };
  if (headerContainsKidAttribute) {
    header = { ...header, kid };
  }
  return new SignJWT(payload).setProtectedHeader(header).sign(privateKey);
}

describe('verifyJwt', () => {
  const kid = 'abcd1234';

  let privateKey: KeyObject;
  let client: JwksClient;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256');
    const { publicKey } = keyPair;
    privateKey = <KeyObject>keyPair.privateKey;
    const jwk = { ...(await fromKeyLike(publicKey)), kid };
    client = jwksClient({
      jwksUri: 'http://exampleAuthServer.com/oauth2',
      getKeysInterceptor: (cb) => {
        // @ts-ignore
        return cb(null, [jwk]);
      }
    });
  });

  const expectedAudValue = 'api://default';
  const expectedIssValue = 'https://exampleAuthServer.com/oauth2';

  test('JWT is valid and verified', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(verifyJwtToken(jwt, expectedAudValue, expectedIssValue, client)).resolves.toEqual(payload);
  });

  test('JWT does not include "kid" attribute in header', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const jwt = await getSignedJwt(payload, kid, privateKey, false);
    return expect(verifyJwtToken(jwt, expectedAudValue, expectedIssValue, client)).rejects.toThrowError(
      new UnauthorizedError('Invalid access token')
    );
  });

  test('jwt expired', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000) - 10,
      Math.floor(Date.now() / 1000) - 1,
      expectedAudValue,
      expectedIssValue
    );
    const jwt = await getSignedJwt(payload, kid, privateKey);

    return expect(verifyJwtToken(jwt, expectedAudValue, expectedIssValue, client)).rejects.toThrowError(
      new UnauthorizedError('Invalid access token')
    );
  });

  test('invalid jwt', () => {
    const token = 'abc';

    return expect(verifyJwtToken(token, expectedAudValue, expectedIssValue, client)).rejects.toThrowError(
      new UnauthorizedError('Invalid access token')
    );
  });

  describe('aud is incorrect', () => {
    const cases: (string | string[])[][] = [
      ['Single incorrect string aud value', 'aud1'],
      ['Aud array that does not contain expected aud value', ['aud1', 'aud2']]
    ];
    test.each(cases)('CASE: %p', async (testCase, aud) => {
      const payload = getDefaultPayload(
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 10,
        aud,
        expectedIssValue
      );
      const jwt = await getSignedJwt(payload, kid, privateKey);
      return expect(
        verifyJwtToken(jwt, expectedAudValue, 'https://exampleAuthServer.com/oauth2', client)
      ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
    });
  });

  describe('aud is correct', () => {
    const cases: (string | string[])[][] = [
      ['Single correct aud value', expectedAudValue],
      ['Aud array contain expected aud value', ['aud1', expectedAudValue]]
    ];
    test.each(cases)('CASE: %p', async (testCase, aud) => {
      const payload = getDefaultPayload(
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 10,
        aud,
        expectedIssValue
      );
      const jwt = await getSignedJwt(payload, kid, privateKey);
      return expect(
        verifyJwtToken(jwt, expectedAudValue, 'https://exampleAuthServer.com/oauth2', client)
      ).resolves.toEqual(payload);
    });

    test('aud provided as RegExp', async () => {
      const aud = 'api://default';
      const audRegExp = /api:\/\/([a-z])+/;

      const payload = getDefaultPayload(
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 10,
        aud,
        expectedIssValue
      );
      const jwt = await getSignedJwt(payload, kid, privateKey);
      return expect(verifyJwtToken(jwt, audRegExp, expectedIssValue, client)).resolves.toEqual(payload);
    });
  });

  test('iss is incorrect', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(verifyJwtToken(jwt, expectedAudValue, 'fakeIss', client)).rejects.toThrowError(
      new UnauthorizedError('Invalid access token')
    );
  });
});

describe('introspectJwtToken', () => {
  const expectedAudValue = 'api://default';
  const expectedIssValue = 'https://exampleAuthServer.com/oauth2';
  const introspectUrl = `${expectedIssValue}/v1/introspect`;
  const introspectionOptions: IntrospectionOptions = {
    clientId: '123',
    clientSecret: '1234',
    introspectUrl
  };
  const kid = 'abcd1234';

  let privateKey: KeyObject;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256');
    privateKey = <KeyObject>keyPair.privateKey;
  });

  test('valid and verified', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).reply(200, {
      ...payload,
      active: true
    });

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).resolves.toEqual({
      ...payload
    });
  });

  test('Introspection returns 200 with active set to false', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      `${expectedIssValue}`
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).reply(200, {
      active: false
    });

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });

  test('Introspection returns 400', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).reply(400, {
      active: false
    });

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });
  test('Introspection returns 401', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).reply(401, {
      active: false
    });

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });
  test('Introspection returns 403', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).reply(403, {
      active: false
    });

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });
  test('Introspection returns 500', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).reply(500, {
      active: false
    });

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });
  test('Introspection returns network error', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).networkError();

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });
  test('Introspection returns timeout', async () => {
    const payload = getDefaultPayload(
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 10,
      expectedAudValue,
      expectedIssValue
    );
    const mock = new MockAdapter(axios);
    mock.onPost(introspectUrl).timeout();

    const jwt = await getSignedJwt(payload, kid, privateKey);
    return expect(
      introspectJwtToken(jwt, expectedAudValue, expectedIssValue, introspectionOptions)
    ).rejects.toThrowError(new UnauthorizedError('Invalid access token'));
  });
});
