# fhir-works-on-aws-persistence-ddb

## Purpose

Please visit [fhir-works-on-aws-deployment](https://github.com/awslabs/fhir-works-on-aws-deployment) for overall vision of the project and for more context.

This package is an implementation of the persistence & bundle components of the [FHIR Works interface](https://github.com/awslabs/fhir-works-on-aws-interface). It is responsible for executing CRUD based requests from the router. To use and deploy this component (with the other 'out of the box' components) please follow the overall [README](https://github.com/awslabs/fhir-works-on-aws-deployment)

## Infrastructure

This package assumes certain infrastructure:

- DynamoDB - The table name defined by the environment variable RESOURCE_TABLE
  - Partition key is 'id' and sort key is 'vid'
- Elasticsearch - The Elasticsearch domain is defined by the environment variable ELASTICSEARCH_DOMAIN_ENDPOINT
  - Indexes are defined by the resource type
- S3 Bucket - The bucket name is defined by the environment variable FHIR_BINARY_BUCKET

## Usage

For usage please add this package to your `package.json` file and install as a dependency. For usage examples please see the deployment component's [package.json](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/package.json)

## Dependency tree

This package is dependent on:

- [interface component](https://github.com/awslabs/fhir-works-on-aws-interface)
  - This package defines the interface we are trying to use

Package that depends on `fhir-works-on-aws-persistence-ddb` package:

- [deployment component](https://github.com/awslabs/fhir-works-on-aws-deployment)
  - This package deploys `fhir-works-on-aws-persistence-ddb` and all the other default components

## Known issues

For known issues please track the issues on the GitHub repository

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
