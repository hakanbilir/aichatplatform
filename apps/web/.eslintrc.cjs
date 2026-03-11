module.exports = {
  extends: [
    '../../.eslintrc.cjs',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed for React 17+
    'react/prop-types': 'off', // TypeScript handles this
    '@next/next/no-img-element': 'off', // Turn off Next.js rules if they are leaking
    'import/named': 'off', // Rely on TS for named imports, as MUI exports are tricky
    '@typescript-eslint/no-explicit-any': 'off', // Legacy dashboard modules still rely on dynamic payloads
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      files: ['vite.config.ts'],
      rules: {
        'node/no-unpublished-import': 'off',
      },
    },
  ],
};
