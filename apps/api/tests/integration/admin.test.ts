/**
 * VOJAS M22 Admin Routes — Integration Tests
 * Tests all admin endpoints with proper RBAC enforcement.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

const BASE = '/api/v1';
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

async function getAdminToken(): Promise<string> {
  const email = `admin-test-${Date.now()}@example.com`;
  const res = await request(app)
    .post(`${BASE}/auth/register`)
    .send({ email, password: 'AdminPass123!', name: 'Admin', role: 'ADMIN' });
  return res.body.data.accessToken;
}

async function getOfficerToken(): Promise<string> {
  const email = `officer-test-${Date.now()}@example.com`;
  const res = await request(app)
    .post(`${BASE}/auth/register`)
    .send({ email, password: 'OfficerPass123!', name: 'Officer', role: 'OFFICER' });
  return res.body.data.accessToken;
}

async function getCitizenToken(): Promise<string> {
  const email = `citizen-test-${Date.now()}@example.com`;
  const res = await request(app)
    .post(`${BASE}/auth/register`)
    .send({ email, password: 'CitizenPass123!', name: 'Citizen', role: 'CITIZEN' });
  return res.body.data.accessToken;
}

runIfDb('Admin — RBAC Enforcement', () => {
  it('unauthenticated → GET /admin/stats returns 401', async () => {
    const res = await request(app).get(`${BASE}/admin/stats`);
    expect(res.status).toBe(401);
  });

  it('CITIZEN → GET /admin/stats returns 403', async () => {
    const token = await getCitizenToken();
    const res = await request(app)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('OFFICER → GET /admin/stats returns 403', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('ADMIN → GET /admin/stats returns 200 with correct shape', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projects).toBeDefined();
    expect(res.body.data.anomalies).toBeDefined();
    expect(res.body.data.users).toBeDefined();
  });
});

runIfDb('Admin — GET /admin/system-overview', () => {
  it('returns 200 with system, counts, activity', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/system-overview`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.system).toBeDefined();
    expect(res.body.data.counts).toBeDefined();
    expect(res.body.data.activity).toBeDefined();
  });
});

runIfDb('Admin — GET /admin/health', () => {
  it('returns 200 with overall, checks, history', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/health`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(res.body.data.overall);
    expect(Array.isArray(res.body.data.checks)).toBe(true);
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  it('health history returns empty array', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/health/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

runIfDb('Admin — GET /admin/audit', () => {
  it('returns 200 with array of events', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/audit?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

runIfDb('Admin — GET /admin/alerts', () => {
  it('returns 200 with openAnomalies, byCategory, byStatus', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/alerts?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.openAnomalies)).toBe(true);
    expect(res.body.data.totalOpen).toBeDefined();
  });
});

runIfDb('Admin — GET /admin/users', () => {
  it('returns 200 with users and pagination', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/users?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });
});

runIfDb('Admin — POST /admin/users', () => {
  it('ADMIN can create a new user', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post(`${BASE}/admin/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'New Test User',
        email: `newuser-${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'VIEWER',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Test User');
    expect(res.body.data.role).toBe('VIEWER');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('rejects invalid role', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post(`${BASE}/admin/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Role User',
        email: `badrole-${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'INVALID_ROLE',
      });
    expect(res.status).toBe(400);
  });
});

runIfDb('Admin — GET /admin/jobs', () => {
  it('returns 200 with paginated jobs', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/jobs?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });
});

runIfDb('Admin — GET /admin/activity', () => {
  it('returns 200 with summary', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/activity?days=7`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.period).toBeDefined();
  });
});

runIfDb('Admin — GET /admin/security/events', () => {
  it('returns 200 with events and pagination', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get(`${BASE}/admin/security/events?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.events)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
  });
});

runIfDb('Admin — User management (PUT /admin/users/:id/...)', () => {
  it('ADMIN can disable a user', async () => {
    const token = await getAdminToken();
    const createRes = await request(app)
      .post(`${BASE}/admin/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Disable Me',
        email: `disable-${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'VIEWER',
      });
    const userId = createRes.body.data.id;

    const res = await request(app)
      .put(`${BASE}/admin/users/${userId}/disable`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('ADMIN can enable a disabled user', async () => {
    const token = await getAdminToken();
    const createRes = await request(app)
      .post(`${BASE}/admin/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Enable Me',
        email: `enable-${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'VIEWER',
      });
    const userId = createRes.body.data.id;

    await request(app)
      .put(`${BASE}/admin/users/${userId}/disable`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .put(`${BASE}/admin/users/${userId}/enable`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it('ADMIN can update user role', async () => {
    const token = await getAdminToken();
    const createRes = await request(app)
      .post(`${BASE}/admin/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Role Change Me',
        email: `rolechange-${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'VIEWER',
      });
    const userId = createRes.body.data.id;

    const res = await request(app)
      .put(`${BASE}/admin/users/${userId}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'OFFICER' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('OFFICER');
  });
});
