/**
 * VOJAS M23 — Comprehensive Smoke Test
 * Tests the legacy backend running on localhost:5000
 * Verifies: auth, RBAC, admin routes, cases, projects, anomalies, risk
 */

import http from 'node:http';

const BASE = process.env.API_BASE ?? 'http://localhost:5000';
const API = `${BASE}/api/v1`;

function get(path: string, token?: string): Promise<{ status: number; body: unknown }> {
  return request('GET', path, undefined, token);
}

function post(path: string, body?: unknown, token?: string): Promise<{ status: number; body: unknown }> {
  return request('POST', path, body, token);
}

function request(method: string, path: string, body?: unknown, token?: string) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const url = new URL(`${API}${path}`);
    const opts: http.RequestOptions = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers!['Authorization'] = `Bearer ${token}`;
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode ?? 0, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function check(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${pass ? '✅' : '❌'} ${label}`);
  if (!pass) console.log(`     expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
  return pass;
}

function checkStatus(label: string, status: number, expected: number) {
  const pass = status === expected;
  console.log(`  ${pass ? '✅' : '❌'} ${label} (${status})`);
  if (!pass) console.log(`     expected ${expected}, got ${status}`);
  return pass;
}

function checkType(label: string, val: unknown, type: string) {
  const t = typeof val;
  const pass = t === type || (type === 'number' && typeof val === 'number');
  console.log(`  ${pass ? '✅' : '❌'} ${label} [${t}]`);
  if (!pass) console.log(`     expected type '${type}', got '${t}'`);
  return pass;
}

function checkDefined(label: string, val: unknown) {
  const pass = val !== undefined && val !== null;
  console.log(`  ${pass ? '✅' : '❌'} ${label}`);
  if (!pass) console.log(`     expected defined value, got ${val}`);
  return pass;
}

async function login(email: string, password: string): Promise<string> {
  const r = (await post('/auth/login', { email, password })) as { body: { success: boolean; data?: { token?: string } } };
  if (!r.body.success || (!r.body.data?.token && !r.body.data?.accessToken)) throw new Error(`Login failed: ${JSON.stringify(r.body)}`);
  return r.body.data.token ?? r.body.data.accessToken;
}

