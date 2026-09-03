import { beforeAll, afterAll } from 'vitest';
import { connectDb, disconnectDb } from '@vojas/db';

// Set test environment defaults
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-integration-tests-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000';

// Set test database URL if available
const testDbUrl = process.env.DATABASE_URL_TEST;
if (testDbUrl) {
  process.env.DATABASE_URL = testDbUrl;
} else {
  // Use a dummy URL so Prisma client can initialize (queries will fail without real DB)
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/vojas_test';
}

export const dbAvailable = (() => {
  // Check if a real test database is available
  return Boolean(process.env.DATABASE_URL_TEST);
})();

beforeAll(async () => {
  if (!dbAvailable) {
    console.warn('[Test Setup] No DATABASE_URL_TEST set. DB-dependent tests will be skipped.');
    return;
  }
  try {
    await connectDb();
    console.log('[Test Setup] Database connected');
  } catch (err) {
    console.warn('[Test Setup] Could not connect to database.');
  }
});

afterAll(async () => {
  if (!dbAvailable) return;
  try {
    await disconnectDb();
  } catch {
    // Ignore cleanup errors
  }
});
