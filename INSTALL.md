# FHIR Works on AWS Deployment Installation

## Prerequisites

- **AWS Account**: The FHIR Server is designed to use AWS services for data storage and API access. An AWS account is hence required in order to deploy and run the necessary components.
- **RAM Requirements**: 1 GB or RAM or less will result in out of memory errors. We recommend using a computer with at least 4 GB of RAM.
- **AWS CLI (Linux & macOS only)**: [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) is required for Linux and macOS installations.
- **Homebrew (macOS Only)**: macOS Installation uses [Homebrew](https://brew.sh/) to install dependencies.
- **Windows PowerShell for AWS (Windows Only)**: Windows installation has been tested in [AWSPowerShell](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-getting-set-up-windows.html#ps-installing-awswindowspowershell).
- **ARM64 not supported**: If this is a blocker for you please let us know [fhir-works-on-aws-dev](mailto:fhir-works-on-aws-dev@amazon.com).

You'll need an IAM User with sufficient permissions to deploy this solution.
You can use an existing User with AdministratorAccess or you can [create an IAM User](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) with the following policy [scripts/iam_policy.json](./scripts/iam_policy.json).

## Manual installation prerequisites

Prerequisites for deployment and use of the FHIR service are the same across different client platforms. The installation examples are provided specifically for Mac OSX, if not otherwise specified. The required steps for installing the prerequisites on other client platforms may therefore vary from these.

### AWS account

The FHIR Server is designed to use AWS services for data storage and API access. An AWS account is hence required in order to deploy and run the necessary components.

### Node.JS

Node is used as the Lambda runtime. To install node, we recommend the use of [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm).

If you would rather directly install Node 18.x, download it [here](https://nodejs.org/en/download/).

### Python (deployment only)

Some scripts use Python to create a Cognito user and could be regarded as optional. To install Python, see [python.org](https://www.python.org/downloads/).

### boto3 AWS Python SDK (deployment only)

Boto3 is the AWS Python SDK running as a Python import. The installation is platform-agnostic but requires Python and Pip to function:

```sh
pip install boto3
```

### pnpm

pnpm is a fast, disk space efficient package manager similar to npm. Instructions for installing pnpm are provided for different platforms [here](https://pnpm.io/installation).

### rush

Rush is a scalable monorepo manager for the web. Installation process is described [here](https://rushjs.io/pages/developer/new_developer/#prerequisites).

### CDK CLI

AWS CDK (Cloud Development Kit) is a framework for defining cloud infrastructure such as Lambda functions and associated resources in code and provisioning it in the target AWS Account through AWS CloudFormation.
Instructions for installing CDK are provided for different platforms [here](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html).

## Manual installation

### AWS credentials

Sign in to your AWS account, navigate to the IAM service, and create a new **User**. This will be required for deployment to the Dev environment. Add the IAM policy located at [`scripts/iam_policy.json`](./scripts/iam_policy.json) to the IAM user that you create.

Note the following IAM user properties for use later in the process:

- `ACCESS_KEY`
- `SECRET_KEY`
- `IAM_USER_ARN`

Use these credentials to create a new profile in the AWS credentials file. For more information on creating a new profile, see [Named profiles for the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html).

```sh
vi ~/.aws/credentials
```

You can use any available name for your AWS Profile (section name in []). Note the name of the AWS profile for use later in the process.

### Working directory selection

In a Terminal application or command shell, navigate to the directory containing the package’s code

### Package dependencies (required)

Use Rush to install all package dependencies and compile & test the code:

```sh
rush update && rush build && rush test
```

### AWS service deployment with CDK

Using the previously noted AWS Profile, deploy the required AWS services to your AWS account. By default, the region and stage of the deployment are set to us-west-2, and dev, respectively. These can be configured by adjusting the default context values in the [`cdk.json`](./cdk.json) file.

Deployment:

```sh
cd ./solutions/deployment
rushx deploy --profile <AWS PROFILE>
```

Smart deployment:

```sh
cd ./solutions/smart-deployment
rushx deploy --profile YOUR_AWS_PROFILE -c issuerEndpoint=YOUR_ISSUER_ENDPOINT -c oAuth2ApiEndpoint=YOUR_OAUTH2_API_ENDPOINT -c patientPickerEndpoint=YOUR_PATIENT_PICKER_ENDPOINT
```

Or you can deploy with a custom stage (default: dev) and/or region (default: us-west-2)

Deployment:

```sh
cd ./solutions/deployment
rushx deploy --profile <AWS PROFILE> -c stage=<STAGE> -c region=<AWS_REGION>
```

Smart deployment:

```sh
cd ./solutions/smart-deployment
rushx deploy --profile YOUR_AWS_PROFILE -c issuerEndpoint=YOUR_ISSUER_ENDPOINT -c oAuth2ApiEndpoint=YOUR_OAUTH2_API_ENDPOINT -c patientPickerEndpoint=YOUR_PATIENT_PICKER_ENDPOINT -c stage=YOUR_STAGE -c region=YOUR_REGION
```

Retrieve auto-generated IDs or instance names by checking in the [Info Output](./INFO_OUTPUT.log) file.

All of the stack's outputs will be located in this file, for future reference.

### Initialize Cognito (deployment only)

Initially, AWS Cognito is set up supporting OAuth2 requests in order to support authentication and authorization. When first created there will be no users. This step creates a `workshopuser` and assigns the user to the `practitioner` User Group.

Execute the following command substituting all variables with previously noted
values:

For Windows:
First declare the following environment variables on your machine:
| Name | Value |
| --- | --- |
| AWS_ACCESS_KEY_ID | <ACCESS_KEY> |
| AWS_SECRET_ACCESS_KEY | <SECRET_KEY> |

Restart your terminal.

```sh
scripts/provision-user.py <USER_POOL_ID> <USER_POOL_APP_CLIENT_ID> <REGION> <TEMP_PASSWORD>
```

For Mac:

```sh
AWS_ACCESS_KEY_ID=<ACCESS_KEY> AWS_SECRET_ACCESS_KEY=<SECRET_KEY> python3 scripts/provision-user.py <USER_POOL_ID> <USER_POOL_APP_CLIENT_ID> <REGION> <TEMP_PASSWORD>
```

This will create a user in your Cognito User Pool. The return value will be an access token that can be used for authentication with the FHIR API.

### Enable Elasticsearch logging

We recommend you to add Elasticsearch logging for production workflows. For steps on how to enable them please see our the [AWS guide](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createdomain-configure-slow-logs.html)

### Direct Elasticsearch access

#### Running an ES command

In order to run a command directly in Elasticsearch, make sure you are in the `scripts` folder and enter the following command:

```sh
ACCESS_KEY=<ACCESS_KEY> SECRET_KEY=<SECRET_KEY> ES_DOMAIN_ENDPOINT=<ES_DOMAIN_ENDPOINT> node elasticsearch-operations.js <REGION> "<function to execute>" "<optional additional params>"
```

These parameters can be found by checking the `Info_Output.log` file generated by the installation script.

### Optional installation configurations

#### Elasticsearch Kibana server

The Kibana server allows you to explore data inside your Elasticsearch instance through a web UI. This server is automatically created if 'stage' is set to `dev`.

Accessing the Kibana server requires you to set up a Cognito user. The installation script can help you set up a Cognito user, or you can do it manually through the AWS Cognito Console. Please ensure your Kibana Cognito user has an associated email address.

The installation script will print the URL to the Kibana server after setup completes. Navigate to this URL and enter your login credentials to access the Kibana server.

If you lose this URL, it can be found in the `Info_Output.log` file under the "ElasticsearchDomainKibanaEndpoint" entry.

##### Accessing Elasticsearch Kibana server

> **Note**  
> Kibana is only deployed in the default `dev` stage. If you want Kibana set up in other stages, like `production`, please remove `Condition: isDev` in the [`elasticsearch.ts`](./lib/elasticsearch.ts) for CDK.

The Kibana server allows you to explore data inside your Elasticsearch instance through a web UI.

In order to be able to access the Kibana server for your Elasticsearch Service Instance, you need to create and confirm a Cognito user. This Cognito user must also have an email address associated with it. Run the below command or create a user from the Cognito console.

```sh
# Find ELASTIC_SEARCH_KIBANA_USER_POOL_APP_CLIENT_ID in the Info_Output.log
# Create new user
aws cognito-idp sign-up \
  --region <REGION> \
  --client-id <ELASTIC_SEARCH_KIBANA_USER_POOL_APP_CLIENT_ID> \
  --username <youremail@address.com> \
  --password <TEMP_PASSWORD> \
  --user-attributes Name="email",Value="<youremail@address.com>"

# Find ELASTIC_SEARCH_KIBANA_USER_POOL_ID in the Info_Output.log
# Notice this is a different ID from the one used in the last step

# Confirm new user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <ELASTIC_SEARCH_KIBANA_USER_POOL_ID> \
  --username <youremail@address.com> \
  --region <REGION>

# Example
aws cognito-idp sign-up \
  --region us-west-2 \
  --client-id 4rcsm4o7lnmb3aoc2h64nv1324 \
  --username jane@amazon.com \
  --password Passw0rd! \
  --user-attributes Name="email",Value="jane@amazon.com"

aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-west-2_sOmeStRing \
  --username jane@amazon.com \
  --region us-west-2
```

###### Get Kibana url

After the Cognito user is created and confirmed you can now log in with the username and password, at the `ELASTIC_SEARCH_DOMAIN_KIBANA_ENDPOINT` (found within the [Info Output](./INFO_OUTPUT.log)).

> **Note**  
> Kibana will be empty at first and have no indices. They will be created once the FHIR server writes resources to DynamoDB.

#### DynamoDB table backups

Daily DynamoDB Table back-ups can be optionally deployed via an additional `fhir-server-backups` stack. The installation script will deploy this stack automatically if indicated during installation.
You can enable this by passing in the context parameter during the deployment process (`-c enableBackup=true`).

The reason behind multiple stacks is that backup vaults can be deleted only if they are empty, and you can't delete a stack that includes backup vaults if they contain any recovery points. With separate stacks it is easier for you to operate.

These back-ups work by using tags. Anything with `backup - daily` & `service - fhir` tags will be backed-up daily at 5:00 UTC.

To deploy the stack and start daily backups (outside of the install script) (LEGACY):

```sh
aws cloudformation create-stack --stack-name fhir-server-backups --template-body file://<file location of backup.yaml> --capabilities CAPABILITY_NAMED_IAM
# Example
aws cloudformation create-stack --stack-name fhir-server-backups --template-body file:///mnt/c/ws/src/fhir-works-on-aws-deployment/cloudformation/backup.yaml --capabilities CAPABILITY_NAMED_IAM
```

#### Adding encryption to S3 bucket policy (Optional)

To encrypt all objects being stored in the S3 bucket as Binary resources, add the following yaml to the Resources' bucket policy:

```yaml
ForceEncryption:
  Type: AWS::S3::BucketPolicy
  DependsOn: FHIRBinaryBucket
  Properties:
    Bucket: !Ref FHIRBinaryBucket
    PolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Sid: DenyUnEncryptedObjectUploads
          Effect: Deny
          Principal: ''
          Action:
            - s3:PutObject
          Resource:
            - !Join ['', ['arn:aws:s3:::', !Ref FHIRBinaryBucket, '/']]
          Condition:
            'Null':
              's3:x-amz-server-side-encryption': true
        - Sid: DenyIncorrectEncryptionHeader
          Effect: Deny
          Principal: ''
          Action:
            - s3:PutObject
          Resource:
            - !Join ['', ['arn:aws:s3:::', !Ref FHIRBinaryBucket, '/']]
          Condition:
            StringNotEquals:
              's3:x-amz-server-side-encryption': 'aws:kms'
```

##### Making requests to S3 buckets with added encryption policy

S3 bucket policies can only examine request headers. When we set the encryption parameters in the getSignedUrlPromise those parameters are added to the URL, not the HEADER. Therefore the bucket policy would block the request with encryption parameters in the URL. The workaround to add this bucket policy to the S3 bucket is have your client add the headers to the request as in the following example:

```sh
curl -v -T ${S3_UPLOAD_FILE} ${S3_PUT_URL} -H "x-amz-server-side-encryption: ${S3_SSEC_ALGORITHM}" -H "x-amz-server-side-encryption-aws-kms-key-id: ${KMS_SSEC_KEY}"
```

### Overall Troubleshooting

- During installation if you're on a Linux machine and using Docker

If Docker is erroring out while running `apt-get`, it might be because it's unable to reach the Debian server to get software updates. Try running the build command with `--network=host`.
Run `docker build -t fhir-server-install --network=host -f docker/Dockerfile .`

> **Note**  
> This issue was seen on a Fedora 32 machine.

### Customizations to improve search functions

Search parameters are defined as accurately as possible, but you could experience some issues with search. This information will help you adjust the code and customize search fields for your needs.

#### Search returns inexact matches when doing exact match only search

1. Sign in to the [AWS Console](https://aws.amazon.com/) which hosts your FHIR installation.
2. Go to **Amazon OpenSearch Service**.
3. Select the OpenSearch cluster.
   ![opensearchservice](/resources/opensearchservice.png)
4. Open the Kibana URL.
   ![kibana url](/resources/kibanaurl.png)
5. Sign in as a user who has Kibana dashboard access. If necessary, create a new Cognito user who has access.
6. From the Kibana dashboard, open the **Dev Tools** menu.
7. Get index metadata. More details on index API and other REST APIs can be found here: [Index APIs | Elasticsearch Guide [7.17] | Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/indices.html).

```
GET indexname
```

> **Example**  
> If you get the `indexname` resource, the response would be the following:

```
{
   indexname: {
        // copy everything from here to replicate index,
        // aliases, mappings, etc.
   }
}
```

Other resources could be patient, medicationrequest, etc.

8. Update search mappings. For example, to get an exact match on a field, the easiest way would be to change index type to `keyword`.  
   String that does not produce exact match:

```
...
"display" : {
    "type" : "text",
    ...
}
...
```

Updated string:

```
...
"display" : {
    "type" : "keyword"
}
...
```

10. Reindex the data from original index into the new index.
    > **Note**  
    > This process may take from 5 minutes to several hours depending on the size of the index. To improve the index speed, see [Tune for indexing speed | Elasticsearch Guide [8.6] | Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html).

```
POST _reindex
{
  "source": {
    "index": "indexname"
  },
  "dest": {
    "index": "indexname-copy"
  }
}
```

11. Delete the original index, then clone-rename the copy. Delete copy.

```
DELETE /indexname

POST /indexname-copy/_clone/indexname

DELETE /indexname-copy
```

#### Search by field does not work

Some resources could be missing search by field in the out-of-the-box deployment. To solve this, you can add the missing field(s).

1. Open the already cloned repository `https://github.com/awslabs/fhir-works-on-aws-search-es`.
2. Locate the [`searchMappingsBase.4.0.1.json`](https://github.com/awslabs/fhir-works-on-aws-search-es/blob/mainline/src/schema/searchMappingsBase.4.0.1.json) file.
3. Find the resource and add the required field(s) with correct type. For a list of field names and types, see the FHIR reference ([Index - FHIR v4.3.0](http://hl7.org/fhir/index.html)). For example, you can add search by billable period date with the type as Period to ExplanationOfBenefits ([HL7.FHIR.US.CARIN-BB\C4BB Explanation Of Benefit - FHIR v4.0.1](https://build.fhir.org/ig/HL7/carin-bb/StructureDefinition-C4BB-ExplanationOfBenefit.html)).
   ![billable period](/resources/billableperiod.png)

```
...
"ExplanationOfBenefit": [
    {
      "field": "careTeam.provider",
      "type": "Reference"
    },
    ...
    {
      "field": "billablePeriod",
      "type": "Period"
    }
  ],
...
```

4. Redeploy the solution.
