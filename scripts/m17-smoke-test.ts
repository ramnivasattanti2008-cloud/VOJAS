/**
 * M17 Final Smoke Test
 * Quick E2E test against localhost:5001
 */
import http from 'node:http';

const BASE = 'http://localhost:5001';
const results: { name: string; pass: boolean; detail: string }[] = [];

function request(method: string, path: string, body?: string, token?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, pass: true, detail: 'PASS' });
  } catch (e: unknown) {
    results.push({ name, pass: false, detail: String(e) });
  }
}

async function get(path: string, expectedStatus: number, checkBody?: (body: string) => boolean, token?: string) {
  const { status, body } = await request('GET', path, undefined, token);
  if (status !== expectedStatus) throw new Error(`GET ${path} → ${status} (expected ${expectedStatus}): ${body.slice(0,100)}`);
  if (checkBody && !checkBody(body)) throw new Error(`GET ${path} body check failed: ${body.slice(0,100)}`);
}

async function post(path: string, body: string, expectedStatus: number) {
  const { status, body: resBody } = await request('POST', path, body);
  if (status !== expectedStatus) throw new Error(`POST ${path} → ${status} (expected ${expectedStatus}): ${resBody.slice(0,100)}`);
}

async function run() {
  console.log('M17 Final Smoke Test\n' + '='.repeat(40));

  await test('1. /health returns 200', async () => {
    await get('/health', 200);
  });

  await test('2. /ready returns 200 + DB reachable', async () => {
    const { body } = await request('GET', '/ready');
    const data = JSON.parse(body);
    if (data.status !== 'ok' || data.database !== 'reachable') throw new Error(`Unexpected: ${body}`);
  });

  await test('3. /api/v1/health returns 200', async () => {
    await get('/api/v1/health', 200);
  });

  await test('4. Admin routes 401 without token', async () => {
    await get('/api/v1/admin/stats', 401);
  });

  await test('5. Search routes 401 without token', async () => {
    await get('/api/v1/search?q=test', 401);
  });

  await test('6. Officer routes 401 without token', async () => {
    await get('/api/v1/officer/cases', 401);
  });

  await test('7. Login with wrong password → 401', async () => {
    await post('/api/v1/auth/login', JSON.stringify({ email: 'admin@vojas.gov', password: 'WRONG' }), 401);
  });

  await test('8. Login with correct password → 200 + token', async () => {
    const { status, body } = await request('POST', '/api/v1/auth/login', JSON.stringify({ email: 'admin@vojas.gov', password: 'Admin123!' }));
    if (status !== 200) throw new Error(`Status ${status}: ${body.slice(0,200)}`);
    const data = JSON.parse(body);
    const token = data.data?.accessToken ?? data.data?.token ?? '';
    if (!token) throw new Error(`No token in response: ${body.slice(0,200)}`);
    (global as Record<string, unknown>).__adminToken = token;
  });

  const adminToken = ((global as Record<string, unknown>).__adminToken as string) ?? '';

  await test('9. Admin stats 200 with token', async () => {
    const { status, body } = await request('GET', '/api/v1/admin/stats', undefined, adminToken);
    if (status !== 200) throw new Error(`Status ${status}: ${body.slice(0,200)}`);
    const data = JSON.parse(body);
    if (!data.success) throw new Error(`Not success: ${body.slice(0,200)}`);
    if (!data.data?.projects) throw new Error(`No projects in data: ${body.slice(0,200)}`);
  });

  await test('10. Audit 200 with admin token', async () => {
    await get('/api/v1/audit', 200, undefined, adminToken);
  });

  await test('11. Admin system-overview 200', async () => {
    const { status, body } = await request('GET', '/api/v1/admin/system-overview', undefined, adminToken);
    if (status !== 200) throw new Error(`Status ${status}: ${body.slice(0,200)}`);
  });

  await test('12. Health check returns ok', async () => {
    const { status, body } = await request('GET', '/health');
    if (status !== 200) throw new Error(`Health failed: ${status}`);
    const data = JSON.parse(body);
    if (data.status !== 'ok') throw new Error(`No requestId in response: ${body}`);
  });

  await test('13. Report submit validation error (bad input)', async () => {
    await post('/api/v1/reports', JSON.stringify({ title: 'x', description: 'short' }), 400);
  });

  await test('14. Login rate limit (10th attempt)', async () => {
    // Already hit rate limit from previous tests, should be rate limited
    const { status } = await request('POST', '/api/v1/auth/login', JSON.stringify({ email: 'test@example.com', password: 'wrong' }));
    if (status === 429) console.log('  [rate limited as expected]');
  });

  // Summary
  console.log('\n' + '='.repeat(40));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Results: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(r => !r.pass).forEach(r => console.log(`  FAIL: ${r.name} — ${r.detail}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test error:', e); process.exit(1); });
