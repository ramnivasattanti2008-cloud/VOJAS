/**
 * CORS origin handling — regression test.
 *
 * A browser on a host outside ALLOWED_ORIGINS used to get HTTP 500
 * INTERNAL_ERROR (the cors callback threw a bare Error), which read as a server
 * crash on the live site. The request must still be blocked, but as a 403.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

describe('CORS origin handling', () => {
  it('rejects an unknown origin with 403, not 500', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(403);
    expect(res.body.error.code).not.toBe('INTERNAL_ERROR');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows requests with no Origin header (curl, server-to-server)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
  });

  it('allows a localhost origin outside production', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
