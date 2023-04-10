# Change Log - @aws/fhir-works-on-aws-search-es

This log was last generated on Mon, 10 Apr 2023 15:50:12 GMT and should not be manually modified.

## 4.0.1

Mon, 10 Apr 2023 15:50:12 GMT

### Patches

- update dummy emails according to aws style guide
- update homepage and repository link

## 4.0.0

Mon, 03 Apr 2023 19:20:41 GMT

### Breaking changes

- deprecated serverless

## 3.12.1

2023-01-12

### Patches

- - map code fields to keyword ([#193](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/193)) ([b51600b](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b51600bb0b3399140d2e9e3a599f51f0d1d02ef3))

## 3.12.0

2022-03-16

### Minor changes

- - Validate inclusion params before searching ([#182](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/182)) ([92bfe9c](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/92bfe9c6962e96175624d08be8d5b2b987969659))

## 3.11.0

2022-03-03

### Minor changes

- - add support for FHIR Subscriptions ([#178](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/178)) ([23f053a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/23f053a72960e61dffad8bcb2ae4dfc374deb7fe)), closes [#156](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/156) [#157](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/157) [#153](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/153) [#159](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/159) [#161](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/161) [#163](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/163) [#170](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/170) [#172](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/172) [#173](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/173) [#174](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/174) [#179](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/179)

## 3.10.0

2022-02-09

### Minor changes

- - add extension.valueReference to search mappings ([#162](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/162)) ([7fd7057](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/7fd705758f56fb6d725d4acff080b61852bc51df))

## 3.9.4

2022-02-03

### Patches

- - allow revinclude to return more than 10 resources ([#164](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/164)) ([b1e3a1a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b1e3a1aeba2a84b7f5d080ded4024bcb88169c0a))
- - chain parameters should inspect conditions to narrow down possible target types ([#168](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/168)) ([bc805cb](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/bc805cb3339a29d2f5c80bdb9a08ce425c90e752))

## 3.9.3

2022-02-01

### Patches

- - allow revinclude to return more than 10 resources ([#164](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/164)) ([b1e3a1a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b1e3a1aeba2a84b7f5d080ded4024bcb88169c0a))

## 3.9.2

2021-12-09

### Patches

- - boolean token search ([#145](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/145)) ([b3379c7](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b3379c785430809d4223f5fe68dc6731f0070dc2))

## 3.9.1

2021-11-12

### Patches

- - chained parameters with zero matches returns empty ([#139](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/139)) ([30290fd](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/30290fdbe15fac047b0b0a76bd4fea7e60f3d62a))

## 3.9.0

2021-11-06

### Minor changes

- - support .extension() fn in SearchParameter expressions ([#134](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/134)) ([6f3db20](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/6f3db20ee98c93239d5e18faa812dba98a224c97))

## 3.8.0

2021-11-02

### Minor changes

- - enable chained parameters in search ([#129](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/129)) ([2c0b1df](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/2c0b1dff2829f4b4f832d2d8ec85191e1f4c641d))

## 3.7.0

2021-10-28

### Minor changes

- - use sessionId as search preference ([#130](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/130)) ([85f53ee](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/85f53eeef4df2b2f680b3726580093ab79184376))

## 3.6.0

2021-10-08

### Minor changes

- - add class to aid in updating search mappings ([#126](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/126)) ([9219508](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/9219508bf5f314d433c83b21ffb287a91f1cad12))
- - add static search mappings ([#124](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/124)) ([e41ba1a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/e41ba1af43b6439a050fe4f31089e9dda725ae01))

### Patches

- - update IG validation to reject reference params with no target ([#123](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/123)) ([f789799](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/f789799e58e21d21fcbb410dc83cc70a31aa99e4))

## 3.5.2

2021-09-15

### Patches

- - fix \_id searches ([#119](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/119)) ([186fe78](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/186fe781d356319d16993152ec621e36a7efbdef))

## 3.5.1

2021-09-14

### Patches

- - token search should be exact matches ([#117](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/117)) ([d106500](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/d1065003d7d04d98645f5e668423ac99ecc6120c))

## 3.5.0

2021-09-13

### Minor changes

- - add support for exact search modifier ([#108](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/108)) ([9bc2e32](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/9bc2e32a7718f4e1a8c24851779a22d76dcaa98f))
- - implement :contains modifier ([#113](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/113)) ([c513d59](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/c513d59675aaabb0b1b48023995127fa3ad3936f))

## 3.4.0

2021-08-27

### Minor changes

- - allow id only reference searches when valid ([#107](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/107)) ([4b1510f](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/4b1510f844d974d6a1be270ca5bc1452e5e613de))

## 3.3.0

2021-08-17

### Minor changes

- - implement multi-tenancy ([#102](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/102)) ([f138bdb](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/f138bdba188b7c8df0e2058362252d0fca4358d0))

## 3.2.1

2021-08-05

### Patches

- - handle \_include refs in paths with arrays ([#97](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/97)) ([b6fdac1](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b6fdac18b738eedc99918fc7e3eed2cff2c18ee6))
- - remove duplicate Resource search params ([#98](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/98)) ([570e4eb](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/570e4eb3ebbafd5c73e8cc7643f6dd92b1611e01))

## 3.2.0

2021-07-28

### Minor changes

- - support OR search parameters (comma) ([#93](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/93)) ([71e401b](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/71e401ba54875e2f6e3974223df37c52395f82db))

## 3.1.0

2021-07-02

### Minor changes

- - Add flexibility to searches against static ES mapping ([#85](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/85)) ([#89](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/89)) ([a1e7683](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/a1e7683525c814020a476373167469ebf68189d2))
- - handle uris; not escaping the value ([#90](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/90)) ([8de76c1](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/8de76c1056370e4964e0bef33ec161ef954ba2dd)), closes [#85](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/85) [#86](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/86)

## 3.0.0

2021-06-14

### Breaking changes

- - Aliases need to be added to existing index
- - Run the addAlias [script](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/94a3187a6fb7a673946a215869c154048603389b/scripts/elasticsearch-operations.js) created in this [PR](https://github.com/awslabs/fhir-works-on-aws-deployment/pull/346) will create aliases for all existing indices
- - Update or create resource in a specific type will automatically create alias for the corresponding index

### Minor changes

- - Adding debug logging of JSON elastic queries with formatting. ([#78](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/78)) ([b06b645](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b06b645bb89152fd633f30a395439b6f40a94d92))
- - Use alias in place of index for search ([#79](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/79)) ([c83827a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/c83827aff915cf5b7d00eadb2716595499639870))

### Patches

- - Show true size for ES results ([#76](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/76)) ([09300b3](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/09300b338e7d51a423f1d4fc70a5329fca4cf84e))

## 2.7.0

2021-06-28

### Minor changes

- - Add flexibility to searches against static ES mapping ([#85](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/85)) ([f70045b](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/f70045b6b23945f0459549cb0dda33fac14f27bf))
- - Adding debug logging of JSON elastic queries with formatting. ([#78](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/78)) ([b06b645](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b06b645bb89152fd633f30a395439b6f40a94d92))
- - handle uris; not escaping the value ([#86](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/86)) ([006b3c1](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/006b3c1c200d8bda00d2e49b5aa48857a531c3ac))

### Patches

- - Show true size for ES results ([#76](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/76)) ([09300b3](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/09300b338e7d51a423f1d4fc70a5329fca4cf84e))

## 2.6.1

2021-05-21

### Patches

- - use exact string matching for references ([#74](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/74)) ([8e98345](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/8e983457c965b8873a82a47476ea008ab0ef2e04))

## 2.6.0

2021-05-20

### Minor changes

- - accept Elasticsearch client as optional constructor argument ([#73](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/73)) ([e1cd875](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/e1cd875795fe1481cf0d38446b6ea7b20d5ede6c))

## 2.5.1

2021-04-28

### Patches

- - fix ne prefix was matching extra records ([#64](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/64)) ([54fee72](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/54fee7259871a83fc78f584143cba154861eefc3))
- - token search params were matching additional documents ([#65](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/65)) ([046238a](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/046238a5fe7c581885769dccf1f47d3f781a642a))

## 2.5.0

2021-04-23

### Minor changes

- - allow repeated search parameters ([#62](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/62)) ([68f2173](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/68f21733c74c857724ffc1a950303b544aa6601f))
- - allow sorting by date type parameters ([#60](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/60)) ([a7d9bf0](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/a7d9bf02228cf6d2b0efd5de608cd3ee4b5b3089))
- - support Period type fields for date params ([#61](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/61)) ([d36e3af](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/d36e3afa7eb549576f9c26911ba602350ca86462))

## 2.4.0

2021-04-19

### Minor changes

- - support number and quantity type parameters ([#58](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/58)) ([ac5ca42](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/ac5ca42a165bb277b482f763d086a06ae7b8c106))

## 2.3.0

2021-04-09

### Minor changes

- - allow milliseconds in date queries ([#55](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/55)) ([86dbccd](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/86dbccd6f8c75d90a0e0df15bbd908c030a84be7))
- - support prefixes and proper range queries for date parameters ([#54](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/54)) ([b082508](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b08250866f01269f70f32f171653ac4ea1a59275))
- - support token parameters ([#56](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/56)) ([19589b9](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/19589b9dfbc7f19b57019f37f7232b71c5015a41))

## 2.2.0

2021-03-29

### Minor changes

- - add Implementation Guides support ([#50](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/50)) ([dc92eae](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/dc92eaea24339bc2d4a08d182e0506916735d69c)), closes [#45](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/45) [#48](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/48)

## 2.1.0

2021-02-09

### Minor changes

- - Add ImplementationGuides compile method ([#38](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/38)) ([e0024a4](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/e0024a4812591cbb2a056851be06cf7e9bfb35a7))
- - parse xpath expressions to support choice of data types ([#44](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/44)) ([ca70bdd](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/ca70bdd16c84134b9b5da0662c69fabdd5f98565))
- - update compiler to properly handle params from IGs ([#41](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/41)) ([b616c78](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/b616c78e3b9d87b1955e38af6c3242abc2f449da))

### Patches

- - properly handle special characters in queries ([#43](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/43)) ([e586b57](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/e586b576c71c4583b61834af7aa209fa2f8ec4eb))

## 2.0.1

2021-01-27

### Patches

- - update SearchFilter logic ([#39](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/39)) ([84f4af9](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/84f4af99be9dd1ab5da100b0d52d870aa26a98a5))

## 2.0.0

2021-01-13

### Breaking changes

- - updated to interface 7.0.0 which adds the `SearchFilter` type that is now used as param for the `ElasticSearchService` constructor.

### Minor changes

- - support AWS_REGION env var in IS_OFFLINE mode ([#24](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/24)) ([5545524](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/55455243c04e7a3a371232e70c040ff32066ce90))
- - support standard FHIR search parameters ([#36](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/36)) ([6360480](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/636048020788e58cea780bca3cedf05f415b9ff6))
- - Updating ElasticSearchService to use new SearchFilter interface ([#30](https://github.com/awslabs/fhir-works-on-aws-search-es/issues/30)) ([cf6c402](https://github.com/awslabs/fhir-works-on-aws-search-es/commit/cf6c40219e9c971beefc9d9c51781855b34aa7b7))

## 1.1.0

2020-10-01

### Minor changes

- - feat: Implement \_include and \_revinclude search parameters
- - feat: Support \_id search parameter

## 1.0.0

2020-08-31

_Initial release_
