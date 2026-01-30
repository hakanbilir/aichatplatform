const path = require('path');

module.exports = {
  extends: ['../../.eslintrc.cjs', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed for React 17+ (Vite)
    'node/no-missing-import': 'off', // Vite handles imports differently
    'node/no-unpublished-import': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unsupported-features/node-builtins': 'off',
    'import/named': 'off', // Often causes false positives with some libs or setups
    'react/prop-types': 'off', // We use TypeScript
  },
  env: {
    browser: true,
    es2020: true,
  }
};
