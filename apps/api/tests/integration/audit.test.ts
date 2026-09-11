import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createAdmin, createCitizen } from '../helpers.js';

const BASE = '/api/v1';

// Skip all tests if database is not available
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

runIfDb('Audit Logging', () => {
  it('project creation creates an audit log entry', async () => {
    const { token, id: userId } = await createAdmin();

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

    // Admin token to read the audit log
    const { token: adminToken } = await createAdmin();

    // Check audit log for AUTH_LOGIN
    const auditRes = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'AUTH_LOGIN' });

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.data.some((e: any) => e.action === 'AUTH_LOGIN')).toBe(true);
  });

  it('GET /audit requires ADMIN or AUDIT_READ permission (403 for CITIZEN)', async () => {
    // NOTE: this was originally written against an OFFICER token, expecting
    // 403. That's not how the permission matrix is designed though —
    // ROLE_PERMISSIONS (packages/shared/src/permissions.ts) deliberately
    // grants OFFICER (and REVIEWER, ANALYST) the AUDIT_READ permission
    // alongside ADMIN, so officers investigating a case can see the audit
    // trail. A role that genuinely lacks AUDIT_READ (CITIZEN) is the correct
    // one to assert 403 against.
    const { token } = await createCitizen();

    const res = await request(app)
      .get(`${BASE}/audit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
