// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@aws/eslint-config-fwoa-eslint-custom'],
  parserOptions: { tsconfigRootDir: __dirname },
  ignorePatterns: ['src/smartAuthorizationHelper.test.ts', 'scripts/generateResourceReferenceMatrixFile.ts'],
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'security/detect-object-injection': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@rushstack/typedef-var': 'off',
        '@typescript-eslint/typedef': 'off',
        'tsdoc/syntax': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        'security/detect-non-literal-regexp': 'off',
        'security/detect-unsafe-regex': 'off',
        '@rushstack/no-new-null': 'off',
        '@rushstack/security/no-unsafe-regexp': 'off',
        'import/no-named-as-default-member': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    },
    {
      files: ['src/smartHandler.test.ts'],
      rules: {
        'max-lines': 'off'
      }
    }
  ]
};
