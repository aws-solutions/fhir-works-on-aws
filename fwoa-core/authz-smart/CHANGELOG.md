# Change Log - @aws/fhir-works-on-aws-authz-smart

This log was last generated on Thu, 09 Mar 2023 15:32:50 GMT and should not be manually modified.

## 4.0.0

Mon, 06 Mar 2023 14:22:44 GMT

### Breaking changes

- Reject token with scopes that can not be used
- Only allow system/\*.read scope for group export

### Patches

- update documentation for rejecting tokens with invalid scopes
- whitespace changes

## 3.1.4

Thu, 26 Jan 2023 14:22:44 GMT

### Patches

- Added more extensive tests ([#105](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/105), [#104](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/104), [#103](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/103), [#102](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/102), [#101](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/101), [#100](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/100), [#99](https://github.com/awslabs/fhir-works-on-aws-authz-smart/pull/99))

## 3.1.3

Mon, 12 Sep 2022 14:22:44 GMT

### Patches

- handle include/revInclude correctly ([#92](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/92)) ([203bbc0](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/203bbc0dd17de748c36b33c68b866ed2dfd613d3))

## 3.1.2

Fri, 09 Sep 2022 14:22:44 GMT

### Patches

- - only allow scopes to be returned iff it matches resourceType ([#88](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/88)) ([18b059e](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/18b059e2eac0cb7583fcc190d00a9c5f555abcdb))

## 3.1.1

Tue, 22 Mar 2022 14:22:44 GMT

### Patches

- - scopes should not be filtered in search use cases ([#79](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/79)) ([67af26d](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/67af26df03d3c9be9f85e98e8e18230446bde28f))

## 3.1.0

Thu, 10 June 2022 14:22:44 GMT

### Minor changes

- - add optional headers for JWKS client ([#59](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/59)) ([43e1439](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/43e14391200a775fd11078cc1de4d23c244074d5))

## 3.0.0

Wed, 15 Sep 2021 14:22:44 GMT

### Breaking changes

- - User scope will not be allowed for system export by default. To allow user scope for system export, please update `src/config.ts` in the deployment package to pass in parameter `isUserScopeAllowedForSystemExport`.

### Minor changes

- - update system export to only allow system scope by default ([#60](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/60)) ([45b7960](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/45b796031c36960b8f5be1b765beee839d0d9aa8))

### Patches

- - remove filtered responses from total count ([#63](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/63)) ([82b6ff3](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/82b6ff372b44ca40dc3575e7505695f79747d6de))

## 2.2.3

Fri, 10 Sep 2021 14:22:44 GMT

### Patches

- - scope checking for getting status on an export ([#64](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/64)) ([69f9297](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/69f9297f7721113667f2c8b9ef3c65ac06016c49))

## 2.2.2

Mon, 23 Aug 2021 14:22:44 GMT

### Patches

- - group export permission update ([#56](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/56)) ([aff43d7](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/aff43d79032e94589ec059f165ab3039b2a48ef3))

## 2.2.1

Thu, 19 Aug 2021 14:22:44 GMT

### Patches

- - pass fhirServiceBaseUrl in bundle request auth ([#53](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/53)) ([a87adcf](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/a87adcfa38e13c39cb8fd524a12b5b2747f66170))

## 2.2.0

Tue, 17 Aug 2021 14:22:44 GMT

### Minor changes

- - use fhirServiceBaseUrl from requests if present ([#50](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/50)) ([31f951a](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/31f951a660b4f9f4f4ad52b95670063f175868b2)), closes [#45](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/45)

## 2.1.1

Mon, 16 Aug 2021 14:22:44 GMT

### Patches

- - Correctly pass params in url for introspect jwt flow ([#48](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/48)) ([d67b693](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/d67b6932f5a1a0bbe6c340bd340bc2351068adbf))

## 2.1.0

Wed, 23 July 2021 14:22:44 GMT

### Minor changes

- - allow regex in SMARTConfig.expectedAudValue ([#43](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/43)) ([2442856](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/244285606d70d7bed1a37a6bc19d32063af036ec))
- - allow token introspection as an authz option ([#44](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/44)) ([f123621](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/f123621a4f65819f89e161ec3fbba1ac46301f41))

### Patches

- - support system scope ([#46](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/46)) ([7ae2f49](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/7ae2f49cd20e933e45d40b9e518b8ec72c3d61b6))

## 2.0.0

Thu, 24 June 2021 14:22:44 GMT

### Breaking changes

- - Renamed `fhirUserClaimKey` to `fhirUserClaimPath` and `launchContextKeyPrefix` to `launchContextPathPrefix` in `SMARTConfig`
- - You must now define how you want to handle the `system` scope found in ScopeRule

### Minor changes

- - Add support for `system` scope ([#41](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/41)) ([2229ce8](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/2229ce8a7c3cc4398756628e8cff68c488db6a5c))
- - Allow paths for fhirUser and launch claims ([#40](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/40)) ([332806d](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/332806dbeff80c929f36b01c699cf0dac65cea01))

## 1.0.1

Thu, 18 May 2021 14:22:44 GMT

_Version update only_

## 1.0.0

Fri, 12 Feb 2021 14:22:44 GMT

### Breaking changes

- - Major version bump! :rocket:

## 0.1.3

Thu, 11 Feb 2021 14:22:44 GMT

### Minor changes

- - make reference checking more restrictive and abide by FHIR ([#22](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/22)) ([ca3d574](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/ca3d5740bf1d229eb92ec4f5795dede96d1671ae))
- - make smartHandler more configurable ([#24](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/24)) ([503ef8a](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/503ef8a3a34ad2b4e65765292273e341cb493b0a))

## 0.1.2

Wed, 27 Jan 2021 14:22:44 GMT

### Patches

- - correctly name references ([#19](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/19)) ([8564ff2](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/8564ff2529c9fff9091b375c9c15e0df4ddfefcf))
- - interface update; Add id to search filter ([#20](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/20)) ([a04b375](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/a04b375bcf43b5958baa846c533fb0c5ca62485e))

## 0.1.1

Wed, 20 Jan 2021 14:22:44 GMT

### Patches

- - chore: change REGEX hostname not to include `/`

## 0.1.0

Thu, 14 Jan 2021 14:22:44 GMT

### Minor changes

- - Begin implementation of SMART on FHIR ([#1](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/1)) ([4f07589](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/4f075893da0b6a49a96acb054ea5fd21401c6046))
- - Support string array in OAuth aud claim and add new test cases ([#2](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/2)) ([8273f16](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/8273f1624531488cf47c470b6918d6e58b2bbdec))
- - Implement new interface ([#4](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/4)) ([a41cdc6](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/a41cdc681b60143fd6c4dd977789bb5ceaf51886)), closes [#5](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/5)
- - Add support for GetSearchFilterBasedOnIdentity ([#9](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/9)) ([ce1a489](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/ce1a48994146d20ab4efac633d3d4db5f14ec201))
- - Implement patient scope; remove system & launch scopes ([#13](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/13)) ([cc9cbb2](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/cc9cbb24304e88dd777d1610c7da32cf389e42bf))
- - Validate JWT token using public jwks ([#14](https://github.com/awslabs/fhir-works-on-aws-authz-smart/issues/14)) ([8e577a8](https://github.com/awslabs/fhir-works-on-aws-authz-smart/commit/8e577a83d0da907c8eb7401113283162b7525900))

## 0.0.1

Fri, 06 Nov 2020 14:22:44 GMT

### Breaking changes

- - Initial launch! :rocket:
