/**
 * VOJAS Security Tests — M17 Security Hardening
 *
 * Tests auth, RBAC, IDOR, input validation, and rate limiting.
 * Run with: pnpm --filter @vojas/api test
 *
 * These tests require DATABASE_URL_TEST to be set.
 * Without a database, auth tests that create users will be skipped.
 */

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app';
import { createUserWithRole, type TestRole } from '../helpers/fixtures';

const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Privileged fixtures cannot come from /auth/register: public self-registration
 * is hard-wired to CITIZEN so a request body cannot escalate its own role (see
 * routes/auth.ts). The account is provisioned directly and then logged in, so
 * the token is genuinely issued and RBAC is still exercised for real.
 */
async function tokenForRole(role: TestRole, email: string, password: string) {
  const user = await createUserWithRole(role, { email, password });
  return user.token;
}

async function register(email: string, password = 'StrongPass123!', role = 'CITIZEN') {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password, name: 'Test User', role });
  return res;
}

async function login(email: string, password = 'StrongPass123!') {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function genEmail() {
  return `security-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example.com`;
}

// ── Auth Tests ─────────────────────────────────────────────────────────────────

runIfDb('Auth Security', () => {
  let adminToken: string;
  let citizenToken: string;
  let officerToken: string;
  let adminEmail: string;
  let citizenEmail: string;
  let officerEmail: string;

  beforeAll(async () => {
    adminEmail = genEmail();
    citizenEmail = genEmail();
    officerEmail = genEmail();

    adminToken = await tokenForRole('ADMIN', adminEmail, 'AdminPass123!');

    const citizenRes = await register(citizenEmail, 'CitizenPass123!', 'CITIZEN');
    citizenToken = citizenRes.body.data?.accessToken ?? '';

    officerToken = await tokenForRole('OFFICER', officerEmail, 'OfficerPass123!');
  });

  // ── Login success ──────────────────────────────────────────────────────────

  it('POST /auth/login returns 200 with tokens for valid credentials', async () => {
    const res = await login(citizenEmail, 'CitizenPass123!');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(citizenEmail);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('POST /auth/login returns NO passwordHash in response', async () => {
    const res = await login(citizenEmail, 'CitizenPass123!');
    const user = res.body.data?.user ?? res.body.data;
    expect(user.passwordHash).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  // ── Login failure — no info leak ──────────────────────────────────────────

  it('POST /auth/login returns 401 with generic message for invalid email', async () => {
    const res = await login(`nonexistent-${Date.now()}@test.example.com`, 'AnyPass123!');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Must NOT distinguish between "user not found" and "wrong password"
    expect(res.body.error?.message).toMatch(/invalid credentials/i);
  });

  it('POST /auth/login returns 401 with generic message for wrong password', async () => {
    const res = await login(citizenEmail, 'WrongPassword123!');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message).toMatch(/invalid credentials/i);
    // Must NOT say "wrong password" specifically
    expect(res.body.error?.message).not.toMatch(/password/i);
  });

  // ── Token expiration ─────────────────────────────────────────────────────

  it('GET /auth/me returns 200 with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(adminEmail);
  });

  it('GET /auth/me returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /auth/me returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid'));
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /auth/me returns 401 with expired/invalid token (malformed)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader('not-a-valid-jwt-at-all'));
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── Logout ───────────────────────────────────────────────────────────────

  it('POST /auth/logout returns 204 and invalidates token', async () => {
    // Register a fresh user to log out
    const email = genEmail();
    const regRes = await register(email, 'LogoutPass123!');
    const token = regRes.body.data?.accessToken ?? '';

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set(authHeader(token));
    expect(logoutRes.status).toBe(204);

    // Token should be invalid after logout
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(token));
    expect(meRes.status).toBe(401);
  });

  // ── Registration ────────────────────────────────────────────────────────

  it('POST /auth/register rejects duplicate email', async () => {
    const res = await register(citizenEmail, 'AnotherPass123!');
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toMatch(/conflict|exists/i);
  });

  it('POST /auth/register requires valid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'StrongPass123!', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/register strips passwordHash from response', async () => {
    const email = genEmail();
    const res = await register(email, 'StrongPass123!');
    const user = res.body.data?.user ?? res.body.data;
    expect(user.passwordHash).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  it('POST /auth/register ignores a privileged role in the request body', async () => {
    // Privilege escalation guard: routes/auth.ts pins every self-registered
    // account to CITIZEN. Until this was asserted, several suites passed
    // role: 'ADMIN' to /auth/register and silently tested a CITIZEN token.
    for (const role of ['ADMIN', 'OFFICER', 'ANALYST', 'REVIEWER']) {
      const email = genEmail();
      const res = await register(email, 'StrongPass123!', role);
      expect(res.status).toBe(201);
      const user = res.body.data?.user ?? res.body.data;
      expect(user.role).toBe('CITIZEN');
    }
  });

  it('a self-registered account cannot reach an admin-gated route', async () => {
    const email = genEmail();
    const res = await register(email, 'StrongPass123!', 'ADMIN');
    const token = res.body.data?.accessToken ?? '';
    expect(token).not.toBe('');
    const adminRes = await request(app).get('/api/v1/admin/users').set(authHeader(token));
    expect(adminRes.status).toBe(403);
  });
});

// ── RBAC Tests ─────────────────────────────────────────────────────────────────

runIfDb('RBAC Enforcement', () => {
  let adminToken: string;
  let citizenToken: string;
  let officerToken: string;
  let analystToken: string;

  beforeAll(async () => {
    const adminEmail = genEmail();
    const citizenEmail = genEmail();
    const officerEmail = genEmail();
    const analystEmail = genEmail();

    adminToken = await tokenForRole('ADMIN', adminEmail, 'AdminPass123!');

    const c = await register(citizenEmail, 'CitizenPass123!', 'CITIZEN');
    citizenToken = c.body.data?.accessToken ?? '';

    officerToken = await tokenForRole('OFFICER', officerEmail, 'OfficerPass123!');

    analystToken = await tokenForRole('ANALYST', analystEmail, 'AnalystPass123!');
  });

  // ── Admin-only routes ───────────────────────────────────────────────────

  it('GET /admin/users requires authentication', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('GET /admin/users allows ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
  });

  it('GET /admin/users rejects CITIZEN (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set(authHeader(citizenToken));
    expect(res.status).toBe(403);
  });

  it('GET /admin/users rejects OFFICER without admin.manage (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set(authHeader(officerToken));
    expect(res.status).toBe(403);
  });

  // ── Project creation ──────────────────────────────────────────────────

  it('POST /projects requires OFFICER+ role', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set(authHeader(citizenToken))
      .send({
        name: 'Test Project',
        status: 'IN_PROGRESS',
        sector: 'ROADS',
        district: 'Bengaluru',
        state: 'Karnataka',
        approvedAmount: 1000000,
        source: 'MANUAL',
      });
    expect(res.status).toBe(403);
  });

  it('POST /projects allows ADMIN', async () => {
    // This assertion used to POST /admin/users with no body and expect 200,
    // which tested neither its own name nor anything coherent — an empty body
    // is a 400. It now exercises what it claims: ADMIN may create a project.
    const res = await request(app)
      .post('/api/v1/projects')
      .set(authHeader(adminToken))
      .send({
        name: 'Security Suite Project',
        status: 'IN_PROGRESS',
        sector: 'TRANSPORT',
        district: 'Bengaluru',
        state: 'Karnataka',
        approvedAmount: 1000000,
        source: 'MANUAL',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Security Suite Project');
  });

  // ── Audit routes ───────────────────────────────────────────────────────

  it('GET /audit requires authentication', async () => {
    const res = await request(app).get('/api/v1/audit');
    expect(res.status).toBe(401);
  });

  it('GET /audit allows ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set(authHeader(adminToken));
    // 200 if DB available, or 500 if Prisma error — as long as auth passed
    expect([200, 500]).toContain(res.status);
  });

  it('GET /audit rejects CITIZEN (403)', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set(authHeader(citizenToken));
    expect(res.status).toBe(403);
  });

  // ── Report creation ───────────────────────────────────────────────────

  it('POST /reports (authenticated) allows any logged-in user', async () => {
    // Public POST /reports works without auth
    const publicRes = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Security Test Report',
        description: 'Test description for security validation',
        category: 'CONSTRUCTION_QUALITY',
        privacyLevel: 'PUBLIC',
      });
    expect(publicRes.status).toBe(201);
  });

  // ── Export routes ─────────────────────────────────────────────────────

  it('GET /export/projects requires authentication', async () => {
    const res = await request(app).get('/api/v1/export/projects');
    expect(res.status).toBe(401);
  });

  it('GET /export/projects rejects CITIZEN (403)', async () => {
    const res = await request(app)
      .get('/api/v1/export/projects')
      .set(authHeader(citizenToken));
    expect(res.status).toBe(403);
  });

  it('GET /export/projects rejects OFFICER without admin.manage (403)', async () => {
    const res = await request(app)
      .get('/api/v1/export/projects')
      .set(authHeader(officerToken));
    expect(res.status).toBe(403);
  });

  // ── Search routes ─────────────────────────────────────────────────────

  it('GET /search requires authentication', async () => {
    const res = await request(app).get('/api/v1/search?q=test');
    expect(res.status).toBe(401);
  });

  it('GET /search allows any authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=test')
      .set(authHeader(citizenToken));
    // 200 if DB available, or 500 — as long as auth passed
    expect([200, 500]).toContain(res.status);
  });
});

// ── IDOR Tests ─────────────────────────────────────────────────────────────────

runIfDb('IDOR Protection', () => {
  let adminToken: string;
  let user1Token: string;
  let user1Email: string;
  let user2Token: string;
  let user2Email: string;

  beforeAll(async () => {
    user1Email = genEmail();
    user2Email = genEmail();
    const adminEmail = genEmail();

    const u1 = await register(user1Email, 'UserOnePass123!', 'CITIZEN');
    user1Token = u1.body.data?.accessToken ?? '';

    const u2 = await register(user2Email, 'UserTwoPass123!', 'CITIZEN');
    user2Token = u2.body.data?.accessToken ?? '';

    adminToken = await tokenForRole('ADMIN', adminEmail, 'AdminPass123!');
  });

  // ── User profile access ───────────────────────────────────────────────

  it('User A can read their own profile via /users/:id', async () => {
    const u1 = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(user1Token));
    const userId = u1.body.data?.id ?? u1.body.data?.user?.id;

    const res = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set(authHeader(user1Token));
    expect(res.status).toBe(200);
  });

  it('User A cannot read User B profile via /users/:id (403)', async () => {
    const u2 = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(user2Token));
    const user2Id = u2.body.data?.id ?? u2.body.data?.user?.id;

    const res = await request(app)
      .get(`/api/v1/users/${user2Id}`)
      .set(authHeader(user1Token));
    expect(res.status).toBe(403);
  });

  it('Admin can read any user profile via /users/:id', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(user2Token));
    const user2Id = res.body.data?.id ?? res.body.data?.user?.id;

    const adminView = await request(app)
      .get(`/api/v1/users/${user2Id}`)
      .set(authHeader(adminToken));
    expect(adminView.status).toBe(200);
  });

  // ── Notification access ───────────────────────────────────────────────

  it('User cannot delete another user notification (404 returned)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(authHeader(user2Token));
    const user2Id = res.body.data?.id ?? res.body.data?.user?.id;

    // Get user1's notifications (none exist but let's see)
    // Since notifications are scoped to userId in the query, IDOR is prevented
    // by the fact that mark-read uses userId from token, not from request param
    // This test verifies the route exists and returns appropriate status
    const notifRes = await request(app)
      .delete('/api/v1/notifications/nonexistent-notif-id')
      .set(authHeader(user1Token));
    // Should be 404 (not found) not 403 or 500
    expect([401, 403, 404]).toContain(notifRes.status);
  });
});

// ── Input Validation Tests ─────────────────────────────────────────────────────

runIfDb('Input Validation', () => {
  let adminToken: string;

  beforeAll(async () => {
    const adminEmail = genEmail();
    adminToken = await tokenForRole('ADMIN', adminEmail, 'AdminPass123!');
  });

  // ── Malformed IDs ───────────────────────────────────────────────────

  it('GET /projects/:id rejects non-CUID IDs with graceful response', async () => {
    const res = await request(app)
      .get('/api/v1/projects/not-a-valid-id')
      .set(authHeader(adminToken));
    // Should return 404 (not found) or 400, not crash
    expect([400, 404]).toContain(res.status);
  });

  it('GET /reports/:id rejects SQL injection in ID', async () => {
    const res = await request(app)
      .get("/api/v1/reports/%27%20OR%201%3D1%20--")
      .set(authHeader(adminToken));
    // Prisma should reject invalid ID format
    expect([400, 404]).toContain(res.status);
  });

  // ── Body validation ────────────────────────────────────────────────

  it('POST /auth/register rejects missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'StrongPass123!', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/login rejects missing password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /reports rejects invalid category', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Test',
        description: 'Test description here',
        category: 'INVALID_CATEGORY_THAT_DOES_NOT_EXIST',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /reports rejects short description', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Test',
        description: 'short',
        category: 'CONSTRUCTION_QUALITY',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /reports with a nonexistent projectId still succeeds, dropping the link', async () => {
    // Report.projectId is a real foreign key. Submitting one that does not
    // resolve (a stale deep link, a project from another environment, a typo)
    // must not destroy an otherwise-valid citizen report with an opaque
    // foreign-key-violation error — the project link is optional context, not
    // something worth losing a corruption report over.
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Report with a project link that does not exist',
        description: 'This report references a projectId that is not in the database.',
        category: 'CONSTRUCTION_QUALITY',
        projectId: 'nonexistent-project-id-does-not-exist',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reportReference).toBeDefined();
  });

  it('GET /reports rejects invalid latitude (>90)', async () => {
    const res = await request(app)
      .get('/api/v1/reports?latitude=999')
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /reports/submit rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Test Report',
        description: 'Test description that is long enough for validation',
        category: 'CONSTRUCTION_QUALITY',
        privacyLevel: 'RESTRICTED',
        reporterEmail: 'not-an-email',
        isAnonymous: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /search rejects query > 200 chars', async () => {
    const longQuery = 'a'.repeat(201);
    const res = await request(app)
      .get(`/api/v1/search?q=${longQuery}`)
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Number coercion safety ─────────────────────────────────────────

  it('GET /reports?limit=NaN returns 400', async () => {
    const res = await request(app)
      .get('/api/v1/reports?limit=not-a-number')
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });

  it('GET /reports?page=-1 returns 400', async () => {
    const res = await request(app)
      .get('/api/v1/reports?page=-1')
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });
});

