# fhir-works-on-aws-search-es

## Purpose

Please visit [fhir-works-on-aws-deployment](https://github.com/awslabs/fhir-works-on-aws-deployment) for overall vision of the project and for more context.

This package is an implementation of the search interface from the [FHIR Works interface](https://github.com/awslabs/fhir-works-on-aws-interface). It queries Elasticsearch to find the results. To use and deploy this component (with the other 'out of the box' components) please follow the overall [README](https://github.com/awslabs/fhir-works-on-aws-deployment)

## Infrastructure

This package assumes certain infrastructure:

- Elasticsearch - The Elasticsearch cluster is indexed by ResourceType & the domain is defined by the environment variable ELASTICSEARCH_DOMAIN_ENDPOINT
- DynamoDB stream - To keep our Elasticsearch cluster in sync with the source of truth (DynamoDB) we expect the [persistence component](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb) to have a DynamoDB stream, which will stream the table's updates to the Elasticsearch cluster

## Usage

For usage please add this package to your `package.json` file and install as a dependency. For usage examples please see the deployment component's [package.json](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/package.json)

## Dependency tree

This package is dependent on:

- [interface component](https://github.com/awslabs/fhir-works-on-aws-interface)
  - This package defines the interface we are trying to use
- [persistence component](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb)
  - This package is responsible for the DynamoDB to ES sync
- [deployment component](https://github.com/awslabs/fhir-works-on-aws-deployment)
  - This package deploys this and all the default components

## FHIR search features supported

#### Search Parameter Types

| Feature       | Supported? | Notes |
| ------------- | :--------: | ----- |
| Number        |     ✔      |       |
| Date/DateTime |     ✔      |       |
| String        |     ✔      |       |
| Token         |     ✔      |       |
| Reference     |     ✔      |       |
| Composite     |     -      |       |
| Quantity      |     ✔      |       |
| URI           |     ✔      |       |
| Special       |     -      |       |

#### Search modifiers

| Feature               | Supported? | Notes                                                                                                            |
| --------------------- | :--------: | ---------------------------------------------------------------------------------------------------------------- |
| `:missing`            |     -      |                                                                                                                  |
| `:exact`              |     ✔      |                                                                                                                  |
| `:contains`           |    ✔\*     | \*only works for alphanumeric search values. search values with whitespaces or punctuation characters won't work |
| `:text`               |     -      |                                                                                                                  |
| `:in` (token)         |     -      |                                                                                                                  |
| `:below` (token)      |     -      |                                                                                                                  |
| `:above` (token)      |     -      |                                                                                                                  |
| `:not-in` (token)     |     -      |                                                                                                                  |
| `:[type]` (reference) |     -      |                                                                                                                  |
| `:below` (uri)        |     -      |                                                                                                                  |
| `:not`                |     -      |                                                                                                                  |
| `:above` (uri)        |     -      |                                                                                                                  |

#### Parameters for all resources

| Feature        | Supported? | Notes |
| -------------- | :--------: | ----- |
| `_id`          |     ✔      |       |
| `_lastUpdated` |     ✔      |       |
| `_tag`         |     ✔      |       |
| `_profile`     |     ✔      |       |
| `_security`    |     ✔      |       |
| `_text`        |            |       |
| `_content`     |     -      |       |
| `_list`        |     -      |       |
| `_has`         |     -      |       |
| `_type`        |     -      |       |
| `_query`       |     -      |       |
| `_filter`      |     -      |       |

#### Search result parameters

| Feature          | Supported? | Notes                                                   |
| ---------------- | :--------: | ------------------------------------------------------- |
| `_sort`          |    ✔\*     | \* Only supports sorting by date parameters             |
| `_count`         |     ✔      |                                                         |
| `_include`       |     ✔      | `_include:iterate` is limited to a search depth of 5    |
| `_revinclude`    |     ✔      | `_revinclude:iterate` is limited to a search depth of 5 |
| `_summary`       |     -      |                                                         |
| `_total`         |     -      |                                                         |
| `_elements`      |     -      |                                                         |
| `_contained`     |     -      |                                                         |
| `_containedType` |     -      |                                                         |
| `_score`         |     -      |                                                         |

#### Other

| Feature              | Supported? | Notes                                                                                                                                                                                                                                               |
| -------------------- | :--------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OR search parameter  |     ✔      | This refers to the use of a comma. e.g. `/Patient?language=FR,NL`                                                                                                                                                                                   |
| AND search parameter |     ✔      | This refers to repeating search parameters e.g. `/Patient?language=FR&language=NL`                                                                                                                                                                  |
| Chained parameters   |     ✔      | This refers to the use of a dot. e.g. `/Patient?organization.name=HL7` \* The inner query must match no more than 100 results or the search returns an error. This functionality is suitable for queries where the inner query is highly selective. |
| Reverse Chaining     |     -      |                                                                                                                                                                                                                                                     |

## Known issues

For known issues please track the issues on the GitHub repository

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
