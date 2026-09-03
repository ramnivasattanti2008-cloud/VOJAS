import { describe, it, expect, test } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

// Skip all tests if database is not available
const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

const BASE = '/api/v1/auth';

runIfDb('POST /api/v1/auth/register', () => {
  it('creates a new user with valid data', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Test User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects registration with weak password', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'weak',
        name: 'Test User',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'TestPass123!', name: 'User 1' });

    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'TestPass123!', name: 'User 2' });

    expect(res.status).toBe(409);
  });
});

runIfDb('POST /api/v1/auth/login', () => {
  it('returns 200 and tokens with valid credentials', async () => {
    const email = `login-${Date.now()}@example.com`;
    await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'TestPass123!', name: 'Login Test' });

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: 'TestPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
  });

  it('returns 401 with wrong password', async () => {
    const email = `wrongpass-${Date.now()}@example.com`;
    await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'CorrectPass123!', name: 'Wrong Pass' });

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

runIfDb('POST /api/v1/auth/refresh', () => {
  it('issues a new access token with valid refresh token', async () => {
    const email = `refresh-${Date.now()}@example.com`;
    const regRes = await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'TestPass123!', name: 'Refresh Test' });

    const refreshToken = regRes.body.data.refreshToken;

    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('returns 401 with invalid refresh token', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: 'invalid-token' });

    expect(res.status).toBe(401);
  });
});

runIfDb('GET /api/v1/auth/me', () => {
  it('returns user profile with valid token', async () => {
    const email = `me-${Date.now()}@example.com`;
    const regRes = await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'TestPass123!', name: 'Me Test' });

    const accessToken = regRes.body.data.accessToken;

    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});
