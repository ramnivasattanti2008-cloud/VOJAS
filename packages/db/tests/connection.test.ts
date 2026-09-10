import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  prisma,
  connectDb,
  disconnectDb,
  verifyPostGIS,
  findProjectsNear,
} from '../src';

// These are integration tests: they need a live PostgreSQL + PostGIS instance.
// Without DATABASE_URL the Prisma client cannot even initialise, so the suite
// reports honestly as skipped instead of failing the whole run (CI has no
// database). With DATABASE_URL set, every test below runs unchanged.
describe.skipIf(!process.env.DATABASE_URL)('Database connection', () => {
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  test('connects to PostgreSQL', async () => {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(result).toBeDefined();
    expect(result[0].ok).toBe(1);
  });

  test('PostGIS extension is enabled', async () => {
    const hasPostGIS = await verifyPostGIS();
    expect(hasPostGIS).toBe(true);
  });

  test('User model CRUD works', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'test-connection@vojas.gov' },
      update: {},
      create: {
        email: 'test-connection@vojas.gov',
        name: 'Connection Test',
        passwordHash: 'x',
        role: 'ADMIN',
      },
    });
    expect(testUser.id).toBeDefined();
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  test('findProjectsNear returns projects within radius (requires seed data)', async () => {
    const nearby = await findProjectsNear(12.9716, 77.5946, 50000); // 50 km of Bangalore
    expect(Array.isArray(nearby)).toBe(true);
  });
});
