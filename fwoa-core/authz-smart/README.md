# fhir-works-on-aws-authz-smart

## Upgrade notice

Versions 3.1.1 and 3.1.2 of the `fhir-works-on-aws-authz-smart` package have been deprecated for necessary security updates. Please upgrade to version 3.1.3 or higher. For more information, see [the fhir-works-on-aws-authz-smart security advisory](https://github.com/awslabs/fhir-works-on-aws-authz-smart/security/advisories/GHSA-vv7x-7w4m-q72f).

## Purpose

This package is an implementation of the authorization interface from the [FHIR Works interface](https://github.com/awslabs/fhir-works-on-aws-interface/blob/mainline/src/authorization.ts). It uses the [Substitutable Medical Applications, Reusable Technologies (SMART on FHIR) specification v1.0.0](http://www.hl7.org/fhir/smart-app-launch/1.0.0) to authorize users. Requests are authorized if the requestor or the patient in context is [**referenced**](https://www.hl7.org/fhir/references.html) in the resource in question.

To use and deploy this component please follow the overall [`smart-mainline` branch README](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/smart-mainline)

## Assumptions

The following assumptions have been made while creating this package:

- An [OAuth2](https://oauth.net/2/) [OpenID Connect](https://openid.net/connect/) authorization server already exists and is used as, or in conjunction with, an identity provider.
  - The OAuth2 server complies with the [SMART on FHIR specification](https://docs.smarthealthit.org/)
  - The OAuth2 server has a JSON Web Key Set endpoint used to get the key for verifying incoming access tokens
- The identity provider has a user claim (either `fhirUser` or `profile`) representing who this user is in context to this FHIR server. This user must be represented by a fully qualified URL in the claim.
  - As an example, the `fhirUser` claim should look like: `https://www.fhir.com/Patient/1234`
  - When using `user` scopes it is assumed that the `fhirUser` will be in the access token to determine who the requestor is
- [`launch` scopes and contextual request](http://www.hl7.org/fhir/smart-app-launch/1.0.0/scopes-and-launch-context/#scopes-for-requesting-context-data) will be handled by the authorization server.
- Once launch context is given to the authorization server it will be included with a `patient` scope and the Patient's resourceType and id in the `launch_response_patient` claim within the access token.
  - As an example, the `launch_response_patient` claim should look like: `Patient/id`

## Authorization

This packages uses SMART scopes and the references found in the resources as a way to determine access. Scopes are used to tell the authorization and resource server what access the requestor has. In addition, the references are used to do further authorization, in an attribute based access control model.

### Scopes

This resource server supports [SMART' v1.0.0 clinical scopes](http://www.hl7.org/fhir/smart-app-launch/1.0.0/scopes-and-launch-context/#scopes-for-requesting-clinical-data). There are some assumptions made on the authorization and resource server relationship:

- For `patient` scopes, there must be a `launch_response_patient` claim in the access token. The access token with `patient` scopes but no `launch_response_patient` claim will be rejected.
- For `user` scopes, there must be a `fhirUser` claim in the access token. The access token with `user` scopes but no `fhirUser` claim will be rejected.
- The access modifiers `read` and `write` will give permissions as defined in the incoming [SMARTConfig](./src/smartConfig.ts).

The resource server also supports [SMART's Flat FHIR or Bulk Data `system` scope](https://hl7.org/fhir/uv/bulkdata/authorization/index.html#scopes). `system` scopes have the format `system/(:resourceType|*).(read|write|*)`– which conveys the same access scope as the matching user format `user/(:resourceType|*).(read|write|*)`.

### Attribute Based Access Control (ABAC)

This implementation of the SMART on FHIR specification uses attribute based access control. Access to a resource is given if one of the following statements is true:

- The fhirUser making the request is considered an Admin (default configuration makes a Practitioner an admin).
- The fhirUser making the request or the patient in context is looking up their own resource (verified via the `resourceType` and `id`).
- The fhirUser making the request or the patient in context is referenced in the resource in which they are taking action on.

As an example below, the Patient resource is accessible by:

- Admins of the system
- Requests with the usage of the `system` scope
- `Patient/example`: via `resourceType` and `id` check
- `Patient/diffPatient`: because it is referenced in the `link` field
- `Practitioner/DrBell`: because it is referenced in the `generalPractitioner` field

```json
// Example Patient resource with references
{
  "resourceType": "Patient",
  "id": "example",
  "generalPractitioner": [
    {
      "reference": "Practitioner/DrBell"
    }
  ],
  "link": [
    {
      "type": "seealso",
      "other": {
        "reference": "Patient/diffPatient"
      }
    }
  ],
  "address": [
    {
      "period": {
        "start": "1974-12-25"
      },
      "city": "London",
      "use": "home",
      "line": ["221b Baker St"],
      "district": "Marylebone",
      "postalCode": "6XE",
      "text": "221b Baker St, Marylebone, London NW1 6XE, United Kingdom",
      "type": "both"
    }
  ],
  "deceasedBoolean": false,
  "name": [
    {
      "family": "Holmes",
      "given": ["Sherlock"],
      "use": "official"
    }
  ],
  "gender": "male",
  "active": true
}
```

## Usage

Add this package to your `package.json` file and install as a dependency. For usage examples please see the deployment component's [package.json](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/smart-mainline/package.json)

### Configuration

The SMART specification gives a lot of room for interpretation between the resource and authorization server relationship. With this in mind we developed our SMART implementation to be flexible. The configurations currently available can be viewed in the [SMARTConfig](./src/smartConfig.ts).

### SMART on FHIR scope rules

Within the [SMARTConfig](./src/smartConfig.ts) you can see an example implementation of a ScopeRule. The ScopeRule says which operations a scope gives access to. For example, the `user/*.write` scope provides access to 'create' resource but not 'update' resource.

For an example usage of the SMARTConfig, please see [authZConfig.ts](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/smart-mainline/src/authZConfig.ts) in the deployment package.

## Dependency tree

This package is dependent on:

- [interface component](https://github.com/awslabs/fhir-works-on-aws-interface)
  - This package defines the interface we are trying to use

## Known issues

You can track the issues on the GitHub repository.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