async function main() {
  console.log('\n🔍 VOJAS M23 — Smoke Test');
  console.log(`   Base: ${API}\n`);

  let pass = 0, fail = 0;
  const ok = () => { pass++; return true; };
  const no = () => { fail++; return false; };

  // ── 1. Health ──────────────────────────────────────────────
  console.log('\n📋 Health check');
  try {
    const h = (await get('/health')) as { status: number; body: { success: boolean } };
    ok() && checkStatus('GET /health → 200', h.status, 200) || no();
    ok() && check('success', h.body.success, true) || no();
  } catch (e) {
    console.log(`  ❌ Backend unreachable: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  // ── 2. Auth — seeded users ─────────────────────────────────
  console.log('\n📋 Authentication (seeded users)');
  let adminToken = '';
  let officerToken = '';
  try {
    adminToken = await login('admin@vojas.gov', 'VojasDemo2026');
    console.log('  ✅ admin@vojas.gov / VojasDemo2026 → logged in');
    officerToken = await login('officer@vojas.gov', 'VojasDemo2026');
    console.log('  ✅ officer@vojas.gov / VojasDemo2026 → logged in');
  } catch (e) {
    console.log(`  ❌ Seeded user login failed: ${e instanceof Error ? e.message : String(e)}`);
    const ts = Date.now();
    try {
      await post('/auth/register', { email: `m23-admin-${ts}@test.com`, password: 'TestPass123!', name: 'M23 Admin', role: 'ADMIN' });
      adminToken = await login(`m23-admin-${ts}@test.com`, 'TestPass123!');
      await post('/auth/register', { email: `m23-officer-${ts}@test.com`, password: 'TestPass123!', name: 'M23 Officer', role: 'OFFICER' });
      officerToken = await login(`m23-officer-${ts}@test.com`, 'TestPass123!');
      console.log('  ✅ Register-based admin+officer → logged in');
    } catch (e2) {
      console.log(`  ❌ Register fallback failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
      process.exit(1);
    }
  }

  // ── 3. Auth me ──────────────────────────────────────────────
  console.log('\n📋 GET /auth/me');
  {
    const r = (await get('/auth/me', adminToken)) as { status: number; body: { success: boolean; data?: { user?: { role?: string } } } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
    ok() && checkType('role string', r.body.data?.user?.role, 'string') || no();
  }

  // ── 4. RBAC — unauthenticated → 401 ─────────────────────────
  console.log('\n📋 RBAC: Unauthenticated → 401');
  ok() && checkStatus('GET /admin/stats (no auth) → 401', (await get('/admin/stats')).status, 401) || no();
  ok() && checkStatus('GET /admin/users (no auth) → 401', (await get('/admin/users')).status, 401) || no();

  // ── 5. RBAC — non-admin → 403 ───────────────────────────────
  console.log('\n📋 RBAC: Non-admin → 403');
  ok() && checkStatus('OFFICER → GET /admin/stats → 403', (await get('/admin/stats', officerToken)).status, 403) || no();
  ok() && checkStatus('OFFICER → GET /admin/users → 403', (await get('/admin/users', officerToken)).status, 403) || no();

  // ── 6. Admin: GET /admin/stats ─────────────────────────────
  console.log('\n📋 GET /admin/stats');
  {
    const r = (await get('/admin/stats', adminToken)) as { status: number; body: { success: boolean; data?: Record<string, unknown> } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
    const d = r.body.data as { userCount?: unknown; projectCount?: unknown; reportCount?: unknown };
    ok() && checkDefined('userCount', d.userCount) || no();
    ok() && checkDefined('projectCount', d.projectCount) || no();
    ok() && checkDefined('reportCount', d.reportCount) || no();
  }

  // ── 7. Admin: GET /admin/users ─────────────────────────────
  console.log('\n📋 GET /admin/users');
  {
    const r = (await get('/admin/users?limit=3', adminToken)) as { status: number; body: { success: boolean; data?: unknown } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
    // Legacy returns { users: [...] } — no count field
    const d = r.body.data as { users?: unknown[] };
    ok() && checkType('users array', d.users, 'object') || no();
  }

  // ── 8. Admin: POST /admin/users (create user) ───────────────
  console.log('\n📋 POST /admin/users — create VIEWER');
  {
    const ts = Date.now();
    // Legacy returns { user: { name, role } } nested in data.user
    const r = (await post('/admin/users', { name: 'M23 Test Viewer', email: `viewer-${ts}@test.com`, password: 'TestPass123!', role: 'VIEWER' }, adminToken)) as { status: number; body: { success: boolean; data?: { user?: { name?: string; role?: string } } } };
    ok() && checkStatus('201', r.status, 201) || no();
    ok() && check('success', r.body.success, true) || no();
    ok() && checkType('user.name string', r.body.data?.user?.name, 'string') || no();
    ok() && check('user.role VIEWER', r.body.data?.user?.role, 'VIEWER') || no();
  }

  // ── 9. Admin: audit logs ────────────────────────────────────
  console.log('\n📋 GET /admin/audit-logs');
  {
    const r = (await get('/admin/audit-logs?limit=5', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 10. Projects ───────────────────────────────────────────
  console.log('\n📋 GET /projects');
  {
    // Legacy returns { items: [...] } not { projects: [...] }
    const r = (await get('/projects?page=1&limit=3', adminToken)) as { status: number; body: { success: boolean; data?: unknown } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
    const d = r.body.data as { items?: unknown[]; total?: number };
    ok() && checkType('items array', d.items, 'object') || no();
    ok() && checkType('total number', d.total, 'number') || no();
  }

  // ── 11. Cases ───────────────────────────────────────────────
  console.log('\n📋 GET /cases');
  {
    const r = (await get('/cases?page=1&limit=3', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 12. Anomalies ───────────────────────────────────────────
  console.log('\n📋 GET /anomalies');
  {
    const r = (await get('/anomalies?page=1&limit=3', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 13. Reports ─────────────────────────────────────────────
  console.log('\n📋 GET /reports');
  {
    const r = (await get('/reports?page=1&limit=3', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 14. Risk list ─────────────────────────────────────────
  // Legacy has /risk (not /risk/findings)
  console.log('\n📋 GET /risk');
  {
    const r = (await get('/risk?page=1&limit=3', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 15. Officer access — cases ────────────────────────────
  console.log('\n📋 Officer access — cases (200)');
  {
    const r = (await get('/cases?page=1&limit=2', officerToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 16. Officer RBAC — cannot create admin user ─────────────
  console.log('\n📋 Officer cannot POST /admin/users (403)');
  {
    const ts = Date.now();
    const r = (await post('/admin/users', { name: 'Hack', email: `hack-${ts}@test.com`, password: 'x', role: 'ADMIN' }, officerToken)) as { status: number };
    ok() && checkStatus('OFFICER → POST /admin/users → 403', r.status, 403) || no();
  }

  // ── 17. Analytics summary ────────────────────────────────
  console.log('\n📋 GET /analytics/summary');
  {
    const r = (await get('/analytics/summary', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 18. Analytics dashboard ────────────────────────────────
  console.log('\n📋 GET /analytics/dashboard');
  {
    const r = (await get('/analytics/dashboard', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 19. Notifications ──────────────────────────────────────
  console.log('\n📋 GET /notifications');
  {
    const r = (await get('/notifications?page=1&limit=3', adminToken)) as { status: number; body: { success: boolean } };
    ok() && checkStatus('200', r.status, 200) || no();
    ok() && check('success', r.body.success, true) || no();
  }

  // ── 20. Officers cannot escalate ────────────────────────────
  console.log('\n📋 Officer cannot escalate law cases (403)');
  {
    const cases = (await get('/cases?page=1&limit=1', officerToken)) as { body: { data?: { cases?: { id?: string }[] } } };
    const caseId = cases.body?.data?.cases?.[0]?.id;
    if (caseId) {
      const r = (await post(`/cases/${caseId}/escalate`, {}, officerToken)) as { status: number };
      ok() && checkStatus('OFFICER → POST /cases/:id/escalate → 403', r.status, 403) || no();
    } else {
      console.log('  ⏭️  No cases to escalate — skipped');
    }
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(55));
  console.log(`   Passed: ${pass}  |  Failed: ${fail}`);
  if (fail === 0) {
    console.log('✅ All M23 smoke tests PASSED');
  } else {
    console.log(`❌ ${fail} test(s) FAILED`);
  }
  console.log('─'.repeat(55) + '\n');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error('❌ Fatal:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
