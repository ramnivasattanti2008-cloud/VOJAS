/**
 * Test helpers for provisioning authenticated users.
 *
 * Why this exists: POST /auth/register deliberately ignores any `role` in the
 * request body and always creates a CITIZEN, so that public self-registration
 * can never grant a privileged role. Tests that need an ADMIN, OFFICER or other
 * privileged account must therefore create it the way production does — as a
 * record written by a trusted path — rather than by asking the public endpoint
 * for one.
 *
 * These helpers change only how a privileged user is provisioned. They do not
 * relax any assertion: a test that expects CITIZEN to be refused still expects
 * exactly that.
 */

import { prisma } from '@vojas/db';
import { UserRole } from '@vojas/shared';
import { hashPassword } from '../src/auth/password.js';
import { signAccessToken } from '../src/auth/jwt.js';

export interface TestUser {
  id: string;
  email: string;
  role: string;
  token: string;
  password: string;
}

let counter = 0;

/** A unique address per call, so parallel test files never collide. */
export function uniqueEmail(prefix = 'test'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@vojas.test`;
}

/**
 * Creates a user with the given role directly in the database and returns a
 * signed access token for it — the same token shape the login route issues.
 */
export async function createUserWithRole(
  role: UserRole | string,
  options: { email?: string; password?: string; name?: string; isActive?: boolean } = {}
): Promise<TestUser> {
  const email = options.email ?? uniqueEmail(String(role).toLowerCase());
  const password = options.password ?? 'TestPass123!';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: options.name ?? `Test ${role}`,
      role: role as UserRole,
      isActive: options.isActive ?? true,
    },
    select: { id: true, email: true, role: true },
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: 'test-session',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const token = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role as unknown as UserRole,
    sessionId: session.id,
  });

  return { id: user.id, email: user.email, role: user.role, token, password };
}

/** Convenience wrappers for the roles the suite uses most. */
export const createAdmin = (opts?: Parameters<typeof createUserWithRole>[1]) =>
  createUserWithRole(UserRole.ADMIN, opts);

export const createOfficer = (opts?: Parameters<typeof createUserWithRole>[1]) =>
  createUserWithRole(UserRole.OFFICER, opts);

export const createCitizen = (opts?: Parameters<typeof createUserWithRole>[1]) =>
  createUserWithRole(UserRole.CITIZEN, opts);

/** Authorization header for a token returned by the helpers above. */
export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
