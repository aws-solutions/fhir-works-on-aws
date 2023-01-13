# Development Instructions

## Prerequisites for development

Code for [fhir-works-on-aws](https://github.com/awslabs/fhir-works-on-aws) is written in TypeScript. It is highly recommended you configure your IDE to render TypeScript errors and warnings. To make sure your IDE displays TS properly, see this [guide to help](https://medium.com/@netczuk/even-faster-code-formatting-using-eslint-22b80d061461)

This repository uses [Rush](https://rushjs.io/pages/intro/welcome/) as the monorepo manager and [pnpm](https://rushjs.io/pages/maintainer/package_managers/) as it's package manager. Please go through the [Developer tutorial](https://rushjs.io/pages/developer/new_developer/) for Rush usage details

1. Clone the repo: `git clone https://github.com/awslabs/solution-spark-on-aws.git`
2. Move to the correct directory: `cd fhir-works-on-aws`
3. Install rush: `npm install -g @microsoft/rush`
4. Run [`rush update`](https://rushjs.io/pages/commands/rush_update/) - This ensures rush is set-up and ready to go, which includes installing NPM packages as defined in package.json files

## Local development flow

1. Set up your repo ([Follow Prerequisites for development](#prerequisites-for-development)) on your local machine
2. Create a feature branch from `develop`: `git pull; git checkout develop; git checkout -b feature/<feature>`
3. Run: [`rush check`](https://rushjs.io/pages/commands/rush_check/) - Checks each project's package.json files and ensures that all dependencies are of the same version throughout the repository.
4. Run either of the two:
    - [`rush build`](https://rushjs.io/pages/commands/rush_build/) - performs incremental build. See `rush build -h` for more options
    - [`rush rebuild`](https://rushjs.io/pages/commands/rush_rebuild/) - performs a full clean build. See `rush rebuild -h` for more options
5. `rush test` - runs test and updates code coverage summary in README file for each package. See `rush test -h` for more options
6. Alternatively you can use:
    - `rush build-test` - single command to perform `rush build && rush test` for each package. See `rush build-test -h` for more options

[//]: # (7. `rush common-coverage-report` - updates root README file with code coverage summary)
8. `rush lint-fix` - automatically fixes eslint problems

NOTE: to install new packages or dependencies: **DO NOT USE** `npm install`. Refer to the [documentation](https://rushjs.io/pages/developer/modifying_package_json/) for more details. Packages can be added/updated in 2 ways:
- `rush add -p <PACKAGE_NAME> --caret`. Always use the `--caret` or version with caret sign(example-lib@^1.2.3), not doing so by default installs tilde versions(e.g. ~1.2.3). See `rush add -h` for more options.
- Update the package.json in your package and run `rush update`.

## Staging a Pull Request

1. Make changes locally ([Follow Local Development Flow](#Local-Development-Flow))
2. Ensure you are on a feature branch; from `develop` branch: `git pull; git checkout develop; git checkout -b feature/<feature>`
3. If you are happy with your code and they are passing tests, you can push your changes to your feature branch: `git add -A; git commit`
    - Note: the commit must be in [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format
4. `git commit` will trigger [commitizen](https://github.com/commitizen/cz-cli) and you'll be prompted to fill out any required commit fields at commit time.
5. We have pre-commit git-hooks. These are used to inspect the snapshot that's about to be committed, to see if you've forgotten something, to make sure tests run, or to examine whatever you need to inspect in the code. We currently support:
    - [git-secrets](https://github.com/awslabs/git-secrets) prevents you from committing passwords and other sensitive information to a git repository
    - prettier is configured to automatically format your code on commit. If you want to format your code manually you can just do: `git add -A; rush prettier`
    - generate code coverage summary in the root README file
6. We have commit-msg git-hook configured:
    - A check has been added for commit messages to ensure they are in [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
7. `git push`
8. Further checks are triggered on a Pull Request. Please refer the [Pull Requests Process](#pull-requests-process) section

## Pull Requests Process

Please refer to [Contributing via Pull Requests](./CONTRIBUTING.md#contributing-via-pull-requests)

## Rush everyday commands
1. [`rush update`](https://rushjs.io/pages/commands/rush_update/) - This ensures rush is set-up and ready to go, which includes installing NPM packages as defined in package.json files
    - `rush update --purge` - The `--purge` option is used to delete temporary files created by Rush. This is useful if you are having problems and suspect that cache files may be corrupt.
2. [`rush install`](https://rushjs.io/pages/commands/rush_install/) - The `rush install` command installs package dependencies for all your projects, based on the pnpm-lock.yaml file that is created/updated using `rush update`
3. [`rush add`](https://rushjs.io/pages/commands/rush_add/) - Adds a specified package as a dependency of the current project (as determined by the current working directory) and then runs `rush update`. Always use the `--caret` or version with caret sign(example-lib@^1.2.3), not doing so by default installs tilde versions(e.g. ~1.2.3)
    - `rush add -p example-lib --dev --caret` - Adds package to the devDependencies only for the current project (cd /path-to-your-project first)
    - `rush add -p example-lib --all --dev --caret` or `rush add -p example-lib@^1.2.3 --all --dev` - Caret specifier for SemVer dependencies
    - `rush add -p example-lib --all --dev --caret --make-consistent` - Make all devDependency for a package consistent across all projects
    - `rush add -p example-lib@1.2.3 --all --dev` or `rush add -p example-lib --exact --all --dev` - Adds package to all the projects as devDependencies (installs the exact version, use this if there is a need for exact version or else always install dependencies and devDependencies with `--caret` option)
4. [`rush check`](https://rushjs.io/pages/commands/rush_check/) - Checks each project's package.json files and ensures that all dependencies are of the same version throughout the repository.
5. Triggering commands using `rush` as mentioned above triggers them for all the projects in the monorepo, but if you want to trigger a command just for a specific package then (for example trigger commands just for [workbench-core/audit](./workbench-core/audit/) package):
    - Go to projects root folder - `cd ./workbench-core/audit`
    - Instead of running commands using `rush` use `rushx`, example:
        - run build - `rushx build`
        - run test - `rushx test`
        - run lint:fix - `rushx lint-fix`

## Commands applicable for developers with existing GitHooks
### `rush cinstall/cupdate` usage instructions:
1. `git checkout develop`
2. `git checkout -b < your new branch >`
3. `rush install --bypass-policy` (This will install the `cinstall` and `cupdate` commands)
4. Start using `rush cinstall` or `rush cupdate` instead of `rush install` or `rush update`.

## Getting support for rush
[Getting Support](https://rushjs.io/pages/help/support/)