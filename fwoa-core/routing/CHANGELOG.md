# Change Log - @aws/fhir-works-on-aws-routing

This log was last generated on Mon, 10 Apr 2023 15:50:12 GMT and should not be manually modified.

## 7.0.1

Mon, 10 Apr 2023 15:50:12 GMT

### Patches

- update dummy emails according to aws style guide
- update homepage and repository link

## 7.0.0

Mon, 03 Apr 2023 19:20:41 GMT

### Breaking changes

- deprecated serverless

### Minor changes

- Added security logging for all incoming requests.
- Added validation check on since parameter in export handler

### Patches

- Updated resource type and resource id regex match

## 6.6.2

2023-01-24

### Patches

- - add optional input validation ([#193](https://github.com/awslabs/fhir-works-on-aws-routing/issues/193)) ([e8d9c8d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/e8d9c8d1fad0b653869773cf88fa501c586f3004))

## 6.6.1

2022-09-08

### Patches

- - Throw error if url and POSTed resourceType do not match ([#172](https://github.com/awslabs/fhir-works-on-aws-routing/issues/172)) ([b1bd6e4](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b1bd6e4b6772ff82a2450ce8bf073c10d2201bbd))

## 6.6.0

2022-08-21

### Minor changes

- - Issue 674 support for up to 100 entries in a FHIR transaction ([#170](https://github.com/awslabs/fhir-works-on-aws-routing/issues/170)) ([6048e17](https://github.com/awslabs/fhir-works-on-aws-routing/commit/6048e17b69ed56b6aea3a74ce96553294763f5e8))

## 6.5.1

2022-06-06

### Patches

- - Use accept header to determine return content type([#168](https://github.com/awslabs/fhir-works-on-aws-routing/issues/168)) ([c543c02](https://github.com/awslabs/fhir-works-on-aws-routing/commit/c543c0292f9f6c9bb82cb8e39d6fa24fee2c8824))

## 6.5.0

2022-04-06

### Minor changes

- - add Batch support ([#162](https://github.com/awslabs/fhir-works-on-aws-routing/issues/162)) ([837aff6](https://github.com/awslabs/fhir-works-on-aws-routing/commit/837aff6c5d130149abb5fb7c62b1d47f5b8fc91c))

## 6.4.1

2022-03-07

### Patches

- - fix content type for .well-known/smart-configuration ([#160](https://github.com/awslabs/fhir-works-on-aws-routing/issues/160)) ([9074b41](https://github.com/awslabs/fhir-works-on-aws-routing/commit/9074b41f842449fe91eb9cae1187474d48a5c616))

## 6.4.0

2022-03-03

### Minor changes

- - add Subscription validator ([#156](https://github.com/awslabs/fhir-works-on-aws-routing/issues/156)) ([03aff0d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/03aff0d46f5b5def58996301ce539c5eacd8a4a2))

## 6.3.1

2021-12-10

### Patches

- - Use application/fhir+json as default content-type ([#147](https://github.com/awslabs/fhir-works-on-aws-routing/issues/147)) ([0fd1afb](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0fd1afb6a5fbedb29b704edcbda9fc30601b6cd4))

## 6.3.0

2021-10-28

### Minor changes

- - pass sessionId param to search ([#140](https://github.com/awslabs/fhir-works-on-aws-routing/issues/140)) ([0607652](https://github.com/awslabs/fhir-works-on-aws-routing/commit/06076527ccc3b90880733ca78e38eceabcab3a61))

## 6.2.0

2021-10-13

### Minor changes

- - use requiresAccessToken value from GetExportStatusResponse ([#138](https://github.com/awslabs/fhir-works-on-aws-routing/issues/138)) ([0cdfc53](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0cdfc530e30024453d3200d331b25dc8089b8cce))

## 6.1.2

2021-09-20

### Patches

- - also sort by date for $docref when requesting latest doc ([#131](https://github.com/awslabs/fhir-works-on-aws-routing/issues/131)) ([09603b7](https://github.com/awslabs/fhir-works-on-aws-routing/commit/09603b740b3d444a0e1427cf03279b839825007f))

## 6.1.1

2021-09-02

### Patches

- - move group export operation under Group resource ([#127](https://github.com/awslabs/fhir-works-on-aws-routing/issues/127)) ([502bd49](https://github.com/awslabs/fhir-works-on-aws-routing/commit/502bd4924acebf24899d6a7dd5e545df4a2fd9ea))

## 6.1.0

2021-09-01

### Minor changes

- - add group export operation to capability statement ([#125](https://github.com/awslabs/fhir-works-on-aws-routing/issues/125)) ([0bc8e3c](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0bc8e3c6309fa1eae38b8d3ca257aaf86f79bda3))

### Patches

- - properly emit throttle error ([#124](https://github.com/awslabs/fhir-works-on-aws-routing/issues/124)) ([7f06815](https://github.com/awslabs/fhir-works-on-aws-routing/commit/7f0681545b4f2dc18151e696a0da1e5c601ebb33))

## 6.0.2

2021-08-26

### Patches

- - add routing from server errors to conflict errors ([#121](https://github.com/awslabs/fhir-works-on-aws-routing/issues/121)) ([3499e14](https://github.com/awslabs/fhir-works-on-aws-routing/commit/3499e1408290f4582c317bd920e9c627549f9e5a))

## 6.0.1

2021-08-19

### Patches

- - pass serverUrl to bundle auth request ([#119](https://github.com/awslabs/fhir-works-on-aws-routing/issues/119)) ([d40986f](https://github.com/awslabs/fhir-works-on-aws-routing/commit/d40986fdc194a3107ade884c042d6c99b082e4bb))

## 6.0.0

2021-08-17

### Breaking changes

- - System export will only include resources based on what scopes you provided(SMART) or what resources align with said group(RBAC)

### Minor changes

- - add support for multi-tenancy and group export ([#116](https://github.com/awslabs/fhir-works-on-aws-routing/issues/116)) ([666a4c4](https://github.com/awslabs/fhir-works-on-aws-routing/commit/666a4c472426d8b0aad5651c70aae8f605d7dc84)), closes [#94](https://github.com/awslabs/fhir-works-on-aws-routing/issues/94) [#97](https://github.com/awslabs/fhir-works-on-aws-routing/issues/97) [#98](https://github.com/awslabs/fhir-works-on-aws-routing/issues/98) [#99](https://github.com/awslabs/fhir-works-on-aws-routing/issues/99) [#100](https://github.com/awslabs/fhir-works-on-aws-routing/issues/100) [#107](https://github.com/awslabs/fhir-works-on-aws-routing/issues/107) [#112](https://github.com/awslabs/fhir-works-on-aws-routing/issues/112) [#111](https://github.com/awslabs/fhir-works-on-aws-routing/issues/111)

### Patches

- - Handle 401 correctly in OperationOutcomes ([#117](https://github.com/awslabs/fhir-works-on-aws-routing/issues/117)) ([959040a](https://github.com/awslabs/fhir-works-on-aws-routing/commit/959040ae64ff43d0d979dda5425c903ab8814cef))

## 5.4.4

2021-08-06

### Patches

- - add routing for 409 errors ([#109](https://github.com/awslabs/fhir-works-on-aws-routing/issues/109)) ([27c80ea](https://github.com/awslabs/fhir-works-on-aws-routing/commit/27c80ea7455d7cb3f9c184742d9667b4105d2ad3))
- - fix invalid capability statement ([#108](https://github.com/awslabs/fhir-works-on-aws-routing/issues/108)) ([0c9d81b](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0c9d81bebdd47a45af23d967b7874d7171ace2bd))

## 5.4.3

2021-07-27

### Patches

- - properly handle versioned references in BundleParser ([#101](https://github.com/awslabs/fhir-works-on-aws-routing/issues/101)) ([b57ac06](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b57ac06e8578fd2e701b52e1b262e482536dc999))
- - update FHIR v4 schema and fix the validator ([#102](https://github.com/awslabs/fhir-works-on-aws-routing/issues/102)) ([b9e2f5f](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b9e2f5ffe414031ea29ad0c432c66fc8303a0afe))

## 5.4.2

2021-06-04

### Patches

- - Changed error for Unauthorized request([#92](https://github.com/awslabs/fhir-works-on-aws-routing/issues/92)) ([83f8d23](https://github.com/awslabs/fhir-works-on-aws-routing/commit/83f8d2317bdbc7c8ae0e4fb3b382c2ac2f9ce97c))
- - remove informational HTTP header ([#89](https://github.com/awslabs/fhir-works-on-aws-routing/issues/89)) ([f8f4238](https://github.com/awslabs/fhir-works-on-aws-routing/commit/f8f423813ff8d591c17d952d79989bd934f549a9))

## 5.4.1

2021-05-21

_Version update only_

## 5.4.0

2021-05-21

### Minor changes

- - add $docref operation ([#86](https://github.com/awslabs/fhir-works-on-aws-routing/issues/86)) ([105790f](https://github.com/awslabs/fhir-works-on-aws-routing/commit/105790fbd84e1886e000844be8a7fa0ea1d532d6)), closes [#78](https://github.com/awslabs/fhir-works-on-aws-routing/issues/78) [#83](https://github.com/awslabs/fhir-works-on-aws-routing/issues/83) [#85](https://github.com/awslabs/fhir-works-on-aws-routing/issues/85)

## 5.3.0

2021-05-19

### Minor changes

- - create requestContext and pass it along with userIdentity ([aff9ebc](https://github.com/awslabs/fhir-works-on-aws-routing/commit/aff9ebc2a3c15b37fe618a7605635a35564decc7))

## 5.2.1

2021-05-04

### Patches

- - bad substitution in absolute URL refs that match the server url ([#75](https://github.com/awslabs/fhir-works-on-aws-routing/issues/75)) ([9974257](https://github.com/awslabs/fhir-works-on-aws-routing/commit/99742570c8c19d6c730db0ae375bd112f42e4f42))
- - handle POST bundle with no fullUrl and relative refs ([#74](https://github.com/awslabs/fhir-works-on-aws-routing/issues/74)) ([1d09f48](https://github.com/awslabs/fhir-works-on-aws-routing/commit/1d09f488307b5b0a447738105815e95be76c2a62))

## 5.2.0

2021-04-15

### Minor changes

- - feat: Add Post method for search ([#70](https://github.com/awslabs/fhir-works-on-aws-routing/pull/70))([0c29a2d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/0c29a2dc9eab953dd64c5cfb18acc48684ce2a71))

## 5.1.1

2021-03-29

_Version update only_

## 5.1.0

2021-03-29

### Minor changes

- - add Implementation Guides support ([#66](https://github.com/awslabs/fhir-works-on-aws-routing/issues/66)) ([151228c](https://github.com/awslabs/fhir-works-on-aws-routing/commit/151228c135ac24a25d95b5f5bde2f4bd735b16af)), closes [#59](https://github.com/awslabs/fhir-works-on-aws-routing/issues/59) [#63](https://github.com/awslabs/fhir-works-on-aws-routing/issues/63)

### Patches

- - Capability Statement rest security value set url ([#61](https://github.com/awslabs/fhir-works-on-aws-routing/issues/61)) ([a68a872](https://github.com/awslabs/fhir-works-on-aws-routing/commit/a68a87246c65a8b10da868ba47bd88e3e73b4004))
- - Capability statement to pull updateCreateSupported from Persistence ([#58](https://github.com/awslabs/fhir-works-on-aws-routing/issues/58)) ([bfb9a1d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/bfb9a1db3c4705857d0d45afcb0b69eb5d785e85))
- - fix stu3 schema for Bundle & AllergyIntolerance ([#65](https://github.com/awslabs/fhir-works-on-aws-routing/issues/65)) ([87857d1](https://github.com/awslabs/fhir-works-on-aws-routing/commit/87857d19c2bbed9e58bf1a042a5c88c3739eb7db))
- - for operations returning GenericResponse type, check that response exists before testing for sub properties. ([#54](https://github.com/awslabs/fhir-works-on-aws-routing/issues/54)) ([e1740b5](https://github.com/awslabs/fhir-works-on-aws-routing/commit/e1740b5dfa2abb75b51a43dc0c8c30e5d42ab44b))
- - - Relax validation rules before a patch can be applied ([#64](https://github.com/awslabs/fhir-works-on-aws-routing/issues/64)) ([5a87d2b](https://github.com/awslabs/fhir-works-on-aws-routing/commit/5a87d2bc11615392d1535ce029db61bc3cd9d17f))

## 5.0.0

2021-02-11

### Breaking changes

- - updated to interface 8.0.0 which changed the structure of FhirConfig. FhirConfig now requires the validators attribute. That attribute is then used in routing.

### Minor changes

- - Add support for Validator interface ([#56](https://github.com/awslabs/fhir-works-on-aws-routing/issues/56)) ([b57b54c](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b57b54c7ee0ef67799a14ffb6bc66a7e25977659))

## 4.0.3

2021-01-27

### Patches

- - Update interface and pass values to AuthZ ([#45](https://github.com/awslabs/fhir-works-on-aws-routing/issues/48)) ([e6de625d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/93a7933877fcb73561941c8e12aa5b05e6de625d))

## 4.0.2

2021-01-20

### Patches

- - use correct SMART url in Cap Statement ([#45](https://github.com/awslabs/fhir-works-on-aws-routing/issues/45)) ([71bf256](https://github.com/awslabs/fhir-works-on-aws-routing/commit/71bf25699d78828f519d913700af655430f29b7c))

## 4.0.1

2021-01-14

### Patches

- - add cors typing to dependencies ([#43](https://github.com/awslabs/fhir-works-on-aws-routing/issues/43)) ([46d4a59](https://github.com/awslabs/fhir-works-on-aws-routing/commit/46d4a596e45da80d19014333ac13b2fd831484b6))

## 4.0.0

2021-01-13

### Breaking changes

- - updated to interface 7.0.0 which changed the structure of `FhirConfig` that is used as argument for `generateServerlessRouter`

### Minor changes

- - Support additional product info used in the Capability Statement ([#31](https://github.com/awslabs/fhir-works-on-aws-routing/issues/31)) ([5a61db3](https://github.com/awslabs/fhir-works-on-aws-routing/commit/5a61db3ac3b50116bdd119b98a929065676a0d0a))
- - use getSearchFilterBasedOnIdentity to prefilter resources([#38](https://github.com/awslabs/fhir-works-on-aws-routing/issues/38)) ([b3fd394](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b3fd3949227b7126722056e4940dd5f161d0ce06))
- - use search getCapabilities to build capability statement ([#41](https://github.com/awslabs/fhir-works-on-aws-routing/issues/41)) ([5f4340d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/5f4340d83d213d8d46794eba3845110605db0918))

### Patches

- - Add authorizeAndFilterReadResponse for system searches ([#36](https://github.com/awslabs/fhir-works-on-aws-routing/issues/36)) ([104098d](https://github.com/awslabs/fhir-works-on-aws-routing/commit/104098d32f26403587c69045266a1581ffa163ed))
- - authorize requester has permission to view all resources returned in the Bundle ([#32](https://github.com/awslabs/fhir-works-on-aws-routing/issues/32)) ([155e926](https://github.com/awslabs/fhir-works-on-aws-routing/commit/155e926a5598b13e110b5e71468337386e75ebb4))
- - When parsing Bundles for reference only fields explicitly named 'reference' should be considered a reference ([#35](https://github.com/awslabs/fhir-works-on-aws-routing/issues/35)) ([b931d52](https://github.com/awslabs/fhir-works-on-aws-routing/commit/b931d5248673e5941709d5b2920819fa4a5b2e4d))

## 3.0.1

2020-12-07

### Minor changes

- - chore: Explicity check if Auth strategy is SMART-on-FHIR before adding the well-known route
- - fix: metadata and well-known endpoint so that AuthZ is not invoked (expected behavior)

## 3.0.0

2020-11-11

### Breaking changes

- - Support SMART's .well_known endpoint
- - Supporting new authorization interface
- - Add optional OAuth urls to the capability statement

## 2.0.0

2020-11-11

### Breaking changes

- - Support for DB export by routing export requests to the corresponding BulkDataAccess interfaces as defined in `fhir-works-on-aws-interface` v3.0.0
- - Supporting capability statement configuration for OAuth as defined in `fhir-works-on-aws-interface` v3.0.0
- - Improved error handling to allow matching of same error objects across different `fhir-works-on-aws-interface` versions
- - Support for configuring CORs header

## 1.1.0

2020-09-25

### Minor changes

- - feat: Pass down allowed resource types to search service

## 1.0.0

2020-08-31

_Initial release_
