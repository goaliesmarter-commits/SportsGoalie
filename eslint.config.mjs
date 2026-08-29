/*
  eslint-config-next 16 ships native flat configs. Routing them through
  FlatCompat.extends() ran them back through the legacy eslintrc loader, whose
  validator JSON.stringify's the config on error — and the flat plugin objects
  are self-referential (plugins.react points back at configs.flat), so every
  lint run died with "Converting circular structure to JSON" instead of
  reporting anything. Import the flat configs directly; no compat layer.
*/
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  // Global ignores. This has to be an object with `ignores` and nothing else —
  // paired with any other key it only narrows that one block, which is why the
  // previous config still tried to lint .next/ and coverage/.
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'next-env.d.ts',
      '.vercel/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'backups/**',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // React specific rules
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',

      // General rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
    },
  },

  {
    // Allow console statements in the error logger and utilities. Paths are
    // src-relative: the old lib/** globs matched nothing in this repo.
    files: ['src/lib/errors/**/*.ts', 'src/lib/utils/**/*.ts', 'scripts/**/*.{ts,js}'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
