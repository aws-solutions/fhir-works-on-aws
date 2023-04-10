# Change Log - @aws/fhir-works-on-aws-authz-rbac

This log was last generated on Mon, 10 Apr 2023 15:50:12 GMT and should not be manually modified.

## 6.0.1

Mon, 10 Apr 2023 15:50:12 GMT

### Patches

- update homepage and repository link

## 6.0.0

Mon, 03 Apr 2023 19:20:41 GMT

### Breaking changes

- deprecated serverless

## 5.0.0

2021-08-17

### Breaking changes

- `verifyAccessToken` now allows bulk export requests when the user has read permissions on SOME of the requested resource types instead of requiring permissions on ALL of them. This allows partial exports scoped to the user's permissions. Clients are expected to call `getAllowedResourceTypesForOperation` to scope down the resource types to export.

### Minor changes

- allow partial patient and group export ([#29](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/29)) ([dd07460](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/commit/dd07460f1b966375af9daed066b244458cfa5b58)), closes [#27](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/27)

## 4.1.1

2021-01-27

_Version update only_

## 4.1.0

2021-01-13

### Minor changes

- Implement 'getSearchFilterBasedOnIdentity' ([#20](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/20)) ([0b3d738](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/commit/0b3d738280b07aa0e0adfd0aa7398adc0e6025a5))

## 4.0.1

2020-12-07

### Patches

- chore: We no longer require Auth for metadata route, because router does not Authorize metadata route

## 4.0.0

2020-11-20

### Breaking changes

- Implement `fhir-works-on-aws-interface` v4.0.0
- - Authorization interfaces to use `userIdentity` instead of access_token
- - `isAuthorized` renamed to `verifyAccessToken`
- - `getRequesterUserId` method removed, as it is now redundant

## 3.0.0

2020-11-11

### Breaking changes

- Implement `fhir-works-on-aws-interface` v3.0.0
- - This adds 4 new methods to this package
- - Throwing UnauthorizedError instead of a boolean

## 2.0.0

2020-09-25

### Breaking changes

- Implement `fhir-works-on-aws-interface` v2.0.0

## 1.0.0

2020-08-31

_Initial release_
