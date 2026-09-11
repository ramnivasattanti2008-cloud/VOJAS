import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Vitest does not populate process.env from .env files. Loading the repo-root
// .env here is what makes DATABASE_URL_TEST visible to tests/setup.ts, so the
// DB-backed integration suites actually run locally instead of silently
// skipping while the ungated ones fail against an unreachable database.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const rootEnv = loadEnv('test', repoRoot, '');

const testDbUrl = rootEnv.DATABASE_URL_TEST ?? process.env.DATABASE_URL_TEST;

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    env: {
      // The suites register and log in dozens of fixture users and submit
      // several reports, which exceeds the production rate-limit ceilings and
      // made tests fail with 429 — and, worse, cascade into spurious 401s once
      // a throttled beforeAll handed back empty tokens. Raised here rather than
      // disabled: the 'Rate Limiting' suite still asserts that RateLimit
      // headers are present, and the production defaults in app.ts are
      // unchanged.
      RATE_LIMIT_AUTH: '100000',
      RATE_LIMIT_REPORT_SUBMIT: '100000',
      RATE_LIMIT_AI: '100000',
      RATE_LIMIT_SEARCH: '100000',
      RATE_LIMIT_GENERAL: '100000',
      ...(testDbUrl ? { DATABASE_URL_TEST: testDbUrl, DATABASE_URL: testDbUrl } : {}),
    },
  },
});
