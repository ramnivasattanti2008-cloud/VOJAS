/**
 * VOJAS M22 Officer Routes — Integration Tests
 * Tests officer command center endpoints with RBAC enforcement.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { createUserWithRole } from '../helpers/fixtures';

const BASE = '/api/v1';
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

// OFFICER cannot come from /auth/register, which pins new accounts to CITIZEN.
async function getOfficerToken(): Promise<string> {
  return (await createUserWithRole('OFFICER')).token;
}

runIfDb('Officer — RBAC Enforcement', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).get(`${BASE}/officer/dashboard/stats`);
    expect(res.status).toBe(401);
  });

  it('OFFICER → GET /officer/dashboard/stats returns 200', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/officer/dashboard/stats`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.totalCases).toBe('number');
  });
});

runIfDb('Officer — Cases', () => {
  it('GET /officer/cases returns paginated list', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/officer/cases?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });
});

runIfDb('Officer — Evidence', () => {
  it('GET /officer/evidence returns paginated list', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/officer/evidence?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });
});

runIfDb('Officer — Map Layers', () => {
  it('GET /officer/map/layers returns all layer data', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/officer/map/layers`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(Array.isArray(res.body.data.cases)).toBe(true);
  });
});

runIfDb('Officer — Field Inspections', () => {
  it('GET /officer/field-inspections returns paginated list', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/officer/field-inspections?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });
});

runIfDb('Officer — Contractor Responses', () => {
  it('GET /officer/contractor-responses returns paginated list', async () => {
    const token = await getOfficerToken();
    const res = await request(app)
      .get(`${BASE}/officer/contractor-responses?limit=5`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });
});
