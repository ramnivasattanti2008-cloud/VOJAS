import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  // Ignore patterns
  {
    ignores: ["dist/**", "node_modules/**", "*.cjs"],
  },

  // TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        React: "readonly",
        console: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URLSearchParams: "readonly",
        File: "readonly",
        Request: "readonly",
        HeadersInit: "readonly",
        RequestInit: "readonly",
        Response: "readonly",
        HTMLElement: "readonly",
        IntersectionObserver: "readonly",
        Node: "readonly",
        Element: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,

      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Warn on console (allow warn/error/info)
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],

      // Allow explicit any (used in error handling and types.ts)
      "@typescript-eslint/no-explicit-any": "off",

      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Disable react-refresh for now (all routes are lazy so fine)
      "react-refresh/only-export-components": "off",
    },
  },

  // Prettier must be last to disable conflicting rules
  prettier,
];
