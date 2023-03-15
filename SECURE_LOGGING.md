# Secure Logging

Secure logging includes metadata such as who, what, when, where, how, and other associated request and response data for incident analysis. You can enable secure logging during deployment. Amazon CloudWatch maintains secure logs as error logging only.

Follow your organizational best practices and the [shared responsibility model](https://aws.amazon.com/compliance/shared-responsibility-model/) by reviewing logged fields and access controls. All PII and PHI fields are encrypted using KMS keys. Customers can decrypt the encrypted fields for incident analysis using their KMS keys.

See the following as an example of Amazon CloudWatch logs for every API request:

| Metadata      | Origin   | Fields                                 | Definition                                                                                                       | Example                                                                                                                                                                                                                           | Encrypted Information            |
| ------------- | -------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| logMetadata   |          | uid                                    | Randomly created id to record the log                                                                            | "0b4d1252-b786-4900-8240-a7671813c8ef"                                                                                                                                                                                            |                                  |
|               |          | timestamp                              | Time point when the logger middleware is triggered                                                               | "2023-01-17T15:57:560Z"                                                                                                                                                                                                           |                                  |
|               |          | category                               | Event category                                                                                                   | "Audit Event"                                                                                                                                                                                                                     |                                  |
|               |          | encryptedFields                        | Fields which have informtion needed to be encrypte                                                               | [ "who.userIdentity.sub", "who.userIdentity.fhirUser", "what.requestContext.path", "what.apiGateway.event.pathParameters.proxy", "where.requestContext.identity.sourceIp", "responseOther.userIdentity.launch-response-patient" ] |                                  |
|               |          | encryptedPayLoad                       | Corresponded encrypted string created by encrypting all fields in encryptedFields field                          | "QWERTYUIOPLKJHGFDSA"                                                                                                                                                                                                             |                                  |
| who           | request  | identity.apiKeyId                      | Api Key Id                                                                                                       | "0000000000"                                                                                                                                                                                                                      |                                  |
|               | response | sub                                    | The subject of the token                                                                                         | "encrypted"                                                                                                                                                                                                                       | entire content                   |
|               |          | fhirUser                               | Full url for fhir user (smart-deployment only)                                                                   | https://domain.execute-api.us-east-1.amazonaws.com/dev/Practitioner/encrypted                                                                                                                                                     | resourceId                       |
|               |          | "cognito:groups"                       | Coginto groups name (deployment only)                                                                            | [ "practitioner" ]                                                                                                                                                                                                                |                                  |
|               |          | "cognito:username"                     | Coginto user name (deployment only)                                                                              | "workshopuser"                                                                                                                                                                                                                    |                                  |
|               |          | "custom:tenantId"                      | Coginto tenant id (deployment only)                                                                              | "tenant1"                                                                                                                                                                                                                         |                                  |
| what          | request  | path                                   | Request path                                                                                                     | "/dev/Patient/encrypted"                                                                                                                                                                                                          | resourceId                       |
|               |          | httpMethod                             | Http method from request                                                                                         | "GET"                                                                                                                                                                                                                             |                                  |
|               |          | apiGateway.event.httpmethod            | Http method from apiGateway                                                                                      | "GET"                                                                                                                                                                                                                             |                                  |
|               |          | apiGateway.event.queryStringParameters | Query strings used for a search request                                                                          | "encrypted"                                                                                                                                                                                                                       | query strings used for a request |
|               |          | apiGateway.event.pathParameters        | PathParameter for the request                                                                                    | { "proxy":"Patient/encrypted" }                                                                                                                                                                                                   | resourceId                       |
|               | response | scopes                                 | The scopes that authz package intiallizes to allow user have (smart-deployment only)                             | [ "fhirUser", "openid", "patient/*.*", "launch/patient", "profile", "user/*.*", "patient_selection" ]                                                                                                                             |                                  |
|               |          | usableScopes                           | The scopes a user can have after our authorization package has filtered what allowed (smart-deployment only)     | [ "patient/*.*", "user/*.*" ]                                                                                                                                                                                                     |                                  |
| when          | request  | requestTimeEpoch                       | The time when the request is made                                                                                | "2023-01-17T15:53:46.000Z"                                                                                                                                                                                                        |                                  |
| where         | request  | logGroupName                           | Log group name                                                                                                   | "/aws/lambda/smart-fhir-service-dev-fhirServer7884A170-4dPkO6El2pLG"                                                                                                                                                              |                                  |
|               |          | logStreamName                          | Log stream name                                                                                                  | "2023/01/17/[$LATEST]7b5e5e7edb1443dfa16bcc789bf41321"                                                                                                                                                                            |                                  |
|               |          | domainName                             | The url of the fhir works deployment                                                                             | "domain.execute-api.us-east-1.amazonaws.com"                                                                                                                                                                                      |                                  |
|               |          | user-agent                             | The agent the user uses to make request                                                                          | "PostmanRuntime/7.30.0"                                                                                                                                                                                                           |                                  |
|               |          | sourceIp                               | Ip address where the request is made                                                                             | "encrypted"                                                                                                                                                                                                                       | ip address                       |
| how           |          | awsRequestId                           | Integration.requestId                                                                                            | "00000000-0000-0000-0000-000000000000"                                                                                                                                                                                            |                                  |
|               |          | userIdentity.Jti                       | The unique token identifier                                                                                      | "AT.-WlAh-NEcSdoxIwpqeE6KswC0PLA-aaaaaaaaaaaaaa"                                                                                                                                                                                  |                                  |
| requestOther  | request  | stage                                  | Stage environment                                                                                                | "dev"                                                                                                                                                                                                                             |                                  |
| responseOther | response | launch_response patient                | Resource url for the patient that was selected from the list during the auth flow (smart-deployment only)        | "https://domain.execute-api.us-east-1.amazonaws.com/dev/Patient/encrypted"                                                                                                                                                        | resourceId                       |
|               |          | iss                                    | The issuer of the token. This value must be the same as the client_id of the application that you are accessing. | "https://dev-00000000.okta.com/oauth2/aus7j8ulrovP5Ppzb5d7"                                                                                                                                                                       |                                  |
|               |          | aud                                    | The dev URL of the fhir works that you're trying to access using the JWT to authenticate                         | "https://domain.execute-api.us-east-1.amazonaws.com/dev"                                                                                                                                                                          |                                  |
|               |          | scp                                    | The scopes from the original request (smart-deployment only)                                                     | [ "fhirUser", "patient/*.*", "launch/patient", "profile", "user/*.*", "patient_selection", "openid" ]                                                                                                                             |                                  |
|               |          | iat                                    | When the token was issued                                                                                        | "2023-01-17T15:43:56.000Z"                                                                                                                                                                                                        |                                  |
|               |          | exp                                    | The token expiration time                                                                                        | "2023-01-17T16:43:56.000Z"                                                                                                                                                                                                        |                                  |
|               |          | auth_time                              | When the authentication occurs                                                                                   | "2023-02-17T15:43:02.000Z"                                                                                                                                                                                                        |                                  |

## Enabling Secure Logging

To enable secure logging for mainline deployment, use the following command:

```
rushx deploy --profile <AWS PROFILE> -c stage=<STAGE> -c enableSecurityLogging=true
```

To enable secure logging for smart deployment, use the following command:

```
rushx deploy —-profile YOUR_AWS_PROFILE -c issuerEndpoint=YOUR_ISSUER_ENDPOINT \
 -c oAuth2ApiEndpoint=YOUR_OAUTH2_API_ENDPOINT \
 -c patientPickerEndpoint=YOUR_PATIENT_PICKER_ENDPOINT \
 -c stage=YOUR_STAGE \
 -c region=YOUR_REGION \
 -c enableSecurityLogging=true
```

## Decrypting Security Logs

1. Copy the encrypted string in the `encryptedPayLoad` field from the request in the Amazon CloudWatch log.
2. Configure AWS CLI to your AWS Account that has FHIR Deployment.
3. Decrypt the encrypted string using the AWS CLI Decrypt function in your terminal. For more information, see [AWS CLI Decrypt](https://awscli.amazonaws.com/v2/documentation/api/2.1.29/reference/kms/decrypt.html). [](https://awscli.amazonaws.com/v2/documentation/api/2.1.29/reference/kms/decrypt.html)
4. To decrypt by storing an encrypted string inside a text file, create a .txt file in the folder and name the .txt file something such as `encryptedfile.txt`.
5. Paste the copied encrypted string into `encryptedfile.txt` and save it.
6. Run the following decrypt command after entering the file name and correct Region of your FHIR deployment.

```
aws kms decrypt —ciphertext-blob fileb://<(cat encryptedfile.txt | base64 -D) —query Plaintext —output text —region <REGION> | base64 —decode
```

## Log Deep Dive for Incident Analysis

1. Sign in to the **AWS Management Console** using the account where FWoA is deployed.
2. Switch to the AWS Region where FWoA is deployed, if necessary.
3. From the console, go to **Amazon CloudWatch**.
4. In the sidebar, expand **Logs** and choose **Log** **groups**.
5. Find the `api-gateway-execution-logs_${uniqueID}/${stage}` log group. The uniqueID is apiURL domain id. For example, `API-Gateway-Execution-Logs_0000000000/dev`.
6. Choose the log group to see the log stream events. Note the **AWS Integration Endpoint RequestId** from the event details.
7. Locate the fhirserver log which will be: `/aws/lambda/${stackname}-fhirServer${UniqueId}`. The uniqueID is randomly generated. For example, `/aws/lambda/smart-fhir-service-dev-fhirServer00000000-000000000000`.
8. Choose the name of the Log group to view the log group page.
9. Search for `AWS Integration Endpoint RequestId` and review the secure logging information for your incident analysis. You can have two screen shows of apigateway log group and show secure logging data in fhirserver.

## Searching logs

### Find logs by time period

Ideally, you should search or localize API Gateway base on the time stamp to figure out the extended request ID. These steps will use the `api-gateway-execution-logs` log group as the example.

1. Find the `api-gateway-execution-logs_${uniqueID}/${stage}` log group, and choose it to view details.
2. Under **Log Streams**, choose **Search all log streams**.
3. If the Timestamp column is not shown, choose the **Display** menu, and choose the **View in columns with details**. Alternatively, choose **Settings** and turn on **Timestamp**.
4. Choose **Custom** to select the date range or time stamp you want to show. For example, choose log stream from 01/03/2023 9:00am to 10:00am.
5. Choose the Log stream name once you find the log stream you want to view.
6. In the log stream details, you can find the request status and the extended request id which is `AWS Integration Endpoint RequestId`.

### Search extended request id in lambda logs to get to who/what/when log

1. Search the `fhirserver` log group (Lambda function log group). It will be `/aws/lambda/${stackname}-fhirServer${UniqueId}`. The uniqueID is randomly generated.
2. Choose the **log group name**.
3. Under **Log Streams**, choose **Search all log streams**.
4. Enter the request id in double quotations.
5. Choose **Display**, and then choose **View in plain text**. You will see the log details for the following categories: `logMetadata/who/what/when/where/how/requestOther/responseOther`

> **Note**  
> You can use the **jti** key found the in how attribute to correlate jti in IDP. For example, in Okta, you can open the system log page found under Reports to view system logs in Okta using **jti**. You can download the CSV and search the file to find the corresponding jti log.
