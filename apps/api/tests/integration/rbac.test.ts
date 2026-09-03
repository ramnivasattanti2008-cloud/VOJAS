import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

const BASE = '/api/v1';

// Skip all tests if database is not available
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

runIfDb('RBAC — User Management', () => {
  it('ADMIN can access GET /users', async () => {
    // Register admin
    const adminEmail = `admin-rbac-${Date.now()}@example.com`;
    const adminRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email: adminEmail, password: 'AdminPass123!', name: 'Admin', role: 'ADMIN' });

    const token = adminRes.body.data.accessToken;

    const res = await request(app)
      .get(`${BASE}/users`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('CITIZEN cannot access GET /users (403)', async () => {
    const citizenEmail = `citizen-rbac-${Date.now()}@example.com`;
    const citizenRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email: citizenEmail, password: 'CitizenPass123!', name: 'Citizen', role: 'CITIZEN' });

    const token = citizenRes.body.data.accessToken;

    const res = await request(app)
      .get(`${BASE}/users`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

runIfDb('RBAC — Project Management', () => {
  it('OFFICER can create a project', async () => {
    const officerEmail = `officer-rbac-${Date.now()}@example.com`;
    const officerRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email: officerEmail, password: 'OfficerPass123!', name: 'Officer', role: 'OFFICER' });

    const token = officerRes.body.data.accessToken;

    const res = await request(app)
      .post(`${BASE}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Project',
        sector: 'EDUCATION',
        district: 'Bangalore',
        state: 'Karnataka',
        approvedAmount: 1000000,
        source: 'MANUAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('CITIZEN cannot create a project (403)', async () => {
    const citizenEmail = `citizen-proj-${Date.now()}@example.com`;
    const citizenRes = await request(app)
      .post(`${BASE}/auth/register`)
      .send({ email: citizenEmail, password: 'CitizenPass123!', name: 'Citizen', role: 'CITIZEN' });

    const token = citizenRes.body.data.accessToken;

    const res = await request(app)
      .post(`${BASE}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Unauthorized Project',
        sector: 'EDUCATION',
        district: 'Bangalore',
        state: 'Karnataka',
        approvedAmount: 1000000,
        source: 'MANUAL',
      });

    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post(`${BASE}/projects`)
      .send({
        name: 'No Auth Project',
        sector: 'EDUCATION',
        district: 'Bangalore',
        state: 'Karnataka',
        approvedAmount: 1000000,
        source: 'MANUAL',
      });

    expect(res.status).toBe(401);
  });
});
