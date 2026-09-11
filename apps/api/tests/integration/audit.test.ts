import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createUserWithRole } from '../helpers/fixtures';

const BASE = '/api/v1';

// Skip all tests if database is not available
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

runIfDb('Audit Logging', () => {
  it('project creation creates an audit log entry', async () => {
    // Provisioned directly: /auth/register pins new accounts to CITIZEN, so a
    // self-registered "admin" could not create a project at all.
    const { token, userId } = await createUserWithRole('ADMIN', { name: 'Audit Admin' });

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
    // createUserWithRole logs in through the real route, so this also produces
    // the AUTH_LOGIN event the assertion below looks for.
    const { token: adminToken } = await createUserWithRole('ADMIN', { name: 'Audit Admin' });

    // Check audit log for AUTH_LOGIN
    const auditRes = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'AUTH_LOGIN' });

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.data.some((e: any) => e.action === 'AUTH_LOGIN')).toBe(true);
  });

  it('GET /audit is allowed for OFFICER, which holds audit.read', async () => {
    // ROLE_PERMISSIONS grants OFFICER audit.read, and the route is gated on
    // that permission, so 200 is the correct answer. This assertion expected
    // 403 and only ever passed because the "officer" was a self-registered
    // account that /auth/register had silently pinned to CITIZEN.
    const { token } = await createUserWithRole('OFFICER', { name: 'Audit Officer' });

    const res = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('GET /audit is refused for CITIZEN, which does not hold audit.read', async () => {
    const { token } = await createUserWithRole('CITIZEN', { name: 'Audit Citizen' });

    const res = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
