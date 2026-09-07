/**
 * VOJAS M22 Search Route — Integration Tests
 * Tests unified search with role-based scoping.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

const BASE = '/api/v1';
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

async function getToken(role: string): Promise<string> {
  const email = `${role.toLowerCase()}-search-${Date.now()}@example.com`;
  const res = await request(app)
    .post(`${BASE}/auth/register`)
    .send({ email, password: 'TestPass123!', name: role, role });
  return res.body.data.accessToken;
}

runIfDb('Search — RBAC', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).get(`${BASE}/search?q=test`);
    expect(res.status).toBe(401);
  });

  it('authenticated user can search', async () => {
    const token = await getToken('OFFICER');
    const res = await request(app)
      .get(`${BASE}/search?q=test&type=projects&limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.query).toBe('test');
    expect(typeof res.body.data.results).toBe('object');
  });
});

runIfDb('Search — Response shape', () => {
  it('returns results object with entity arrays', async () => {
    const token = await getToken('OFFICER');
    const res = await request(app)
      .get(`${BASE}/search?q=test&type=all&limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toBeDefined();
  });

  it('type filter works for projects', async () => {
    const token = await getToken('OFFICER');
    const res = await request(app)
      .get(`${BASE}/search?q=school&type=projects&limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('projects');
  });

  it('type filter works for anomalies', async () => {
    const token = await getToken('OFFICER');
    const res = await request(app)
      .get(`${BASE}/search?q=delay&type=anomalies&limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('anomalies');
  });

  it('rejects empty query', async () => {
    const token = await getToken('OFFICER');
    const res = await request(app)
      .get(`${BASE}/search?q=&type=projects`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('pagination works', async () => {
    const token = await getToken('OFFICER');
    const res = await request(app)
      .get(`${BASE}/search?q=test&type=projects&page=2&limit=10`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.limit).toBe(10);
  });
});

runIfDb('Search — Role-based scoping', () => {
  it('CITIZEN can search', async () => {
    const token = await getToken('CITIZEN');
    const res = await request(app)
      .get(`${BASE}/search?q=test&type=projects`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('VIEWER can search', async () => {
    const token = await getToken('VIEWER');
    const res = await request(app)
      .get(`${BASE}/search?q=test&type=projects`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
