/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { importConvention } from './rules/import-convention';

const rules: any = Object.assign({}, importConvention.rules);

export const customESLint: any = {
  plugins: ['security', 'import'],
  extends: [
    '@rushstack/eslint-config/profile/node',
    '@rushstack/eslint-config/mixins/tsdoc',
    'plugin:security/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  rules: { ...rules, '@typescript-eslint/naming-convention': 'off' },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  }
};
