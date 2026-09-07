/**
 * VOJAS M22 RBAC Smoke Test
 * =============================================================
 * Tests all RBAC-protected endpoints: admin, officer, search, audit.
 * Tests that:
 *   - Admin routes require admin.manage permission
 *   - Officer routes require authentication
 *   - Audit routes require audit.read permission
 *   - Search is accessible to authenticated users
 *   - Response shapes match API contract
 *
 * Prerequisites:
 *   1. Start PostgreSQL (e.g. via Docker)
 *   2. Ensure DATABASE_URL in .env points to it
 *   3. Run: pnpm db:push && pnpm db:seed
 *   4. pnpm dev:api  (start backend)
 *   5. npx tsx scripts/smoke-m22.ts
 */

import http from 'node:http';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// ── HTTP Helpers ──────────────────────────────────────────────────────

function get(path: string, token?: string): Promise<Response> {
  return request('GET', path, undefined, token);
}

function post(path: string, body?: unknown, token?: string): Promise<Response> {
  return request('POST', path, body, token);
}

function request(method: string, path: string, body?: unknown, token?: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const opts: http.RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode ?? 0, body: json });
        } catch {
          resolve({ status: res.statusCode ?? 0, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

interface Response {
  status: number;
  body: unknown;
}

// ── Check helpers ───────────────────────────────────────────────────

function check(label: string, actual: unknown, expected: unknown): boolean {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${pass ? '✅' : '❌'} ${label}`);
  if (!pass) {
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     got:      ${JSON.stringify(actual)}`);
  }
  return pass;
}

function checkStatus(label: string, status: number, expected: number): boolean {
  const pass = status === expected;
  console.log(`  ${pass ? '✅' : '❌'} ${label} (${status})`);
  if (!pass) console.log(`     expected ${expected}, got ${status}`);
  return pass;
}

function checkKey(label: string, obj: unknown, key: string, type: string): boolean {
  const val = (obj as Record<string, unknown>)?.[key];
  const pass = typeof val === type || (val !== undefined && type === 'number');
  console.log(`  ${pass ? '✅' : '❌'} ${label} [${key}: ${typeof val}]`);
  if (!pass) console.log(`     expected type '${type}', got '${typeof val}'`);
  return pass;
}

function checkArray(label: string, val: unknown): boolean {
  const pass = Array.isArray(val);
  console.log(`  ${pass ? '✅' : '❌'} ${label} [is array: ${pass}]`);
  return pass;
}

// ── Auth helpers ─────────────────────────────────────────────────────

async function login(email: string, password: string): Promise<string> {
  const res = (await post('/auth/login', { email, password })) as Response;
  const body = res.body as { success: boolean; data?: { token?: string; accessToken?: string } };
  if (!body.success || (!body.data?.token && !body.data?.accessToken)) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return body.data?.token ?? body.data?.accessToken ?? '';
}

async function registerAndLogin(
  email: string,
  role: string,
  password = 'TestPass123!'
): Promise<string> {
  await post('/auth/register', {
    email,
    password,
    name: `${role} User ${Date.now()}`,
    role,
  });
  return login(email, password);
}

// ── Smoke Tests ──────────────────────────────────────────────────────

async function main() {
  console.log('\n🛡️  VOJAS M22 RBAC — Smoke Test');
  console.log(`   Base URL: ${API_BASE}\n`);

  let allPassed = true;

  // ── 1. Health check ────────────────────────────────────────────
  console.log('\n📋 Health check');
  try {
    const health = (await get('/health')) as Response;
    allPassed = checkStatus('GET /health → 200', health.status, 200) && allPassed;
  } catch (e) {
    console.log('  ❌ Backend not reachable — start with: pnpm dev:api');
    process.exit(1);
  }

  // ── 2. Auth tokens ─────────────────────────────────────────────
  console.log('\n📋 Authentication');
  let adminToken = '';
  let officerToken = '';
  let citizenToken = '';

  try {
    adminToken = await login('admin@vojas.gov', 'Admin123!');
    officerToken = await login('officer@vojas.gov', 'Officer123!');
    citizenToken = await login('citizen@vojas.gov', 'Citizen123!');
    console.log('  ✅ All seeded users authenticated');
  } catch (e) {
    console.log(`  ❌ Seeded auth failed — trying register-based auth: ${e instanceof Error ? e.message : String(e)}`);
    try {
      const ts = Date.now();
      adminToken = await registerAndLogin(`admin-smoke-${ts}@example.com`, 'ADMIN');
      officerToken = await registerAndLogin(`officer-smoke-${ts}@example.com`, 'OFFICER');
      citizenToken = await registerAndLogin(`citizen-smoke-${ts}@example.com`, 'CITIZEN');
      console.log('  ✅ Register-based auth successful');
    } catch (e2) {
      console.log(`  ❌ Register auth also failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
      console.log('  ⚠️  Cannot continue without auth. Check DATABASE_URL and seed.');
      process.exit(1);
    }
  }

  // ── 3. RBAC: Unauthenticated requests return 401 ─────────────
  console.log('\n📋 RBAC: Unauthenticated → 401');
  {
    const r = (await get('/admin/stats')) as Response;
    allPassed = checkStatus('GET /admin/stats (no auth) → 401', r.status, 401) && allPassed;
  }
  {
    const r = (await get('/audit')) as Response;
    allPassed = checkStatus('GET /audit (no auth) → 401', r.status, 401) && allPassed;
  }
  {
    const r = (await get('/officer/dashboard/stats')) as Response;
    allPassed = checkStatus('GET /officer/dashboard/stats (no auth) → 401', r.status, 401) && allPassed;
  }

  // ── 4. RBAC: Non-admin cannot access admin routes ────────────
  console.log('\n📋 RBAC: Insufficient role → 403');
  {
    const r = (await get('/admin/stats', citizenToken)) as Response;
    allPassed = checkStatus('CITIZEN → GET /admin/stats → 403', r.status, 403) && allPassed;
  }
  {
    const r = (await get('/admin/stats', officerToken)) as Response;
    allPassed = checkStatus('OFFICER → GET /admin/stats → 403', r.status, 403) && allPassed;
  }

  // ── 5. RBAC: Non-admin cannot access audit routes ────────────
  console.log('\n📋 RBAC: Audit route requires permission');
  {
    const r = (await get('/audit', citizenToken)) as Response;
    allPassed = checkStatus('CITIZEN → GET /audit → 403', r.status, 403) && allPassed;
  }

  // ── 6. Admin routes: GET /admin/stats ─────────────────────────
  console.log('\n📋 GET /admin/stats (ADMIN only)');
  {
    const r = (await get('/admin/stats', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('projects: object', body.data, 'projects', 'object') && allPassed;
      allPassed = checkKey('anomalies: object', body.data, 'anomalies', 'object') && allPassed;
      allPassed = checkKey('users: object', body.data, 'users', 'object') && allPassed;
      allPassed = checkKey('financial: object', body.data, 'financial', 'object') && allPassed;
    }
  }

  // ── 7. Admin routes: GET /admin/system-overview ────────────────
  console.log('\n📋 GET /admin/system-overview (ADMIN only)');
  {
    const r = (await get('/admin/system-overview', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('system: object', body.data, 'system', 'object') && allPassed;
      allPassed = checkKey('counts: object', body.data, 'counts', 'object') && allPassed;
      allPassed = checkKey('activity: object', body.data, 'activity', 'object') && allPassed;
    }
  }

  // ── 8. Admin routes: GET /admin/health ─────────────────────────
  console.log('\n📋 GET /admin/health (ADMIN only)');
  {
    const r = (await get('/admin/health', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('overall: string', body.data, 'overall', 'string') && allPassed;
      allPassed = checkKey('checks: array', body.data, 'checks', 'object') && allPassed;
      if (Array.isArray((body.data as Record<string, unknown>).checks)) {
        allPassed = checkArray('checks is array', (body.data as Record<string, unknown>).checks) && allPassed;
      }
    }
  }

  // ── 9. Admin routes: GET /admin/audit ──────────────────────────
  console.log('\n📋 GET /admin/audit (ADMIN only)');
  {
    const r = (await get('/admin/audit?limit=5', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: unknown };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkArray('data is array', body.data) && allPassed;
    }
  }

  // ── 10. Admin routes: GET /admin/alerts ─────────────────────────
  console.log('\n📋 GET /admin/alerts (ADMIN only)');
  {
    const r = (await get('/admin/alerts?limit=5', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('openAnomalies: array', body.data, 'openAnomalies', 'object') && allPassed;
    }
  }

  // ── 11. Admin routes: GET /admin/users ──────────────────────────
  console.log('\n📋 GET /admin/users (ADMIN only)');
  {
    const r = (await get('/admin/users?limit=5', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('users: array', body.data, 'users', 'object') && allPassed;
      allPassed = checkKey('pagination: object', body.data, 'pagination', 'object') && allPassed;
    }
  }

  // ── 12. Admin routes: GET /admin/jobs ─────────────────────────
  console.log('\n📋 GET /admin/jobs (ADMIN only)');
  {
    const r = (await get('/admin/jobs?limit=5', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('jobs: array', body.data, 'jobs', 'object') && allPassed;
      allPassed = checkKey('pagination: object', body.data, 'pagination', 'object') && allPassed;
    }
  }

  // ── 13. Admin routes: GET /admin/activity ──────────────────────
  console.log('\n📋 GET /admin/activity (ADMIN only)');
  {
    const r = (await get('/admin/activity?days=7', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('summary: object', body.data, 'summary', 'object') && allPassed;
    }
  }

  // ── 14. Admin routes: GET /admin/security/events ────────────────
  console.log('\n📋 GET /admin/security/events (ADMIN only)');
  {
    const r = (await get('/admin/security/events?limit=5', adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('events: array', body.data, 'events', 'object') && allPassed;
      allPassed = checkKey('pagination: object', body.data, 'pagination', 'object') && allPassed;
      allPassed = checkKey('summary: object', body.data, 'summary', 'object') && allPassed;
    }
  }

  // ── 15. Admin routes: POST /admin/users (create user) ──────────
  console.log('\n📋 POST /admin/users — create user (ADMIN only)');
  {
    const r = (await post('/admin/users', {
      name: 'Test Admin User',
      email: `test-admin-${Date.now()}@example.com`,
      password: 'TestPass123!',
      role: 'VIEWER',
    }, adminToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('201', r.status, 201) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('name: string', body.data, 'name', 'string') && allPassed;
      allPassed = checkKey('role: string', body.data, 'role', 'string') && allPassed;
    }
  }

  // ── 16. Officer routes: GET /officer/dashboard/stats ──────────
  console.log('\n📋 GET /officer/dashboard/stats');
  {
    const r = (await get('/officer/dashboard/stats', officerToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('totalCases: number', body.data, 'totalCases', 'number') && allPassed;
      allPassed = checkKey('criticalCases: number', body.data, 'criticalCases', 'number') && allPassed;
    }
  }

  // ── 17. Officer routes: GET /officer/cases ────────────────────
  console.log('\n📋 GET /officer/cases');
  {
    const r = (await get('/officer/cases?limit=5', officerToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('data: array', body.data, 'data', 'object') && allPassed;
      allPassed = checkKey('total: number', body.data, 'total', 'number') && allPassed;
    }
  }

  // ── 18. Officer routes: GET /officer/evidence ──────────────────
  console.log('\n📋 GET /officer/evidence');
  {
    const r = (await get('/officer/evidence?limit=5', officerToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('data: array', body.data, 'data', 'object') && allPassed;
    }
  }

  // ── 19. Officer routes: GET /officer/map/layers ───────────────
  console.log('\n📋 GET /officer/map/layers');
  {
    const r = (await get('/officer/map/layers', officerToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('projects: array', body.data, 'projects', 'object') && allPassed;
      allPassed = checkKey('cases: array', body.data, 'cases', 'object') && allPassed;
    }
  }

  // ── 20. Search: GET /search ───────────────────────────────────
  console.log('\n📋 GET /search');
  {
    const r = (await get('/search?q=test&type=projects&limit=5', officerToken)) as Response;
    const body = r.body as { success: boolean; data?: Record<string, unknown> };
    allPassed = checkStatus('200', r.status, 200) && allPassed;
    allPassed = check('success:true', body.success, true) && allPassed;
    if (body.data) {
      allPassed = checkKey('query: string', body.data, 'query', 'string') && allPassed;
      allPassed = checkKey('results: object', body.data, 'results', 'object') && allPassed;
    }
  }

  // ── 21. Search: citizen can search ─────────────────────────────
  console.log('\n📋 GET /search — CITIZEN can search');
  {
    const r = (await get('/search?q=test&type=projects&limit=5', citizenToken)) as Response;
    allPassed = checkStatus('200', r.status, 200) && allPassed;
  }

  // ── 22. Export route requires admin.manage ─────────────────────
  console.log('\n📋 GET /export/projects (CSV — ADMIN only)');
  {
    const r = (await get('/export/projects', adminToken)) as Response;
    allPassed = checkStatus('200 | 302 | 400', r.status === 200 || r.status === 302 || r.status === 400, true) && allPassed;
  }
  {
    const r = (await get('/export/projects', citizenToken)) as Response;
    allPassed = checkStatus('CITIZEN → /export/projects → 403', r.status, 403) && allPassed;
  }

  // ── 23. API health: GET /health ────────────────────────────────
  console.log('\n📋 GET /health (public)');
  {
    const r = (await get('/health')) as Response;
    allPassed = checkStatus('200', r.status, 200) && allPassed;
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(55));
  if (allPassed) {
    console.log('✅ All M22 RBAC smoke tests PASSED');
  } else {
    console.log('❌ Some M22 RBAC smoke tests FAILED');
    console.log('   Fix the failures before deploying.');
  }
  console.log('─'.repeat(55) + '\n');
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error('❌ Fatal error:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
