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

  // ── The fabricated-data gate ────────────────────────────────────────────────
  //
  // VOJAS is an anti-corruption tool: an invented figure is worse than a blank
  // field, because a citizen or auditor cannot tell the two apart. Fabricated
  // civic data had already been removed from these paths once and came back, so
  // the prohibition is enforced by the linter rather than by documentation.
  //
  // Scoped to the rendering layer. Math.random() remains legitimate in the API
  // for IDs, job IDs, filenames and reference suffixes — it is only banned where
  // a value could be read by a user as a fact.
  {
    files: ['apps/web/src/app/**/*.tsx', 'apps/web/src/components/**/*.tsx'],
    rules: {
      'no-restricted-properties': ['error', {
        object: 'Math',
        property: 'random',
        message:
          'Never derive a displayed value from Math.random(). If real data is unavailable, render <DataUnavailable> or <ValueUnavailable> instead of a placeholder figure.',
      }],
      'no-restricted-syntax': ['error',
        {
          selector: 'VariableDeclarator[id.name=/^(MOCK|mock|FAKE|fake|DUMMY|dummy|SAMPLE_DATA|PLACEHOLDER)/]',
          message:
            'Mock data must not ship in the rendering layer. Wire the real API hook and render an explicit unavailable state when it returns nothing.',
        },
        {
          selector: 'Property[key.name=/^(approvedAmount|sanctionedAmount|spentAmount|totalAmount|totalSanctioned|totalSpent|totalReleased|projectCount|utilization|utilizationPercent)$/][value.type=\'Literal\'][value.value!=0]',
          message:
            'Hardcoded financial amounts, counts and utilisation figures are prohibited in the rendering layer. These values must come from the API.',
        },
      ],
    },
  },
];