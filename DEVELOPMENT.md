# FHIR Works on AWS Development Instructions

## Prerequisites for development

> **Note**  
> Please complete the [FHIR Works on AWS Deployment Installation](./INSTALL.md) and deploy the initial `fhir-works-on-aws` code to your AWS account. If you use Implementation Guides with your deployment, follow these steps to deploy locally:
>
> - [Using FHIR Implementation Guides](./solutions/deployment/USING_IMPLEMENTATION_GUIDES.md)
> - [Using FHIR Implementation Guides (SMART on FHIR deployment)](./solutions/smart-deployment/USING_IMPLEMENTATION_GUIDES.md)

FHIR Works on AWS is written in TypeScript. We recommend that you configure your IDE to render TypeScript errors and warnings. To ensure your IDE displays TS properly, see this guide on [code formatting using ESLint](https://medium.com/@netczuk/even-faster-code-formatting-using-eslint-22b80d061461).

This repository uses [Rush](https://rushjs.io/pages/intro/welcome/) as the monorepo manager and [pnpm](https://rushjs.io/pages/maintainer/package_managers/) as its package manager. Please complete the [Developer tutorial](https://rushjs.io/pages/developer/new_developer/) to learn about Rush.

1. Clone the repo: `git clone https://github.com/aws-solutions/fhir-works-on-aws`
2. Open to the directory: `cd fhir-works-on-aws`
3. Install rush: `npm install -g @microsoft/rush`
4. Run [`rush update`](https://rushjs.io/pages/commands/rush_update/).  
   This ensures rush is setup, which includes installing NPM packages as defined in the package.json files.

## Local development flow

1. After you have deployed the initial `fhir-works-on-aws` code your AWS account, create a feature branch from `develop`: `git pull; git checkout develop; git checkout -b feature/<feature>`.

   See [FHIR Works on AWS Deployment Installation](./INSTALL.md), if you have not yet deployed the initial code.

1. Run either:
   - [`rush build`](https://rushjs.io/pages/commands/rush_build/) - performs incremental build. See `rush build -h` for more options.
   - [`rush rebuild`](https://rushjs.io/pages/commands/rush_rebuild/) - performs a full clean build. See `rush rebuild -h` for more options.
1. Run `rush test` to test and update the code coverage summary in the README file for each package. See `rush test -h` for more options.

   Alternatively you can use: `rush build-test` to perform `rush build && rush test` for each package. See `rush build-test -h` for more options.

1. Run `rush lint-fix` to fix issues with ESLint.

> **Note**  
> To install new packages or dependencies, do **not** use `npm install`. Refer to the [documentation on modifying package.json](https://rushjs.io/pages/developer/modifying_package_json/) for more details.
>
> Packages can be added/updated in two ways:
>
> - Run `rush add -p <PACKAGE_NAME> --caret`.  
>   Always use the `--caret` or version with the caret symbol (example-lib@^1.2.3). Not including the caret installs tilde versions(e.g. ~1.2.3) by default. See `rush add -h` for more options.
> - Update the package.json in your package and run `rush update`.

## Staging a Pull Request

> **Note**  
> For information on our process for contributing via pull request, see [Contributing via Pull Requests](./CONTRIBUTING.md#contributing-via-pull-requests).

1. Follow [Local Development Flow](#Local-Development-Flow) to make changes locally.
2. Ensure you are on a feature branch; from the `develop` branch:
   ```
   git pull;
   git checkout develop;
   git checkout -b feature/<feature>
   ```
3. Once you complete your code changes and it passes test, push your changes to your feature branch:
   ```
   git add -A;
   git commit
   ```
   > **Note**  
   > The commit must be in [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
4. Fill out any required [commitizen](https://github.com/commitizen/cz-cli) fields triggered by `git commit`.
   > **Note**  
   > We have pre-commit git-hooks. These are used to inspect the snapshot that's about to be committed, to see if you've forgotten something, to make sure tests run, or to examine whatever you need to inspect in the code. We currently support:
   >
   > - [git-secrets](https://github.com/awslabs/git-secrets) prevents you from committing passwords and other sensitive information to a git repository
   > - prettier automatically formats your code on commit. If you want to format your code manually you can just run `git add -A; rush prettier`.
   > - generate code coverage summary in the root README file
   >
   > We have commit-msg git-hook configured:
   >
   > - A check has been added for commit messages to ensure they are in [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
5. Run `git push`.

Further checks are triggered on a Pull Request.

## Rush everyday commands

[`rush update`](https://rushjs.io/pages/commands/rush_update/)  
This ensures rush is setup, which includes installing NPM packages as defined in package.json files.

`rush update --purge`  
The `--purge` option deletes temporary files created by Rush. This is useful if you are having problems and suspect that cache files may be corrupt.

[`rush install`](https://rushjs.io/pages/commands/rush_install/)  
The `rush install` command installs package dependencies for all your projects, based on the pnpm-lock.yaml file that is created/updated using `rush update`.

Run either:

- [`rush build`](https://rushjs.io/pages/commands/rush_build/)  
  Performs incremental build. See `rush build -h` for more options.
- [`rush rebuild`](https://rushjs.io/pages/commands/rush_rebuild/)  
  Performs a full clean build. See `rush rebuild -h` for more options.

`rush test`  
Runs test and updates code coverage summary in README file for each package. See `rush test -h` for more options

[`rush add`](https://rushjs.io/pages/commands/rush_add/)  
Adds a specified package as a dependency of the current project (as determined by the current working directory), and then runs `rush update`. Always use the `--caret` or version with caret symbol(example-lib@^1.2.3). Not including the caret installs tilde versions(e.g. ~1.2.3) by default.

- `rush add -p example-lib --dev --caret`  
  Adds package to the devDependencies only for the current project (cd /path-to-your-project first)
- `rush add -p example-lib --all --dev --caret` or `rush add -p example-lib@^1.2.3 --all --dev`  
  Caret specifier for SemVer dependencies
- `rush add -p example-lib --all --dev --caret --make-consistent`  
  Make all devDependency for a package consistent across all projects
- `rush add -p example-lib@1.2.3 --all --dev` or `rush add -p example-lib --exact --all --dev`  
  Adds package to all the projects as devDependencies (installs the exact version, use this if there is a need for exact version or else always install dependencies and devDependencies with `--caret` option)

By default, using `rush` commands triggers them for all of the projects in the monorepo, but if you want to trigger a command just for a specific package then (for example trigger commands just for [fwoa-core/interface](./fwoa-core/interface/) package):

1.  Go to projects root folder - `cd ./fwoa-core/interface`.
2.  Instead of running commands using `rush` use `rushx`, example:
    - run build - `rushx build`
    - run test - `rushx test`
    - run lint:fix - `rushx lint-fix`

## Commands applicable for developers with existing GitHooks

### `rush cinstall/cupdate` usage instructions:

1. `git checkout develop`
2. `git checkout -b < your new branch >`
3. `rush install --bypass-policy` (This will install the `cinstall` and `cupdate` commands)
4. Start using `rush cinstall` or `rush cupdate` instead of `rush install` or `rush update`.

### Fix pnpm audit errors

1.  In `<rootDir>/common/config/rush/pnpm-config.json` update:

        "globalOverrides": {
            "`<packageName>`":  "`<suggestedVersion>`"
        }

2.  `rush update --recheck --bypass-policy`
3.  `rush cinstall/cupdate`
4.  `cd common/temp; pnpm audit --prod` -> this should report no vulnerabilities

## Getting support for rush

[Getting Support](https://rushjs.io/pages/help/support/)

## Troubleshooting

### Accessing Logs and Debugging on FWoA

FWoA logs and debugging are handled by Amazon CloudWatch, and you can utilize FWoA CloudWatch logs alongside identity provider (IdP) logs to identify past API search requests. For more information, see [What is CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html).

Identifying past API searches requires cross analyzing timestamps between the two log sources to correlate the issuance of a credential to past FWoA API requests.

> **Note**  
> Amazon CloudWatch retains search query content for GET requests, but not POST requests.

To obtain and analyze FWoA logs:

1. Sign in to the [AWS Console](https://console.aws.amazon.com/) and navigate to **CloudWatch** → **Log Groups**.
2. From the list of log groups, select the Lambda function or API Gateway service that you would like to debug:

   - `/aws/lambda/smart-fhir-service-{STAGE}-fhirServer`  
     Contains all logs from the FWoA API server, including transactions and requests. In most cases, this will be the primary log group to check when receiving errors from the FWoA server.
   - `/aws/api-gateway/fhir-service-{STAGE}`  
     Contains all logs related to the API Gateway setup for FWoA.
   - `/aws/lambda/smart-fhir-service-{STAGE}-ddbtoES`  
     Contains all logs from the process of writing DynamoDB resources to ElasticSearch.

3. Select a stream to view the output for the function. If applicable, the Lambda function version will be prefixed in square brackets (`[]`) to help identify which stream corresponds to which version (example: `YYYY/MM/DD/[{VERSION}]`).

4. _(Optional)_ To further refine the output of the function, filter the events in a stream using the options at the top of the list. Additionally, you can perform broader searches through **Logs Insights** located on the left panel.
5. To compare FWoA logs with your third-party IdP’s logs, match the FWoA Cloudwatch **log stream log events** with timestamps from the IdP logs.
