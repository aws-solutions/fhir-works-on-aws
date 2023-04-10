# Change Log - @aws/fhir-works-on-aws-interface

This log was last generated on Mon, 10 Apr 2023 15:50:12 GMT and should not be manually modified.

## 13.0.1

Mon, 10 Apr 2023 15:50:12 GMT

### Patches

- update dummy emails according to aws style guide
- update homepage and repository link

## 13.0.0

Mon, 03 Apr 2023 19:20:41 GMT

### Breaking changes

- deprecated serverless

### Patches

- sanitized error messages to exclude user input

## 12.0.0

2022-03-03

### Breaking changes

- - add new required methods `getActiveSubscriptions` and `validateSubscriptionSearchCriteria`

### Minor changes

- - add methods to support FHIR Subscriptions ([#100](https://github.com/awslabs/fhir-works-on-aws-interface/issues/100)) ([a980196](https://github.com/awslabs/fhir-works-on-aws-interface/commit/a980196b6ff153efc816d8e35353118169757d68)), closes [#95](https://github.com/awslabs/fhir-works-on-aws-interface/issues/95) [#94](https://github.com/awslabs/fhir-works-on-aws-interface/issues/94) [#97](https://github.com/awslabs/fhir-works-on-aws-interface/issues/97)

## 11.3.0

2021-10-27

### Minor changes

- - add sessionId to search requests ([#87](https://github.com/awslabs/fhir-works-on-aws-interface/issues/87)) ([6284d53](https://github.com/awslabs/fhir-works-on-aws-interface/commit/6284d53bb44d6180b2d6304e42ba06aa9f5596cb))

## 11.2.0

2021-10-13

### Minor changes

- - add requiresAccessToken to GetExportStatusResponse ([#85](https://github.com/awslabs/fhir-works-on-aws-interface/issues/85)) ([a9ad12c](https://github.com/awslabs/fhir-works-on-aws-interface/commit/a9ad12c8401952a47a2fafd2a1da294dc806df18))

## 11.1.0

2021-08-24

### Minor changes

- - add routing for Conflict errors ([#81](https://github.com/awslabs/fhir-works-on-aws-interface/issues/81)) ([0b135ee](https://github.com/awslabs/fhir-works-on-aws-interface/commit/0b135eed7866215149b32c0887542f72dc7dac1a))

### Patches

- - updating SmartStrategy interface to spec ([#80](https://github.com/awslabs/fhir-works-on-aws-interface/issues/80)) ([50b0a7e](https://github.com/awslabs/fhir-works-on-aws-interface/commit/50b0a7e322b1b3393574620539a83d137b706820))

## 11.0.0

2021-08-19

### Breaking changes

- - Removes ttlInSeconds from the persistence interface

### Patches

- - add missing fhirServiceBaseUrl to AuthorizationBundleRequest ([#78](https://github.com/awslabs/fhir-works-on-aws-interface/issues/78)) ([3c56239](https://github.com/awslabs/fhir-works-on-aws-interface/commit/3c562396f54735053ea61a3f2127b079561279ff))
- - Remove ttlInSeconds ([#69](https://github.com/awslabs/fhir-works-on-aws-interface/issues/69)) ([4662772](https://github.com/awslabs/fhir-works-on-aws-interface/commit/466277287d7101f9aa841550faf9afde69cc1278))

## 10.0.0

2021-08-12

### Breaking changes

- - add required parameter allowedResourceTypes for group export

### Minor changes

- - add multi-tenancy and group export related fields ([#76](https://github.com/awslabs/fhir-works-on-aws-interface/issues/76)) ([65c90b1](https://github.com/awslabs/fhir-works-on-aws-interface/commit/65c90b10bf3a7de62886dc8e1f59ae0c5415cf1e)), closes [#70](https://github.com/awslabs/fhir-works-on-aws-interface/issues/70) [#71](https://github.com/awslabs/fhir-works-on-aws-interface/issues/71) [#72](https://github.com/awslabs/fhir-works-on-aws-interface/issues/72) [#73](https://github.com/awslabs/fhir-works-on-aws-interface/issues/73)

## 9.1.0

2021-08-05

### Minor changes

- - Add ResourceConflictError ([#74](https://github.com/awslabs/fhir-works-on-aws-interface/issues/74)) ([fa3facc](https://github.com/awslabs/fhir-works-on-aws-interface/commit/fa3facc0b07230d15514f5aa27d422e33a1d0ae1))

## 9.0.0

2021-05-11

### Breaking changes

- - Remove logging interface export
- - feat: add logger builder to be used by other FHIR components

### Minor changes

- - Add logger builder ([#65](https://github.com/awslabs/fhir-works-on-aws-interface/issues/65)) ([aa99182](https://github.com/awslabs/fhir-works-on-aws-interface/commit/aa9918297fe3d4e5d5b81efe62c774ccc1083914))

## 8.2.0

2021-05-11

### Minor changes

- - Add a request context to authorization related interfaces. ([#62](https://github.com/awslabs/fhir-works-on-aws-interface/issues/62)) ([f56ca09](https://github.com/awslabs/fhir-works-on-aws-interface/commit/f56ca091b72bc16053cfe7894bb759b486db9635))
- - Resource Archive Support ([#64](https://github.com/awslabs/fhir-works-on-aws-interface/issues/64)) ([99d0593](https://github.com/awslabs/fhir-works-on-aws-interface/commit/99d05931b3bc931b356e8e74cc5fb203c96be049))

## 8.1.1

2021-04-06

### Patches

- - meta object structure & update dependencies ([#60](https://github.com/awslabs/fhir-works-on-aws-interface/issues/60)) ([de9102a](https://github.com/awslabs/fhir-works-on-aws-interface/commit/de9102a7840db148dbdc76bd2a90750d60f7a006))

## 8.1.0

2021-03-05

### Minor changes

- - Add compiledImplementationGuides to FhirConfig ([#55](https://github.com/awslabs/fhir-works-on-aws-interface/issues/55)) ([4aa4347](https://github.com/awslabs/fhir-works-on-aws-interface/commit/4aa4347e31b334b05761cf10e2db89445674ce97))

## 8.0.1

2021-03-02

### Patches

- - Include ExportType for export routes ([#57](https://github.com/awslabs/fhir-works-on-aws-interface/issues/57)) ([bd518a6](https://github.com/awslabs/fhir-works-on-aws-interface/commit/bd518a6c03397ba9896972c3f2ff200e3d6f68ee))
- - Update BASE_R4_RESOURCES with missing resources ([#54](https://github.com/awslabs/fhir-works-on-aws-interface/issues/54)) ([08ada00](https://github.com/awslabs/fhir-works-on-aws-interface/commit/08ada005426132377a65860e0faa9870fa6c0ad7))

## 8.0.0

2021-02-10

### Breaking changes

- - This adds validators as a required attribute to FhirConfig.

### Minor changes

- - Add validator interface ([#48](https://github.com/awslabs/fhir-works-on-aws-interface/issues/48)) ([cf497a0](https://github.com/awslabs/fhir-works-on-aws-interface/commit/cf497a0f565821effe6169df44202c02a00eef95))

## 7.1.0

2021-01-28

### Minor changes

- - add implementation guides compile interface ([#44](https://github.com/awslabs/fhir-works-on-aws-interface/issues/44)) ([0b1b947](https://github.com/awslabs/fhir-works-on-aws-interface/commit/0b1b9479bc50e7e21a859bd9583fc53e6a7bdbeb))

## 7.0.1

2021-01-26

### Patches

- - Add optional parameters to GetSearchFilter ([#45](https://github.com/awslabs/fhir-works-on-aws-interface/issues/45)) ([843bab8](https://github.com/awslabs/fhir-works-on-aws-interface/commit/843bab823a7ec6b77217556d806505a677f83c7a))

## 7.0.0

2021-01-12

### Breaking changes

- - add getCapabilities method to Search interface ([#42](https://github.com/awslabs/fhir-works-on-aws-interface/issues/42)) ([b274566](https://github.com/awslabs/fhir-works-on-aws-interface/commit/b274566c71899a2bd7c7d9112bfd85c889678ad4))

## 6.0.1

2021-01-06

### Patches

- - `GetSearchFilterBasedOnIdentityRequest.operation` now includes `history-instance`

## 6.0.0

2020-12-21

### Breaking changes

- - `SearchFilter` interface to allow `fhir-works-on-aws-search` to filter search results
- - `GetSearchFilterBasedOnIdentity` interface so `fhir-works-on-aws-authz` can provide `SearchFilter` that can be used for filtering search results
- - `InvalidSearchParameterError`: A new error for search to throw when search parameters are invalid

## 5.0.0

2020-12-11

### Breaking changes

- - `ProductInfo` interface to collect product and business information about the FHIR server

## 4.0.0

2020-11-20

### Breaking changes

- - `SmartStrategy` for passing in SMART Auth configurations
- - `SmartAuthorization` for class implementing SMART Auth

### Patches

- - Authorization interfaces to use `userIdentity` instead of `accessToken`
- - isAuthorized renamed to verifyAccessToken
- - getRequesterUserId method removed

## 3.0.0

2020-11-11

### Breaking changes

- - Required methods for SMART on FHIR interactions
- - Export UnauthorizedError to be usable
- - Required interfaces and types for bulk data export

## 2.0.0

2020-09-25

### Breaking changes

- - `getAllowedResourceTypesForOperation` method to `Authorization` interface.

### Patches

- - `Authorization.isAuthorized` to return a promise.

## 1.0.0

2020-08-31

_Initial release_
