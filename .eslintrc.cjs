module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: undefined,
  },
  plugins: ['@typescript-eslint', 'import', 'promise', 'node'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:promise/recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2020: true,
    browser: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
      typescript: {
        alwaysTryTypes: true,
        project: [
          './tsconfig.base.json',
          './apps/*/tsconfig.json',
          './packages/*/tsconfig.json',
        ]
      },
    },
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      },
    ],
  },
  overrides: [
    {
      files: ['*.js', '*.cjs'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        'node/no-extraneous-require': 'off',
      },
    },
    {
      files: ['scripts/**/*.ts', 'scripts/**/*.mjs', 'create-superadmin-direct.js'],
      rules: {
        'no-process-exit': 'off',
        'node/shebang': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'build/', '.next/', 'node_modules/'],
};
