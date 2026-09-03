import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

const BASE = '/api/v1';

// Skip all tests if database is not available
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

runIfDb('Audit Logging', () => {
  it('project creation creates an audit log entry', async () => {
    const adminEmail = `audit-admin-${Date.now()}@example.com`;
    const adminRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email: adminEmail, password: 'AdminPass123!', name: 'Audit Admin', role: 'ADMIN' });

    const token = adminRes.body.data.accessToken;
    const userId = adminRes.body.data.user.id;

    await request(app)
      .post(`${BASE}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Audit Test Project',
        sector: 'HEALTH',
        district: 'TestDistrict',
        state: 'TestState',
        approvedAmount: 200000,
        source: 'MANUAL',
      });

    // Check audit log
    const auditRes = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${token}`)
      .query({ actorId: userId, entityType: 'Project' });

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    const events = auditRes.body.data.data;
    expect(events.some((e: any) => e.action === 'PROJECT_CREATED')).toBe(true);
  });

  it('login creates an audit log entry', async () => {
    const email = `audit-login-${Date.now()}@example.com`;
    const registerRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email, password: 'TestPass123!', name: 'Audit Login Test' });

    await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email, password: 'TestPass123!' });

    // Get admin token to read audit log
    const adminEmail = `audit-admin-login-${Date.now()}@example.com`;
    const adminRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        email: adminEmail,
        password: 'AdminPass123!',
        name: 'Audit Admin',
        role: 'ADMIN',
      });

    const adminToken = adminRes.body.data.accessToken;

    // Check audit log for AUTH_LOGIN
    const auditRes = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'AUTH_LOGIN' });

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.data.some((e: any) => e.action === 'AUTH_LOGIN')).toBe(true);
  });

  it('GET /audit requires ADMIN or AUDIT_READ permission (403 for OFFICER)', async () => {
    const officerRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        email: `audit-officer-${Date.now()}@example.com`,
        password: 'OfficerPass123!',
        name: 'Audit Officer',
        role: 'OFFICER',
      });

    const token = officerRes.body.data.accessToken;

    const res = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