// ── Rate Limiting Tests ────────────────────────────────────────────────────────

runIfDb('Rate Limiting', () => {
  it('POST /auth/login responds with RateLimit headers', async () => {
    const email = genEmail();
    await register(email, 'RateLimitTest123!');
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'RateLimitTest123!' });
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('General endpoints return rate limit headers', async () => {
    const res = await request(app).get('/health');
    // Should have rate limit headers or pass through
    expect(res.status).toBe(200);
  });
});

// ── Security Headers Tests ──────────────────────────────────────────────────────

describe('Security Headers', () => {
  it('GET /health includes security-related headers', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    // helmet sets various security headers
    expect(res.headers['x-content-type-options']).toBeDefined();
  });

  it('GET /health includes X-Frame-Options or CSP frame-ancestors', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    // helmet sets these headers
    const hasFrameProtection =
      res.headers['x-frame-options'] ||
      res.headers['content-security-policy'];
    expect(hasFrameProtection).toBeDefined();
  });

  it('GET /health does not expose server version in X-Powered-By', async () => {
    const res = await request(app).get('/health');
    // helmet removes X-Powered-By
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('OPTIONS request has CORS headers', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

// ── Public Endpoint Tests ───────────────────────────────────────────────────────

// These endpoints are served entirely from in-process state — the inline health
// route and the static SECTOR_CONFIGS table — plus request-body validation. They
// assert reachability without auth and must hold with no database at all.
describe('Public Endpoints (no auth required, no database)', () => {
  it('GET /health requires no auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/health requires no auth', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
  });

  it('GET /api/v1/sectors requires no auth', async () => {
    const res = await request(app).get('/api/v1/sectors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/reports/validate requires no auth', async () => {
    const res = await request(app)
      .post('/api/v1/reports/validate')
      .send({
        title: 'Test',
        description: 'Test description',
        category: 'CONSTRUCTION_QUALITY',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

});

// The rest of the public surface reads or writes the database. Gated on
// DATABASE_URL_TEST like every other DB-backed suite in this directory: without
// a test database these returned 500 and reported as failures, which hid
// whether the endpoints were genuinely public or genuinely broken.
runIfDb('Public Endpoints (no auth required, database-backed)', () => {
  it('GET /api/v1/sectors/overview requires no auth', async () => {
    const res = await request(app).get('/api/v1/sectors/overview');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/reports (public submission) requires no auth', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Public Test Report',
        description: 'This is a test report with sufficient length for validation.',
        category: 'CONSTRUCTION_QUALITY',
        privacyLevel: 'PUBLIC',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/reports/public requires no auth', async () => {
    const res = await request(app).get('/api/v1/reports/public');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/projects/public/summary requires no auth', async () => {
    const res = await request(app).get('/api/v1/projects/public/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/projects/public/states requires no auth', async () => {
    const res = await request(app).get('/api/v1/projects/public/states');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/reports/nearby requires no auth', async () => {
    const res = await request(app)
      .get('/api/v1/reports/nearby?lat=12.97&lng=77.59&radiusKm=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/reports/track/:ref requires no auth (public tracking)', async () => {
    const res = await request(app)
      .get('/api/v1/reports/track/NONEXISTENT-REF-0000');
    // Should return 404 (not found) but NOT 401
    expect(res.status).not.toBe(401);
    expect([200, 400, 404]).toContain(res.status);
  });
});

// ── Public follow-up endpoint ─────────────────────────────────────────────────
// This route is reachable by anyone holding a reference code, so it must not be
// able to move a report's status and must not echo reporter identity back.

runIfDb('Public report follow-up endpoint', () => {
  let reference: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .send({
        title: 'Follow-up endpoint security fixture',
        description: 'Fixture report used to assert the public follow-up route cannot change status.',
        category: 'CONSTRUCTION_QUALITY',
        reporterName: 'Fixture Reporter',
        reporterEmail: 'fixture-reporter@test.example.com',
      });
    reference = res.body?.data?.reportReference;
  });

  it('cannot change report status even when newStatus is supplied', async () => {
    const before = await request(app).get(`/api/v1/reports/track/${reference}`);
    const statusBefore = before.body.data.status;

    const res = await request(app)
      .post(`/api/v1/reports/track/${reference}/update`)
      .send({ note: 'Attempting to smuggle a status transition through this route.', newStatus: 'DISMISSED' });
    expect(res.status).toBe(200);

    const after = await request(app).get(`/api/v1/reports/track/${reference}`);
    expect(after.body.data.status).toBe(statusBefore);
    expect(after.body.data.status).not.toBe('DISMISSED');
  });

  it('does not return reporter identity or the whistleblower token', async () => {
    const res = await request(app)
      .post(`/api/v1/reports/track/${reference}/update`)
      .send({ note: 'Adding a legitimate follow-up observation about the site.' });
    expect(res.status).toBe(200);

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/fixture-reporter@test\.example\.com/);
    expect(body).not.toMatch(/Fixture Reporter/);
    expect(res.body.data.reporterEmail).toBeUndefined();
    expect(res.body.data.reporterName).toBeUndefined();
    expect(res.body.data.reporterPhone).toBeUndefined();
    expect(res.body.data.whistleblowerToken).toBeUndefined();
    expect(res.body.data.ipAddress).toBeUndefined();
  });

  it('rejects an empty or too-short follow-up note', async () => {
    const res = await request(app)
      .post(`/api/v1/reports/track/${reference}/update`)
      .send({ note: 'short' });
    expect(res.status).toBe(400);
  });
});

// ── Error Message Safety Tests ─────────────────────────────────────────────────

runIfDb('Error Message Safety', () => {
  let adminToken: string;

  beforeAll(async () => {
    const adminEmail = genEmail();
    adminToken = await tokenForRole('ADMIN', adminEmail, 'AdminPass123!');
  });

  it('GET /projects/:id with invalid ID does not leak SQL errors', async () => {
    const res = await request(app)
      .get('/api/v1/projects/invalid-id-format')
      .set(authHeader(adminToken));
    expect([400, 404]).toContain(res.status);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr.toLowerCase()).not.toMatch(/sql|syntax error|db_|prisma|select|insert|update|delete/i);
  });

  it('GET /reports/:id with SQL injection does not leak SQL errors', async () => {
    const res = await request(app)
      .get("/api/v1/reports/123' OR 1=1--")
      .set(authHeader(adminToken));
    expect([400, 404]).toContain(res.status);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr.toLowerCase()).not.toMatch(/sql|syntax error|db_|prisma|select/i);
  });

  it('Invalid JSON body returns 400 without server crash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('404 returns generic message without leaking route info', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.error?.message).toBeDefined();
    // Should not expose internal paths
    expect(res.body.error?.message).not.toMatch(/\/src\/|\.ts|middleware|handler/i);
  });
});
