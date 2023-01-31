# fhir-works-on-aws-routing

## Purpose

Please visit [fhir-works-on-aws-deployment](https://github.com/awslabs/fhir-works-on-aws-deployment) for overall vision of the project and for more context.

This package is an implementation of the routing of the [FHIR Works interface](https://github.com/awslabs/fhir-works-on-aws-interface). It is responsible for taking a FHIR based HTTP request and routing it to the correct sub-component. It also does all the resource validatation by way of [JSON schemas](src\router\validation\schemas). Finally, This component is responsible for generating the [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html), which is used to describe what a FHRI API can do. To use and deploy this component (with the other 'out of the box' components) please follow the overall [README](https://github.com/awslabs/fhir-works-on-aws-deployment)

## Infrastructure

This package assumes certain infrastructure:

- API Gateway - We expect all the routing to invoke the FHIR Works Lambda
  - [Best Practices](https://github.com/awslabs/fhir-works-on-aws-deployment/tree/smart-mainline#best-practices)
- Lambda - We expect the input to be entering our function in a certain way

## Usage

For usage please add this package to your `package.json` file and install as a dependency. For usage examples please see the deployment component's [package.json](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/package.json)

## Dependency tree

This package is dependent on a type of each subcomponent:

- [interface component](https://github.com/awslabs/fhir-works-on-aws-interface)
  - This package defines the interface we are trying to use
- An **authorization** component that is responsible for saying if the request is allowed or not
  - Example: [fhir-works-on-aws-authz-rbac](https://github.com/awslabs/fhir-works-on-aws-authz-rbac)
- A **persistence** component that is responsible for handing CRUD based requests
  - Example: [fhir-works-on-aws-persistence-ddb](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb)
- A **bundle** based component that is responsible for handling batches & transactions
  - Example: [fhir-works-on-aws-persistence-ddb](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb)
- A **search** component that is responsible for handling the search based requests
  - Example: [fhir-works-on-aws-search-es](https://github.com/awslabs/fhir-works-on-aws-search-es)
- A **history** component that is responsible for handling the historical search requests
  - No example
- Finally a deployment component to deploy this to AWS
  - Example: [fhir-works-on-aws-deployment](https://github.com/awslabs/fhir-works-on-aws-deployment)

**NOTE:** if your use-case does not require one of the above features/components, please set the your configuration as such and the router will route accordingly

## Known issues

For known issues please track the issues on the GitHub repository

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
