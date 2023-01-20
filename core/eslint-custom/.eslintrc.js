// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  plugins: ['security', 'import'],
  extends: [
    '@rushstack/eslint-config/profile/node',
    '@rushstack/eslint-config/mixins/tsdoc',
    'plugin:security/recommended',
    'plugin:import/recommended'
  ],
  rules: {
    'import/no-unresolved': ['off'],
    'import/named': ['off'],
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        },
        groups: ['builtin', 'external', 'parent', 'sibling']
      }
    ],
    'import/newline-after-import': ['error']
  },
  parserOptions: { tsconfigRootDir: __dirname }
};
