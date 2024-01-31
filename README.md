# FHIR Works on AWS

# End of Life

**FHIR Works on AWS has reached End of Life. This repository will be archived and set as read only. For migration alternatives please read the End of Life Notice below.**

## **End of Life Notice**

FHIR Works on AWS is reaching end of life and will no longer be available starting on January 31, 2024 — the End of Life (EOL) date. Customers will be able to use FHIR Works on AWS until the EOL date, at which time the FHIR Works on AWS solution repository will be made read-only and archived for customers.

### Will there be any new feature releases for FHIR Works on AWS?

No. As the service is reaching EOL, we will not release any new features. However, we will continue to make security improvements and manage FHIR Works on AWS as expected until the EOL date. After the EOL date, FHIR Works on AWS will no longer receive any new feature updates, bug fixes or security updates from AWS. After the EOL date, customers who continue to use the software are responsible for the maintenance of the software and its dependencies.

### Where should I migrate to?

AWS HealthLake is a HIPAA-eligible service that provides FHIR APIs that help healthcare and life sciences companies securely store, transform, transact, and analyze health data in minutes to give a chronological view at the patient and population-level. AWS HealthLake natively achieved feature parity with FHIR Works on AWS including SMART on FHIR and Bulk FHIR capabilities. Further, AWS HealthLake can support customer conformance with 21st Century Cures Act for patient access and interoperability requirements through a fully managed FHIR server.

AWS has released a migration tool in the FHIR Works on AWS GitHub repository to enable migration to Amazon HealthLake. The migration tool is a collection of scripts that automates the export of FHIR resources from FHIR Works on AWS and imports them into Amazon HealthLake.

### What support is available?

Customers using FHIR Works on AWS can now move their workloads to AWS HealthLake leveraging the migration tool provided by AWS. Customers will be supported for migration from FHIR Works to an AWS Service such as AWS HealthLake beyond EOL. For you prefer not to migrate to AWS HealthLake or do not have AWS HealthLake support in your region, please contact your AWS account team for alternatives. If you have any questions regarding migration support, please reach out to AWS at fwoa-migration-support@amazon.com.

## Maintenance Notice

FHIR Works on AWS has been moved to maintenance mode. While in maintenance, we will not add any new features to this solution. All security issues should be reported directly to AWS Security at [aws-security@amazon.com](mailto:security@amazon.com). If you are new to this solution, we advise you to explore using [HealthLake](https://aws.amazon.com/healthlake), which is our managed service for building FHIR based transactional and analytics applications. You can get started by contacting your AWS Account team. If you are an existing customer of FHIR Works on AWS, and have additional questions or need immediate help, please reach out to [fwoa-migration-support@amazon.com](mailto:fwoa-migration-support@amazon.com) or contact your AWS Account team.

The FHIR Works on AWS solution helps software engineers at independent software vendors,
system integrators, and healthcare information technology teams to enhance their own products.
Using this solution, they can transfer medical records to both mobile devices and web portals in
minutes rather than days or hours by integrating with the [Fast Healthcare Interoperability
Resources (FHIR)](https://www.hl7.org/implement/standards/product_brief.cfm?product_id=491) standard APIs. The FHIR standard was developed by [Health Level Seven
International (HL7)](https://www.hl7.org/) to improve the exchange of health data between software systems such as
practice management, electronic health records, billing, and data exchange interfaces. It uses a
serverless FHIR API that supports FHIR resource types and operations to help healthcare providers
leverage the FHIR standard to manage healthcare records. It is a reference implementation,
designed to be extensible.

To learn more about FWoA, download the [FWoA Implementation Guide](./FHIR%20Works%20on%20AWS%20Implementation%20Guide%20-%2024-MAR-2023%20-%20v6.0.0.pdf) and see the following README files for individual FWoA packages:

and see the following README files for individual FWoA packages:

- [deployment](./solutions/deployment/README.md)
- [smart-deployment](./solutions/smart-deployment/README.md)
- [authz-rbac](./fwoa-core/authz-rbac/README.md)
- [authz-smart](./fwoa-core/authz-smart/README.md)
- [interface](./fwoa-core/interface/README.md)
- [persistence-ddb](./fwoa-core/persistence-ddb/README.md)
- [routing](./fwoa-core/routing/README.md)
- [search-es](./fwoa-core/search-es/README.md)

## Contributing Guidelines

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional documentation,
we greatly value feedback and contributions from our community.

Please review the [Contributing Guidelines](CONTRIBUTING.md) before submitting any issues or pull requests to ensure we have all the necessary information to effectively
respond to your bug report or contribution.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security issue notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.

## Licensing

This project is licensed under the Apache-2.0 license.

For more information, see the [LICENSE](LICENSE) file. If you choose to contribute, we will ask you to confirm your contribution's license.

This solution collects anonymous operational metrics to help AWS improve the quality and features of the solution. For more information, including how to disable this capability, please see the [FWoA Implementation Guide](https://docs.aws.amazon.com/solutions/latest/fhir-works-on-aws/welcome.html)
