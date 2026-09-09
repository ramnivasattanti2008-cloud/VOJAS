import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'legacy/**',
      'frontend/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.prisma/**',
      'apps/web/next-env.d.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        Node: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript-specific
      'no-undef': 'off', // disable because TS handles it
      // Base no-unused-vars doesn't understand TS-only syntax (enum members, etc.)
      // and double-reports alongside the TS-aware rule below — must be off per
      // typescript-eslint's own guidance when using @typescript-eslint/no-unused-vars.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      // Note: no-misused-promises requires type-aware linting (parserOptions.project),
      // which isn't set up across this monorepo's multiple tsconfigs. Not adding it
      // here rather than bolting on typed-linting infra as a side effect of the lint gate.

      // React hooks
      'react-refresh/only-export-components': 'off', // if using, but we keep off

      // Express Request augmentation
      'no-restricted-syntax': ['error', {
        selector: 'TSInterfaceDeclaration[id=\'Request\'] > TSPropertySignature',
        message: 'Do not augment Request interface in files; use module augmentation.',
      }],

      // Allow short-circuit expressions in smoke tests
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],

      // No namespace for Express augmentation
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
];