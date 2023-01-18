/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { expandNamingConventionSelectors } from './macros';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const namingConvention: any = {
  rules: {
    '@typescript-eslint/naming-convention': [
      'warn',
      ...expandNamingConventionSelectors([
        {
          // We should be stricter about 'enumMember', but it often functions legitimately as an ad hoc namespace.
          selectors: ['variable', 'enumMember', 'function'],

          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',

          filter: {
            regex: [
              // This is a special exception for naming patterns that use an underscore to separate two camel-cased
              // parts.  Example:  "checkBox1_onChanged" or "_checkBox1_onChanged"
              '^_?[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*_[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*$'
            ]
              .map((x) => `(${x})`)
              .join('|'),
            match: false
          }
        },

        {
          selectors: ['parameter'],

          format: ['camelCase'],

          filter: {
            regex: [
              // Silently accept names with a double-underscore prefix; we would like to be more strict about this,
              // pending a fix for https://github.com/typescript-eslint/typescript-eslint/issues/2240
              '^__'
            ]
              .map((x) => `(${x})`)
              .join('|'),
            match: false
          }
        },

        // Genuine properties
        {
          selectors: ['parameterProperty', 'accessor'],
          enforceLeadingUnderscoreWhenPrivate: true,

          format: ['camelCase', 'UPPER_CASE'],

          filter: {
            regex: [
              // Silently accept names with a double-underscore prefix; we would like to be more strict about this,
              // pending a fix for https://github.com/typescript-eslint/typescript-eslint/issues/2240
              '^__',
              // Ignore quoted identifiers such as { "X+Y": 123 }.  Currently @typescript-eslint/naming-convention
              // cannot detect whether an identifier is quoted or not, so we simply assume that it is quoted
              // if-and-only-if it contains characters that require quoting.
              '[^a-zA-Z0-9_]',
              // This is a special exception for naming patterns that use an underscore to separate two camel-cased
              // parts.  Example:  "checkBox1_onChanged" or "_checkBox1_onChanged"
              '^_?[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*_[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*$'
            ]
              .map((x) => `(${x})`)
              .join('|'),
            match: false
          }
        },

        // Properties that incorrectly match other contexts
        // See issue https://github.com/typescript-eslint/typescript-eslint/issues/2244
        {
          selectors: ['property'],
          enforceLeadingUnderscoreWhenPrivate: true,

          // The @typescript-eslint/naming-convention "property" selector matches cases like this:
          //
          //   someLegacyApiWeCannotChange.invokeMethod({ SomeProperty: 123 });
          //
          // and this:
          //
          //   const { CONSTANT1, CONSTANT2 } = someNamespace.constants;
          //
          // Thus for now "property" is more like a variable than a class member.
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',

          filter: {
            regex: [
              // Silently accept names with a double-underscore prefix; we would like to be more strict about this,
              // pending a fix for https://github.com/typescript-eslint/typescript-eslint/issues/2240
              '^__',
              // Ignore quoted identifiers such as { "X+Y": 123 }.  Currently @typescript-eslint/naming-convention
              // cannot detect whether an identifier is quoted or not, so we simply assume that it is quoted
              // if-and-only-if it contains characters that require quoting.
              '[^a-zA-Z0-9_]',
              // This is a special exception for naming patterns that use an underscore to separate two camel-cased
              // parts.  Example:  "checkBox1_onChanged" or "_checkBox1_onChanged"
              '^_?[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*_[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*$'
            ]
              .map((x) => `(${x})`)
              .join('|'),
            match: false
          }
        },

        {
          selectors: ['method'],
          enforceLeadingUnderscoreWhenPrivate: true,

          // A PascalCase method can arise somewhat legitimately in this way:
          //
          // class MyClass {
          //    public static MyReactButton(props: IButtonProps): JSX.Element {
          //      . . .
          //    }
          // }
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',

          filter: {
            regex: [
              // Silently accept names with a double-underscore prefix; we would like to be more strict about this,
              // pending a fix for https://github.com/typescript-eslint/typescript-eslint/issues/2240
              '^__',
              // This is a special exception for naming patterns that use an underscore to separate two camel-cased
              // parts.  Example:  "checkBox1_onChanged" or "_checkBox1_onChanged"
              '^_?[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*_[a-z][a-z0-9]*([A-Z][a-z]?[a-z0-9]*)*$'
            ]
              .map((x) => `(${x})`)
              .join('|'),
            match: false
          }
        },

        // Types should use PascalCase
        {
          // Group selector for: class, interface, typeAlias, enum, typeParameter
          selectors: ['class', 'typeAlias', 'enum', 'typeParameter'],
          format: ['PascalCase'],
          leadingUnderscore: 'allow'
        },

        {
          selectors: ['interface'],
          format: ['PascalCase'],
          // Override I prefix for interface
          custom: {
            regex: '^_?[A-Z]',
            match: true
          }
        }
      ])
    ]
  }
};
