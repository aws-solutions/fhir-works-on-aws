/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Auth } from '@aws/fhir-works-on-aws-interface';

export default function makeSecurity(authConfig: Auth, hasCORSEnabled: boolean = false) {
  if (authConfig.strategy.service) {
    let security = {
      cors: hasCORSEnabled,
      service: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
              code: authConfig.strategy.service
            }
          ]
        }
      ]
    };
    const { oauthPolicy } = authConfig.strategy;
    if (oauthPolicy) {
      const extension = [
        {
          url: 'token',
          valueUri: oauthPolicy.tokenEndpoint
        },
        {
          url: 'authorize',
          valueUri: oauthPolicy.authorizationEndpoint
        }
      ];
      if (oauthPolicy.managementEndpoint) {
        extension.push({
          url: 'manage',
          valueUri: oauthPolicy.managementEndpoint
        });
      }
      if (oauthPolicy.introspectionEndpoint) {
        extension.push({
          url: 'introspect',
          valueUri: oauthPolicy.introspectionEndpoint
        });
      }
      if (oauthPolicy.revocationEndpoint) {
        extension.push({
          url: 'revoke',
          valueUri: oauthPolicy.revocationEndpoint
        });
      }
      if (oauthPolicy.registrationEndpoint) {
        extension.push({
          url: 'register',
          valueUri: oauthPolicy.registrationEndpoint
        });
      }
      security = {
        ...security,
        ...{
          extension: [
            {
              url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
              extension
            }
          ],
          description: 'Uses OAuth2 as a way to authentication & authorize users'
        }
      };
    }
    return security;
  }

  return {
    cors: hasCORSEnabled,
    description: 'No authentication has been set up'
  };
}
