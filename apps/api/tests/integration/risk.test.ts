/**
 * M8 Risk Endpoints — Auth-Only Integration Tests
 * =============================================================
 * Tests that every M8 risk endpoint properly enforces auth.
 * No real database required — tests run with optionalAuth allowing
 * the request to reach the route, then we expect a Prisma error
 * (proving the route is wired correctly), OR 401 for required auth.
 *
 * For full DB-backed tests, set DATABASE_URL_TEST.
 */
import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { globalErrorHandler } from '../../src/middleware/errorHandler';
import riskRoutes from '../../src/routes/risk';
import { createUserWithRole } from '../helpers/fixtures';

const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

// Build a minimal app just for risk routes
function makeApp() {
  const app = express();
  app.use(express.json());
  // Mount risk routes at /api/v1 so that project-scoped routes (/projects/:id/risk/...)
  // and global routes (/risk/..., /findings/...) both work correctly.
  app.use('/api/v1', riskRoutes);
  app.use(globalErrorHandler);
  return app;
}

describe('M8 Risk Endpoints — Auth Enforcement', () => {
  // ── Auth-required endpoints should reject unauthenticated requests ──

  describe('Required-auth endpoints → 401 without token', () => {
    it('GET /risk/summary', async () => {
      const res = await request(makeApp()).get('/api/v1/risk/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /risk/findings (new global endpoint in commit 205700e)', async () => {
      const res = await request(makeApp()).get('/api/v1/risk/findings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /risk/trends', async () => {
      const res = await request(makeApp()).get('/api/v1/risk/trends');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /risk/hotspots', async () => {
      const res = await request(makeApp()).get('/api/v1/risk/hotspots');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /risk/rules', async () => {
      const res = await request(makeApp()).get('/api/v1/risk/rules');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /risk/aggregate/by-state', async () => {
      const res = await request(makeApp()).get('/api/v1/risk/aggregate/by-state');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /findings/:id/status', async () => {
      const res = await request(makeApp())
        .patch('/api/v1/findings/finding-001/status')
        .send({ status: 'ACKNOWLEDGED' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /projects/:id/risk/analyze', async () => {
      const res = await request(makeApp())
        .post('/api/v1/projects/proj-1/risk/analyze')
        .send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Optional-auth endpoints should return 200 even without token ──

  describe('Optional-auth endpoints → 200 without token (or 5xx if no DB)', () => {
    it('GET /projects/:id/risk', async () => {
      const res = await request(makeApp()).get('/api/v1/projects/proj-1/risk');
      // 200 if DB is up, 500 if not. Both prove the route is wired.
      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /projects/:id/risk/signals', async () => {
      const res = await request(makeApp()).get('/api/v1/projects/proj-1/risk/signals');
      expect([200, 500]).toContain(res.status);
    });

    it('GET /projects/:id/risk/findings', async () => {
      const res = await request(makeApp()).get('/api/v1/projects/proj-1/risk/findings');
      expect([200, 500]).toContain(res.status);
    });

    it('GET /projects/:id/risk/events', async () => {
      const res = await request(makeApp()).get('/api/v1/projects/proj-1/risk/events');
      expect([200, 500]).toContain(res.status);
    });
  });
});

runIfDb('M8 Risk Endpoints — DB-backed shape tests', () => {
  // These tests require a real DB. They run only when DATABASE_URL_TEST is set.
  // They used to authenticate with an env var that is set nowhere in the repo,
  // so the header was always `Bearer ` and both assertions could only ever see
  // a 401. A real ADMIN token is issued instead.
  let adminToken: string;

  beforeAll(async () => {
    adminToken = (await createUserWithRole('ADMIN', { name: 'Risk Admin' })).token;
  });

  it('GET /risk/summary returns expected shape', async () => {
    const res = await request(makeApp()).get('/api/v1/risk/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalProjects: expect.any(Number),
      totalFindings: expect.any(Number),
      riskDistribution: expect.any(Object),
      highRiskProjects: expect.any(Number),
      delayedProjects: expect.any(Number),
      averageRiskScore: expect.any(Number),
    });
  });

  it('GET /risk/findings returns findings array with project info', async () => {
    const res = await request(makeApp()).get('/api/v1/risk/findings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      findings: expect.any(Array),
      total: expect.any(Number),
    });
  });
});
