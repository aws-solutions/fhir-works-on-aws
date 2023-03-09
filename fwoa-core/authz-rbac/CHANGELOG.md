# Change Log - @aws/fhir-works-on-aws-authz-rbac

This log was last generated on Thu, 09 Mar 2023 15:32:50 GMT and should not be manually modified.

## 5.0.1

Mon, 06 Mar 2023 14:22:44 GMT

_Version update only_

## 5.0.0

Tue, 17 Aug 2021 20:22:44 GMT

### Breaking changes

- `verifyAccessToken` now allows bulk export requests when the user has read permissions on SOME of the requested resource types instead of requiring permissions on ALL of them. This allows partial exports scoped to the user's permissions. Clients are expected to call `getAllowedResourceTypesForOperation` to scope down the resource types to export.

### Minor changes

- allow partial patient and group export ([#29](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/29)) ([dd07460](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/commit/dd07460f1b966375af9daed066b244458cfa5b58)), closes [#27](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/27)

## 4.1.1

Wed, 27 Jan 2021 20:22:44 GMT

_Version update only_

## 4.1.0

Wed, 13 Jan 2021 20:22:44 GMT

### Minor changes

- Implement 'getSearchFilterBasedOnIdentity' ([#20](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/20)) ([0b3d738](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/commit/0b3d738280b07aa0e0adfd0aa7398adc0e6025a5))

## 4.0.1

Mon, 07 Dec 2020 20:22:44 GMT

_Version update only_

## 4.0.0

Tue, 20 Oct 2020 20:22:44 GMT

### Breaking changes

- Implement `fhir-works-on-aws-interface` v4.0.0
- - Authorization interfaces to use `userIdentity` instead of access_token
- - `isAuthorized` renamed to `verifyAccessToken`
- - `getRequesterUserId` method removed, as it is now redundant

## 3.0.0

Tue, 11 Aug 2020 20:22:44 GMT

### Breaking changes

- Implement `fhir-works-on-aws-interface` v3.0.0
- - This adds 4 new methods to this package
- - Throwing UnauthorizedError instead of a boolean

## 2.0.0

Fri, 25 Sep 2020 20:22:44 GMT

### Breaking changes

- Implement `fhir-works-on-aws-interface` v2.0.0

## 1.0.0

Tue, 31 Aug 2020 20:22:44 GMT

### Breaking changes

- Initial launch! :rocket:
