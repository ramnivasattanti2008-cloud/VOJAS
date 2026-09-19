/**
 * Citizen Reports — "My Reports" scoping
 *
 * Regression coverage for a real bug: the citizen-facing "My Reports" page
 * called the platform-wide GET /reports and showed every report on the
 * platform, not the caller's own. GET /reports itself stays platform-wide
 * by design (any authenticated caller can browse any report — see the
 * redaction tests in security.test.ts; identity is what's redacted, not
 * the report). The fix is an explicit opt-in ?mine=true filter, backed by
 * Report.reporterId — set when a non-anonymous submission happens while
 * authenticated, and never set for anonymous submissions so anonymity
 * survives "my reports" too.
 */
import { prisma } from '@vojas/db';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { createUserWithRole, genEmail } from '../helpers/fixtures';

const BASE = '/api/v1';
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function reportPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Fixture report',
    description: 'A sufficiently long fixture description for validation.',
    category: 'OTHER',
    isAnonymous: false,
    ...overrides,
  };
}

runIfDb('Citizen reports — my-reports scoping', () => {
  it('a non-anonymous report submitted while authenticated is attributed to the submitter', async () => {
    const citizen = await createUserWithRole('CITIZEN', { email: genEmail('report-owner') });

    const submit = await request(app)
      .post(`${BASE}/reports`)
      .set(authHeader(citizen.token))
      .send(reportPayload({ title: 'My own report' }));
    expect(submit.status).toBe(201);

    const stored = await prisma.report.findUnique({ where: { id: submit.body.data.id } });
    expect(stored?.reporterId).toBe(citizen.userId);
  });

  it('GET /reports?mine=true returns only the caller\'s own reports, not other citizens\' or anonymous ones', async () => {
    const citizenA = await createUserWithRole('CITIZEN', { email: genEmail('scope-a') });
    const citizenB = await createUserWithRole('CITIZEN', { email: genEmail('scope-b') });

    const ownReport = await request(app)
      .post(`${BASE}/reports`)
      .set(authHeader(citizenA.token))
      .send(reportPayload({ title: 'Citizen A own report' }));
    expect(ownReport.status).toBe(201);

    const otherReport = await request(app)
      .post(`${BASE}/reports`)
      .set(authHeader(citizenB.token))
      .send(reportPayload({ title: 'Citizen B own report' }));
    expect(otherReport.status).toBe(201);

    const anonymousReport = await request(app)
      .post(`${BASE}/reports`)
      .send(reportPayload({ title: 'Fully anonymous public report', isAnonymous: true }));
    expect(anonymousReport.status).toBe(201);

    const list = await request(app)
      .get(`${BASE}/reports?mine=true`)
      .set(authHeader(citizenA.token));
    expect(list.status).toBe(200);

    const ids: string[] = list.body.data.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(ownReport.body.data.id);
    expect(ids).not.toContain(otherReport.body.data.id);
    expect(ids).not.toContain(anonymousReport.body.data.id);
  });

  it('without ?mine=true, GET /reports stays platform-wide (unaffected by this feature)', async () => {
    const citizenA = await createUserWithRole('CITIZEN', { email: genEmail('browse-a') });
    const citizenB = await createUserWithRole('CITIZEN', { email: genEmail('browse-b') });

    const otherReport = await request(app)
      .post(`${BASE}/reports`)
      .set(authHeader(citizenB.token))
      .send(reportPayload({ title: 'Visible to any citizen browsing the platform' }));
    expect(otherReport.status).toBe(201);

    const list = await request(app)
      .get(`${BASE}/reports?limit=200`)
      .set(authHeader(citizenA.token));
    expect(list.status).toBe(200);

    const ids: string[] = list.body.data.data.map((r: { id: string }) => r.id);
    expect(ids).toContain(otherReport.body.data.id);
  });

  it('an anonymous submission by an authenticated citizen is never attributed, even to their own account', async () => {
    const citizen = await createUserWithRole('CITIZEN', { email: genEmail('anon-self') });

    const submit = await request(app)
      .post(`${BASE}/reports`)
      .set(authHeader(citizen.token))
      .send(reportPayload({ title: 'Anonymous even from myself', isAnonymous: true }));
    expect(submit.status).toBe(201);

    const stored = await prisma.report.findUnique({ where: { id: submit.body.data.id } });
    expect(stored?.reporterId).toBeNull();

    const list = await request(app)
      .get(`${BASE}/reports?mine=true`)
      .set(authHeader(citizen.token));
    const ids: string[] = list.body.data.data.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(submit.body.data.id);
  });

  it('a privileged role (OFFICER) can still read a citizen-submitted report\'s detail regardless of ownership', async () => {
    const citizen = await createUserWithRole('CITIZEN', { email: genEmail('officer-visibility') });
    const officer = await createUserWithRole('OFFICER', { email: genEmail('scope-officer') });

    const created = await request(app)
      .post(`${BASE}/reports`)
      .set(authHeader(citizen.token))
      .send(reportPayload({ title: 'Visible to staff regardless of ownership' }));
    expect(created.status).toBe(201);

    const asOfficer = await request(app)
      .get(`${BASE}/reports/${created.body.data.id}`)
      .set(authHeader(officer.token));
    expect(asOfficer.status).toBe(200);
    expect(asOfficer.body.data.id).toBe(created.body.data.id);
  });
});
