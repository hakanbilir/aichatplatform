module.exports = {
  extends: ['../../.eslintrc.cjs'],
  overrides: [
    {
      files: ['test/**/*.ts'],
      rules: {
        'import/no-unresolved': ['error', { ignore: ['^bun:test$'] }],
      },
    },
    {
      files: ['ecosystem.config.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
