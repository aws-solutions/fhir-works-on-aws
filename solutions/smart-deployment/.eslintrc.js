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
        '@rushstack/typedef-var': 'off',
        'import/namespace': 'off',
        'tsdoc/syntax': 'off',
        'import/no-named-as-default-member': 'off'
      }
    },
    {
      files: [
        'src/implementationGuides/loadCompiledIGs.ts',
        'src/implementationGuides/IGCompiler.test.ts',
        'src/implementationGuides/IGCompiler.ts'
      ],
      rules: { 'security/detect-non-literal-fs-filename': 'off' }
    }
  ]
};
