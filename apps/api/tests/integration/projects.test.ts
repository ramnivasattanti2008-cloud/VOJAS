import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createUserWithRole } from '../helpers/fixtures';

const BASE = '/api/v1';

// Skip all tests if database is not available
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

runIfDb('Projects API', () => {
  let officerToken: string;
  let adminToken: string;
  let projectId: string;

  beforeAll(async () => {
    // Privileged fixtures are provisioned directly — /auth/register pins every
    // self-registered account to CITIZEN.
    officerToken = (await createUserWithRole('OFFICER', { name: 'Project Officer' })).token;
    adminToken = (await createUserWithRole('ADMIN', { name: 'Project Admin' })).token;
  });

  it('POST /projects creates a project (OFFICER+)', async () => {
    const res = await request(app)
      .post(`${BASE}/projects`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        name: 'Road Construction Project',
        description: 'Building roads in rural area',
        sector: 'TRANSPORT',
        district: 'Mysore',
        state: 'Karnataka',
        approvedAmount: 5000000,
        spentAmount: 0,
        source: 'MANUAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    projectId = res.body.data.id;
  });

  it('GET /projects returns paginated list', async () => {
    // GET /projects is authenticate-gated (the unauthenticated listing lives at
    // /projects/public). This request carried no token at all, so it asserted
    // 200 against a route that can only answer 401.
    const res = await request(app)
      .get(`${BASE}/projects`)
      .set('Authorization', `Bearer ${officerToken}`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toBeInstanceOf(Array);
    expect(res.body.data.total).toBeDefined();
    expect(res.body.data.page).toBe(1);
  });

  it('GET /projects/:id returns project', async () => {
    if (!projectId) return;

    const res = await request(app)
      .get(`${BASE}/projects/${projectId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(projectId);
  });

  it('PATCH /projects/:id updates project', async () => {
    if (!projectId) return;

    const res = await request(app)
      .patch(`${BASE}/projects/${projectId}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ spentAmount: 1000000, status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.spentAmount).toBe(1000000);
  });

  it('DELETE /projects/:id requires ADMIN (403 for OFFICER)', async () => {
    if (!projectId) return;

    const res = await request(app)
      .delete(`${BASE}/projects/${projectId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(403);
  });

  it('DELETE /projects/:id succeeds for ADMIN', async () => {
    // Create a project to delete
    const createRes = await request(app)
      .post(`${BASE}/projects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Project to Delete',
        sector: 'EDUCATION',
        district: 'Test',
        state: 'TestState',
        approvedAmount: 100000,
        source: 'MANUAL',
      });

    const delId = createRes.body.data.id;

    const res = await request(app)
      .delete(`${BASE}/projects/${delId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });
});
