/**
 * User<->MP Linkage — MP Command Center
 *
 * Regression coverage for the admin-controlled User<->MP link:
 *   - a linked MP sees their own real MP data
 *   - an unlinked MP gets an explicit not-linked state, never fabricated data
 *   - only an ADMIN can create/change the linkage — an MP cannot self-link
 *   - one MP can never see another MP's command-center data
 */
import { prisma } from '@vojas/db';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app';
import { createUserWithRole, genEmail } from '../helpers/fixtures';

const BASE = '/api/v1';
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function makeMp(suffix: string) {
  // name+constituency+term is a real @@unique constraint (the ingest
  // idempotency key) — a static name collides on any re-run against a
  // persistent test database, so make each fixture genuinely unique.
  const unique = `${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return prisma.mP.create({
    data: {
      name: `Test MP ${unique}`,
      house: 'LOK_SABHA',
      constituency: `Test Constituency ${unique}`,
      state: 'Test State',
      term: '18th',
    },
  });
}

async function makeProject(mpId: string, creatorId: string, approvedAmount: number) {
  return prisma.project.create({
    data: {
      name: `Fixture project for ${mpId}`,
      sector: 'EDUCATION',
      district: 'Test District',
      state: 'Test State',
      approvedAmount,
      createdById: creatorId,
      mpId,
    },
  });
}

runIfDb('User<->MP linkage', () => {
  let adminToken: string;
  let creatorId: string;

  beforeAll(async () => {
    const admin = await createUserWithRole('ADMIN', { email: genEmail('mp-link-admin') });
    adminToken = admin.token;
    creatorId = admin.userId;
  });

  it('an unlinked MP-role user gets an explicit not-linked state, never fabricated data', async () => {
    const mpUser = await createUserWithRole('MP', { email: genEmail('mp-unlinked') });

    const constituency = await request(app)
      .get(`${BASE}/mp/me/constituency`)
      .set(authHeader(mpUser.token));
    expect(constituency.status).toBe(200);
    expect(constituency.body.data.linked).toBe(false);
    expect(constituency.body.data.totalSanctioned).toBe(0);
    expect(constituency.body.data.mpId).toBeNull();

    const financials = await request(app)
      .get(`${BASE}/mp/me/financials`)
      .set(authHeader(mpUser.token));
    expect(financials.status).toBe(200);
    expect(financials.body.data.linked).toBe(false);
    expect(financials.body.data.totalSanctioned).toBe(0);
    expect(financials.body.data.bySector).toEqual([]);
  });

  it('an MP-role user cannot set their own mpId (silently ignored, not an error)', async () => {
    const mp = await makeMp('self-link-attempt');
    const mpUser = await createUserWithRole('MP', { email: genEmail('mp-self-link') });

    const res = await request(app)
      .patch(`${BASE}/users/${mpUser.userId}`)
      .set(authHeader(mpUser.token))
      .send({ mpId: mp.id });

    // The self-service path allows a user to patch their own profile at all
    // (name, etc.), so this must not be rejected outright — but mpId must
    // never be applied.
    expect(res.status).toBe(200);

    const stored = await prisma.user.findUnique({ where: { id: mpUser.userId }, select: { mpId: true } });
    expect(stored?.mpId).toBeNull();

    const constituency = await request(app)
      .get(`${BASE}/mp/me/constituency`)
      .set(authHeader(mpUser.token));
    expect(constituency.body.data.linked).toBe(false);
  });

  it('a non-admin cannot change another user\'s linkage (403)', async () => {
    const mp = await makeMp('officer-attempt');
    const mpUser = await createUserWithRole('MP', { email: genEmail('mp-target') });
    const officer = await createUserWithRole('OFFICER', { email: genEmail('mp-link-officer') });

    const res = await request(app)
      .patch(`${BASE}/users/${mpUser.userId}`)
      .set(authHeader(officer.token))
      .send({ mpId: mp.id });
    expect(res.status).toBe(403);

    const stored = await prisma.user.findUnique({ where: { id: mpUser.userId }, select: { mpId: true } });
    expect(stored?.mpId).toBeNull();
  });

  it('ADMIN cannot link a non-existent MP id', async () => {
    const mpUser = await createUserWithRole('MP', { email: genEmail('mp-bad-link') });

    const res = await request(app)
      .patch(`${BASE}/users/${mpUser.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: 'does-not-exist' });
    expect(res.status).toBe(400);
  });

  it('ADMIN cannot link mpId to a user whose role is not MP', async () => {
    const mp = await makeMp('wrong-role');
    const citizen = await createUserWithRole('CITIZEN', { email: genEmail('mp-wrong-role') });

    const res = await request(app)
      .patch(`${BASE}/users/${citizen.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: mp.id });
    expect(res.status).toBe(400);
  });

  it('ADMIN cannot link the same MP record to two different users', async () => {
    const mp = await makeMp('double-link');
    const mpUserA = await createUserWithRole('MP', { email: genEmail('mp-double-a') });
    const mpUserB = await createUserWithRole('MP', { email: genEmail('mp-double-b') });

    const first = await request(app)
      .patch(`${BASE}/users/${mpUserA.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: mp.id });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`${BASE}/users/${mpUserB.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: mp.id });
    expect(second.status).toBe(400);
  });

  it('a linked MP sees their own real data, and it is isolated from another MP', async () => {
    const mpA = await makeMp('isolation-a');
    const mpB = await makeMp('isolation-b');
    await makeProject(mpA.id, creatorId, 1_000_000);
    await makeProject(mpA.id, creatorId, 2_000_000);
    await makeProject(mpB.id, creatorId, 9_000_000);

    const userA = await createUserWithRole('MP', { email: genEmail('mp-isolation-a') });
    const userB = await createUserWithRole('MP', { email: genEmail('mp-isolation-b') });

    const linkA = await request(app)
      .patch(`${BASE}/users/${userA.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: mpA.id });
    expect(linkA.status).toBe(200);
    expect(linkA.body.data.mpId).toBe(mpA.id);

    const linkB = await request(app)
      .patch(`${BASE}/users/${userB.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: mpB.id });
    expect(linkB.status).toBe(200);

    const constituencyA = await request(app)
      .get(`${BASE}/mp/me/constituency`)
      .set(authHeader(userA.token));
    expect(constituencyA.body.data.linked).toBe(true);
    expect(constituencyA.body.data.mpId).toBe(mpA.id);
    expect(constituencyA.body.data.totalProjects).toBe(2);
    expect(constituencyA.body.data.totalSanctioned).toBe(3_000_000);

    const constituencyB = await request(app)
      .get(`${BASE}/mp/me/constituency`)
      .set(authHeader(userB.token));
    expect(constituencyB.body.data.linked).toBe(true);
    expect(constituencyB.body.data.mpId).toBe(mpB.id);
    expect(constituencyB.body.data.totalProjects).toBe(1);
    expect(constituencyB.body.data.totalSanctioned).toBe(9_000_000);

    // Isolation: A's numbers never leak into B's response or vice versa —
    // there is no client-supplied :id for either to manipulate.
    expect(constituencyA.body.data.mpId).not.toBe(constituencyB.body.data.mpId);
    expect(constituencyA.body.data.totalSanctioned).not.toBe(constituencyB.body.data.totalSanctioned);

    const financialsA = await request(app)
      .get(`${BASE}/mp/me/financials`)
      .set(authHeader(userA.token));
    expect(financialsA.body.data.linked).toBe(true);
    expect(financialsA.body.data.totalSanctioned).toBe(3_000_000);
    // No RELEASE-type FinancialObservation rows exist for these fixture
    // projects — must be null, not backfilled from sanctioned.
    expect(financialsA.body.data.totalReleased).toBeNull();
  });

  it('ADMIN can unlink an MP by setting mpId to null', async () => {
    const mp = await makeMp('unlink');
    const mpUser = await createUserWithRole('MP', { email: genEmail('mp-unlink') });

    await request(app)
      .patch(`${BASE}/users/${mpUser.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: mp.id });

    const unlink = await request(app)
      .patch(`${BASE}/users/${mpUser.userId}`)
      .set(authHeader(adminToken))
      .send({ mpId: null });
    expect(unlink.status).toBe(200);
    expect(unlink.body.data.mpId).toBeNull();

    const constituency = await request(app)
      .get(`${BASE}/mp/me/constituency`)
      .set(authHeader(mpUser.token));
    expect(constituency.body.data.linked).toBe(false);
  });
});
