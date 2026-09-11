/**
 * Shared test fixtures for privileged accounts.
 *
 * Public self-registration is deliberately hard-wired to CITIZEN in
 * routes/auth.ts — any `role` in the request body is ignored, so nobody can
 * escalate through POST /auth/register. Privileged accounts exist only via
 * POST /admin/users, which itself requires admin.manage.
 *
 * Test fixtures therefore provision staff accounts directly, the same way
 * prisma/seed.ts does, and then log in through the real login route. The token
 * a fixture carries is a genuinely issued one, so RBAC is still exercised
 * end to end rather than bypassed.
 */
import { prisma } from '@vojas/db';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../src/app';

const BASE = '/api/v1';

export type TestRole =
  | 'ADMIN'
  | 'OFFICER'
  | 'MP'
  | 'CITIZEN'
  | 'CONTRACTOR'
  | 'REVIEWER'
  | 'ANALYST'
  | 'FIELD_OFFICER'
  | 'VIEWER';

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  role: TestRole;
  token: string;
}

export function genEmail(prefix = 'fixture') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example.com`;
}

/**
 * Creates a user with the given role and returns a real access token for it.
 * Rounds are kept low deliberately — these are throwaway fixture credentials
 * and the suite creates dozens of them.
 */
export async function createUserWithRole(
  role: TestRole,
  opts: { email?: string; password?: string; name?: string } = {},
): Promise<TestUser> {
  const email = opts.email ?? genEmail(role.toLowerCase());
  const password = opts.password ?? 'FixturePass123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role, passwordHash, isActive: true },
    create: { email, name: opts.name ?? `Test ${role}`, passwordHash, role, isActive: true },
    select: { id: true },
  });

  const res = await request(app).post(`${BASE}/auth/login`).send({ email, password });
  const token: string = res.body?.data?.accessToken ?? '';
  if (!token) {
    throw new Error(
      `Fixture login failed for role ${role} (status ${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  return { userId: user.id, email, password, role, token };
}

/** Registers a citizen through the real public route, which is what it is for. */
export async function registerCitizen(
  opts: { email?: string; password?: string; name?: string } = {},
): Promise<TestUser> {
  const email = opts.email ?? genEmail('citizen');
  const password = opts.password ?? 'FixturePass123!';
  const res = await request(app)
    .post(`${BASE}/auth/register`)
    .send({ email, password, name: opts.name ?? 'Test Citizen' });
  const token: string = res.body?.data?.accessToken ?? '';
  if (!token) {
    throw new Error(
      `Citizen registration failed (status ${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return { userId: res.body.data.user.id, email, password, role: 'CITIZEN', token };
}
