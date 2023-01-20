# FWoA Core ESLint Config Custom

⚠️ $\textcolor{red}{\text{Experimental}}$ ⚠️ : Not for use in any critical, production, or otherwise important deployments

## Description

Custom ESLint rules

## Usage

1. Update your package.json:

```
"devDependencies": {
    .
    .
    "@aws/eslint-config-fwoa-core-eslint-custom": "workspace:*"
  }
```

2. Update your eslintrc.js:

```
// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: [
    '@aws/workbench-core-eslint-custom'
  ],
  parserOptions: { tsconfigRootDir: __dirname }
};
```
