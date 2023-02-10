// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@aws/eslint-config-fwoa-eslint-custom'],
  parserOptions: { tsconfigRootDir: __dirname },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'security/detect-object-injection': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'import/namespace': 'off'
      }
    }
  ]
};
