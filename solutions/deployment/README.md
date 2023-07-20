# FHIR Works on AWS deployment

## Upgrade notice

Versions 3.1.1 and 3.1.2 of the `fhir-works-on-aws-authz-smart` package have been deprecated for necessary security updates. Please upgrade to version 3.1.3 or higher. For more information, see [the fhir-works-on-aws-authz-smart security advisory](https://github.com/awslabs/fhir-works-on-aws-authz-smart/security/advisories/GHSA-vv7x-7w4m-q72f).

## Summary

FHIR Works on AWS is a framework that can be used to deploy a [FHIR server](https://www.hl7.org/fhir/overview.html) on AWS. Using this framework, you can customize and add different FHIR functionality to best serve your use cases. When deploying this framework, by default [Cognito and role based access control](https://github.com/awslabs/fhir-works-on-aws-authz-rbac) is used. However, if preferred, you can be authenticated and authorized to access the FHIR server’s resources by using [SMART](https://github.com/awslabs/fhir-works-on-aws-authz-smart) instead of Cognito. Cognito is the default AuthN/AuthZ provider because it is easier to configure than SMART. It doesn’t require setting up a separate IDP server outside of AWS as compared to SMART. However, Cognito authentication is not granular. When a new user is created, it is assigned into the auditor, practitioner, or non-practitioner groups. Depending on the group, the user gets access to different groups of FHIR resources.
The AuthN/Z providers are defined in `package.json` and `config.ts`. You can choose appropriate providers. SMART allows greater granularity into authentication than Cognito and is the FHIR standard. It allows you to access a FHIR record only if that record has reference to the user.

## FHIR Works on AWS features

FHIR Works on AWS utilizes AWS Lambda, Amazon DynamoDB, Amazon S3 and Amazon Elasticsearch Service to provide the following FHIR features:

- Create, Read, Update, Delete (CRUD) operations for all R4 or STU3 base FHIR resources
- Search capabilities per resource type
- Ability to do versioned reads ([vread](https://www.hl7.org/fhir/http.html#vread))
- Ability to post a transaction bundle of 25 entries or less. Presently, transaction bundles with only 25 entries or less are supported.

## Accessing FHIR Works on AWS

The easiest and quickest way to access FHIR Works on AWS is by using [AWS solution](https://aws.amazon.com/solutions/implementations/fhir-works-on-aws/). To modify the code and set up a developer environment, follow the steps below:

**Note**: AWS Solution provides an earlier version(See Solutions [CHANGELOG](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/aws-solution/CHANGELOG.md) for more details) of FWoA install. Please follow the instruction below to install from GitHub repository if you wish to install the latest version.

1. Clone or download the repository to a local directory.

Example:

```sh
git clone https://github.com/awslabs/fhir-works-on-aws-deployment.git
```

**Note**: To modify FHIR Works on AWS, create your own fork of the GitHub repository. This allows you to check in any changes you make to your private copy of the code.

2. Use one of the following links to download FHIR Works on AWS:

- [Linux/macOS](./INSTALL.md#linux-or-macos-installation)
- [Windows](./INSTALL.md#windows-installation)
- [Docker](./INSTALL.md#docker-installation)

3. Refer to these [instructions](../../DEVELOPMENT.md) for making code changes.

If you intend to use FHIR Implementation Guides read the [Using Implementation Guides](../../fwoa-utilities/javaHapiValidatorLambda/USING_IMPLEMENTATION_GUIDES.md) documentation first.

If you intend to do a multi-tenant deployment read the [Using Multi-Tenancy](../documentation/USING_MULTI_TENANCY.md) documentation first.

If you intend to use FHIR Subscriptions read the [Using Subscriptions](../documentation/USING_SUBSCRIPTIONS.md) documentation first.

Refer to [SMART deployment README](../smart-deplyment/README.md) for best practices.

## Architecture

The system architecture consists of multiple layers of AWS serverless services. The endpoint is hosted using API Gateway. The database and storage layer consists of Amazon DynamoDB and S3, with Elasticsearch as the search index for the data written to DynamoDB. The endpoint is secured by API keys and Cognito for user-level authentication and user-group authorization. The diagram below shows the FHIR server’s system architecture components and how they are related.

![Architecture](resources/architecture.png)

## Components overview

FHIR Works on AWS is powered by single-function components. These functions provide you the flexibility to plug your own implementations, if needed. The components used in this deployment are:

- [Interface](https://github.com/awslabs/fhir-works-on-aws-interface) - Defines communication between the components.
- [Routing](https://github.com/awslabs/fhir-works-on-aws-routing) - Accepts HTTP FHIR requests, routes it to the other components, logs the errors, transforms output to HTTP responses and generates the [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html).
- [Authorization](https://github.com/awslabs/fhir-works-on-aws-authz-rbac) - Accepts the access token found in HTTP header and the action the request is trying to perform. It then determines if that action is permitted.
- [Persistence](https://github.com/awslabs/fhir-works-on-aws-persistence-ddb) - Contains the business logic for creating, reading, updating, and deleting the FHIR record from the database. FHIR also supports ‘conditional’ CRUD actions and patching.
  - Bundle - Supports multiple incoming requests as one request. Think of someone wanting to create five patients at once instead of five individual function calls. There are two types of bundles, batch and transaction. We currently only support transaction bundles of size 25 entries or fewer, but support batch bundles of up to 750 entries. This 750 limit was drawn from the Lambda payload limit of 6MB and an average request size of 4KB, divided in half to allow for flexibility in request size. This limit can also be configured in the `config.ts`, by specifying the `maxBatchSize` when constructing the `DynamoDBBundleService`.
- [Search](https://github.com/awslabs/fhir-works-on-aws-search-es) - Enables system-wide searching (/?name=bob) and type searching (/Patient/?name=bob).
- History - (_Not implemented_) Searches all archived/older versioned resources. This can be done at a system, type or instance level.

## License

This project is licensed under the Apache-2.0 license.

## Setting variables for FHIR on AWS

### Retrieving user variables

After installation, all user-specific variables (such as `USER_POOL_APP_CLIENT_ID`) can be found in the `Info_Output.log` file.

### Accessing the FHIR API

The FHIR API can be accessed through `API_URL` using the following REST syntax:

```sh
curl -H "Accept: application/json" -H "Authorization: Bearer <COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" <API_URL>
```

For more information, click [here](http://hl7.org/fhir/http.html).

### Using Postman to make API requests

To access APIs, you can use Postman as well. [Postman](https://www.postman.com/) is an API Client for RESTful services that can run on your development desktop for making requests to the FHIR Server. Postman is highly suggested and enables easier access to the FHRI API. You can use Postman to make API requests by following the steps below:

**Importing the collection file**

Under the Postman folder, you can access the JSON definitions for some API requests that you can make against the server. To import these requests into your Postman application, click [here](https://kb.datamotion.com/?ht_kb=postman-instructions-for-exporting-and-importing).

**Note**: Ensure that you import the [Fhir.postman_collection.json](./postman/Fhir.postman_collection.json) collection file.

After you import the collection, set up your environment. You can set up a local environment, a development environment, and a production environment. Each environment should have the correct values configured. For example, the value for `API_URL` for the local environment might be `localhost:3000` while the `API_URL` for the development environment would be your API gateway’s endpoint.

**Setting up environment variables**

Set up the following three Postman environments:

- `Fhir_Local_Env.json`
- `Fhir_Dev_Env.json`
- `Fhir_Prod_Env.json`

For instructions on importing the environment JSON, click [here](https://thinkster.io/tutorials/testing-backend-apis-with-postman/managing-environments-in-postman).

The `COGNITO_AUTH_TOKEN` required for each of these files can be obtained by following the instructions under [Authorizing a user](#authorizing-a-user).

The following variables required in the Postman collection can be found in `Info_Output.log`:

- API_URL: from Service Information:endpoints: ANY
- API_KEY: from Service Information: api keys: developer-key

To find what FHIR Server supports, use the `GET Metadata` Postman request to retrieve the [Capability Statement](https://www.hl7.org/fhir/capabilitystatement.html)

**Authorizing a user**

FHIR Works on AWS uses Role-Based Access Control (RBAC) to determine what operations and what resource types a user can access. The default rule set can be found in [RBACRules.ts](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/src/RBACRules.ts). To access the API, you must use the ID token. This ID token must include scopes of either `openid`, `profile` or `aws.cognito.signin.user.admin`.

Using either of these scopes provide information about users and their group. It helps determine what resources/records they can access.

- The `openid` scope returns all user attributes in the ID token that are readable by the client. The ID token is not returned if the openid scope is not requested by the client.
- The `profile` scope grants access to all user attributes that are readable by the client. This scope can only be requested with the openid scope.
- The `aws.cognito.signin.user.admin` scope grants access to [Amazon Cognito User Pool](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/Welcome.html) API operations that require access tokens, such as `UpdateUserAttributes` and `VerifyUserAttribute`.

For more information, click [here](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-idp-settings.html).

**Retrieving an ID token using aws.cognito.signin.user.admin**

To access the FHIR API, an ID token is required. A Cognito ID token can be obtained using the following command substituting all variables with their values from `Info_Output.log`.

- For Windows, enter:

```sh
scripts/init-auth.py <CLIENT_ID> <REGION> <USERNAME> <PASSWORD>
```

- For Mac, enter:

```sh
python3 scripts/init-auth.py <CLIENT_ID> <REGION> <USERNAME> <PASSWORD>
```

The return value is the `COGNITO_AUTH_TOKEN` (found in the postman collection) to be used for access to the FHIR APIs.

### Accessing binary resources

Binary resources are FHIR resources that consist of binary/unstructured data of any kind. This could be X-rays, PDF, video or other files. This implementation of the FHIR API has a dependency on the API Gateway and Lambda services, which currently have limitations in request/response sizes of 10 MB and 6 MB respectively. The workaround for this limitation is a hybrid approach of storing a binary resource’s metadata in DynamoDB and using S3's get/putPreSignedUrl APIs. So in your requests to the FHIR API, you will store/get the Binary's metadata from DynamoDB and in the response object it will also contain a pre-signed S3 URL, which should be used to interact directly with the binary file.

### Testing binary resources

**Using Postman**

To test, use Postman. For steps, click [here](https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/README.md#using-postman-to-make-api-requests).

**Note**: We recommend you to test binary resources by using the `Binary` folder in Postman.

**Using cURL**

To test this with cURL, follow these steps:

1. POST a binary resource to FHIR API using the following command:

```sh
curl -H "Accept: application/json" -H "Authorization: Bearer <COGNITO_AUTH_TOKEN>" -H "x-api-key:<API_KEY>" --request POST \
  --data '{"resourceType": "Binary", "contentType": "image/jpeg"}' \
  <API_URL>/Binary
```

2. Check the POST's response. There will be a presignedPutUrl parameter. Use that pre-signed url to upload your file. See below for command

```sh
curl -v -T "<LOCATION_OF_FILE_TO_UPLOAD>" "<PRESIGNED_PUT_URL>"
```

### Additional Features

FWoA provides the following additional features on top of the standard offering. Most of these features are turned off by default, and can be turned on through CDK context.

| Name                                                                                                 | CDK context key(s)                                        | Description                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Multi-tenancy](../documentation/USING_MULTI_TENANCY.md)                                             | enableMultiTenancy                                        | Multi-tenancy allows a single `fhir-works-on-aws` stack to serve as multiple FHIR servers for different tenants.                                                                     |
| [Subscriptions](../documentation/USING_SUBSCRIPTIONS.md)                                             | enableSubscriptions                                       | FHIR Works on AWS implements Subscriptions v4.0.1: https://www.hl7.org/fhir/R4/subscription.html                                                                                     |
| [Bulk Data Export](../documentation/USING_BULK_DATA_EXPORT.md)                                       | Always enabled                                            | Bulk Export allows you to export data from DDB to S3.                                                                                                                                |
| [Secure Logging](../documentation/SECURE_LOGGING.md)                                                 | enableSecurityLogging logLevel                            | Secure logging includes metadata such as who, what, when, where, how, and other associated request and response data.                                                                |
| [Implementation Guides](../../fwoa-utilities/javaHapiValidatorLambda/USING_IMPLEMENTATION_GUIDES.md) | useHapiValidator igMemoryLimit igMemorySize igStorageSize | An [Implementation Guide (IG)] ( https://www.hl7.org/fhir/implementationguide.html) is a set of rules that describe how FHIR resources should be used to solve a particular problem. |
| Enable OpenSearch Hard Delete                                                                        | enableESHardDelete                                        | FWoA uses soft delete for resource deletion by default. Set enableESHardDelete to true to enable hard delete in OpenSearch cluster.                                                  |
| [Dynamodb Daily Backup](../../../INSTALL.md#dynamodb-table-backups)                                  | enableBackup                                              | Daily DynamoDB Table back-ups can be optionally deployed via an additional fhir-server-backups stack.                                                                                |

Additional customization information can be found in document [CUSTOMIZE.md](../documentation/CUSTOMIZE.md).

### Run Integration Test

1. Integration test requires at least 100 patient resources created before running, or it will fail. The best way to do this is posting a bundle of 25 patient resources 4 times.
2. Create 3 Cognito users, two practitioners and one auditor. You can create users with script [provision-user.py](./scripts/provision-user.py).

- The script requires 3 inputs, userPoolId, userPoolAppClientId and region. These value can be found in the output of the FWoA CloudFormation stack you deployed.
- The script can be executed with `python3 scripts/provision-user.py <userPoolId> <userPoolAppClientId> <region> <TEMP_PASSWORD>`
- The three test users will use the same password. Update the password in `provision-user.py` script with your preferred password and save the change.
- To create the first practitioner user, change the username in `provision-user.py` script to `practitionerTest`. Save the change, then run the script.
- To create the auditor user, change the username to `auditorTest` and group to `auditor`. Save the change, then run the script.
- To create the second practitioner user, change the username to `otherPractitionerTest`, change the tenant to `tenant2`, revert group back to `practitioner`. Save the change, then run the script.

3. Now all data and users are ready, we need to set up environment variables for integration tests to run.
   Create a `.env` file in folder deployment, copy the following content in and update the value based on your environment.

```
# These are variables we just created in step 2
COGNITO_USERNAME_PRACTITIONER=practitionerTest
COGNITO_USERNAME_AUDITOR=auditorTest
COGNITO_USERNAME_PRACTITIONER_ANOTHER_TENANT=otherPractitionerTest
COGNITO_PASSWORD=<DUMMY_VALUE>
# These are variables you set in [cdk.json](./cdk.json)
MULTI_TENANCY_ENABLED=<true_or_false>
API_AWS_REGION=<us-west-2>
# These are variables you can find in AWS Console in CloudFormation output and API Gateway
API_URL=
API_KEY=
COGNITO_CLIENT_ID=
```

4. Once all the environment variables are set, you can run integration test with commands `rushx int-test`

## Troubleshooting FHIR Works on AWS

- If changes are required for the Elasticsearch instances, you may have to redeploy. Redeployment deletes the Elasticsearch cluster and creates a new one. Redeployment also deletes the data inside your cluster. In future releases, we will create a one-off lambda instance that can retrieve the data from DynamoDB to Elasticsearch. To do this, you can currently use either of the following options:

  - You can manually push the DynamoDB data to Elasticsearch by creating a lambda instance.
  - You can refresh your DynamoDB table with a backup.
  - You can remove all data from the DynamoDB table and that will create parity between Elasticsearch and DynamoDB.

- Support for STU3 and [R4](https://www.hl7.org/fhir/validation.html) releases of FHIR is based on the JSON schema provided by HL7. The schema for R4 is more restrictive than the schema for [STU3](http://hl7.org/fhir/STU3/validation.html). The STU3 schema doesn’t restrict appending additional fields into the POST/PUT requests of a resource, whereas the R4 schema has a strict definition of what is permitted in the request. You can access the schema [here](https://github.com/awslabs/fhir-works-on-aws-routing/blob/mainline/src/router/validation/schemas/fhir.schema.v3.json).

**Note**: We are using the official schema provided by [HL7](https://www.hl7.org/fhir/STU3/downloads.html).

- When making a `POST`/`PUT` request to the server, if you get an error that includes the text `Failed to parse request body as JSON resource`, check that you've set the request headers correctly. The header for `Content-Type` should be either `application/json` or `application/fhir+json`. If you're using Postman for making requests, in the **Body** tab, make sure to change the setting to `raw` and `JSON`.
  ![Postman Body Request Settings](resources/postman_body_request_settings.png)

## Feedback

We'd love to hear from you! Please reach out to our team via [Github Issues](https://github.com/awslabs/fhir-works-on-aws-deployment/issues) for any feedback.
