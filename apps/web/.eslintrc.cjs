module.exports = {
  extends: ['../../.eslintrc.cjs', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Disable node rules that might conflict with browser code
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-extraneous-import': 'off',
    'node/no-unpublished-import': 'off',

    // React 17+ doesn't need React in scope
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off', // Using TS
  },
};
