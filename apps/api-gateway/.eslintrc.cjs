module.exports = {
  extends: ['../../.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'node/no-extraneous-import': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      files: ['test/**/*.ts'],
      rules: {
        'import/no-unresolved': ['error', { ignore: ['^bun:test$'] }],
        '@typescript-eslint/no-unused-vars': 'off'
      },
    },
  ],
};
