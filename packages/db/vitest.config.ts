import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Vitest does not populate process.env from .env files, so the repo-root .env is
// read explicitly here. Without it DATABASE_URL_TEST is never visible to the
// suite, and "no test database configured" becomes indistinguishable from
// "the test database is broken".
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const rootEnv = loadEnv('test', repoRoot, '');

const testDbUrl = rootEnv.DATABASE_URL_TEST ?? process.env.DATABASE_URL_TEST;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    // Point the Prisma singleton at the test database before any module that
    // constructs it gets imported.
    env: testDbUrl ? { DATABASE_URL_TEST: testDbUrl, DATABASE_URL: testDbUrl } : {},
  },
});
