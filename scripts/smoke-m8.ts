/**
 * VOJAS M8 Risk Endpoints — Smoke Test
 * =============================================================
 * Starts the backend, runs a smoke test against all M8 risk endpoints,
 * then shuts down.
 *
 * Prerequisites:
 *   1. Start PostgreSQL (e.g. via Docker)
 *   2. Ensure DATABASE_URL in .env points to it
 *   3. Run: pnpm db:push && pnpm db:seed
 *   4. pnpm tsx scripts/smoke-m8.ts
 */

import http from 'node:http';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// ── Helpers ─────────────────────────────────────────────────────────

function get(path: string, token?: string): Promise<unknown> {
  return request('GET', path, undefined, token);
}
function post(path: string, body: unknown, token?: string): Promise<unknown> {
  return request('POST', path, body, token);
}
function patch(path: string, body: unknown, token?: string): Promise<unknown> {
  return request('PATCH', path, body, token);
}

function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<unknown> {
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
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function check(label: string, actual: unknown, expected: unknown): boolean {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${pass ? '✅' : '❌'} ${label}`);
  if (!pass) {
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     got:      ${JSON.stringify(actual)}`);
  }
  return pass;
}

function checkKey(
  label: string,
  obj: Record<string, unknown>,
  key: string,
  type: string
): boolean {
  const val = obj[key];
  const pass = typeof val === type;
  console.log(`  ${pass ? '✅' : '❌'} ${label} [key: ${key}, type: ${typeof val}]`);
  if (!pass) console.log(`     expected ${type}, got ${typeof val}`);
  return pass;
}

// ── Auth helper ────────────────────────────────────────────────────

async function login(): Promise<string> {
  const res = (await post('/auth/login', {
    email: 'admin@vojas.gov',
    password: 'Admin123!',
  })) as { status: number; body: { success: boolean; data?: { token?: string } } };

  if (!res.body.success || !res.body.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  }
  console.log('  ✅ Login successful');
  return res.body.data.token;
}

// ── Tests ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🛡️  VOJAS M8 Risk Endpoints — Smoke Test`);
  console.log(`   Base URL: ${API_BASE}\n`);

  let allPassed = true;

  // ── 1. Health check ───────────────────────────────────────────
  console.log('\n📋 Health check');
  try {
    const health = (await get('/health')) as { status: number; body: { success: boolean } };
    if (!check('GET /health → 200 + success:true', health.status === 200 && health.body?.success === true, true)) {
      console.log(`     raw: ${JSON.stringify(health)}`);
    }
  } catch (e) {
    console.log(`  ❌ Health check failed — is the backend running?`);
    console.log(`     Run: pnpm dev:api`);
    allPassed = false;
  }

  // ── 2. Auth ──────────────────────────────────────────────────
  console.log('\n📋 Authentication');
  let token = '';
  try {
    token = await login();
  } catch (e) {
    console.log(`  ❌ Login failed — check credentials and DB seed`);
    console.log(`     Error: ${e instanceof Error ? e.message : String(e)}`);
    allPassed = false;
    console.log('\n⚠️  Cannot continue without auth. Start backend + seed first.');
    console.log('   pnpm dev:api');
    process.exit(1);
  }

  // ── 3. GET /risk/summary ────────────────────────────────────
  console.log('\n📋 GET /risk/summary (national risk summary)');
  {
    const r = (await get('/risk/summary', token)) as {
      status: number;
      body: { success: boolean; data?: Record<string, unknown> };
    };
    allPassed = check('200', r.status, 200) && allPassed;
    allPassed = check('success:true', r.body?.success, true) && allPassed;
    if (r.body?.data) {
      const d = r.body.data;
      allPassed = checkKey('totalProjects: number', d, 'totalProjects', 'number') && allPassed;
      allPassed = checkKey('riskDistribution: object', d, 'riskDistribution', 'object') && allPassed;
      allPassed = checkKey('highRiskProjects: number', d, 'highRiskProjects', 'number') && allPassed;
      allPassed = checkKey('delayedProjects: number', d, 'delayedProjects', 'number') && allPassed;
      allPassed = checkKey('averageRiskScore: number', d, 'averageRiskScore', 'number') && allPassed;
    }
  }

  // ── 4. GET /risk/findings (global — new endpoint) ──────────
  console.log('\n📋 GET /risk/findings (global findings queue — new in 205700e)');
  {
    const r = (await get('/risk/findings', token)) as {
      status: number;
      body: { success: boolean; data?: Record<string, unknown> };
    };
    allPassed = check('200', r.status, 200) && allPassed;
    allPassed = check('success:true', r.body?.success, true) && allPassed;
    if (r.body?.data) {
      const d = r.body.data;
      allPassed = checkKey('findings: array', d, 'findings', 'object') && allPassed; // array is object in JS
      allPassed = checkKey('total: number', d, 'total', 'number') && allPassed;
      console.log(`  ℹ️  total findings: ${(d.total as number) ?? 'N/A'}`);
    }
  }

  // ── 5. GET /risk/trends ────────────────────────────────────
  console.log('\n📋 GET /risk/trends');
  {
    const r = (await get('/risk/trends?days=7', token)) as {
      status: number;
      body: { success: boolean; data?: Record<string, unknown> };
    };
    allPassed = check('200', r.status, 200) && allPassed;
    allPassed = check('success:true', r.body?.success, true) && allPassed;
    if (r.body?.data) {
      const d = r.body.data;
      allPassed = checkKey('trends: array', d, 'trends', 'object') && allPassed;
      allPassed = checkKey('periodDays: number', d, 'periodDays', 'number') && allPassed;
    }
  }

  // ── 6. GET /risk/hotspots ────────────────────────────────────
  console.log('\n📋 GET /risk/hotspots');
  {
    const r = (await get('/risk/hotspots?minScore=40&limit=10', token)) as {
      status: number;
      body: { success: boolean; data?: Record<string, unknown> };
    };
    allPassed = check('200', r.status, 200) && allPassed;
    allPassed = check('success:true', r.body?.success, true) && allPassed;
    if (r.body?.data) {
      const d = r.body.data;
      allPassed = checkKey('hotspots: array', d, 'hotspots', 'object') && allPassed;
      allPassed = checkKey('threshold: number', d, 'threshold', 'number') && allPassed;
    }
  }

  // ── 7. GET /risk/rules ──────────────────────────────────────
  console.log('\n📋 GET /risk/rules');
  {
    const r = (await get('/risk/rules', token)) as {
      status: number;
      body: { success: boolean; data?: Record<string, unknown> };
    };
    allPassed = check('200', r.status, 200) && allPassed;
    allPassed = check('success:true', r.body?.success, true) && allPassed;
    if (r.body?.data) {
      const d = r.body.data;
      allPassed = checkKey('rules: array', d, 'rules', 'object') && allPassed;
    }
  }

  // ── 8. GET /projects/:id/risk/findings (project-scoped) ────
  console.log('\n📋 GET /projects/:id/risk/findings (project-scoped, includes project name)');
  {
    // First get a project ID
    const projectsRes = (await get('/projects?limit=1', token)) as {
      status: number;
      body: { success: boolean; data?: { projects?: Array<{ id: string }> } };
    };
    if (projectsRes.body?.data?.projects?.length) {
      const projectId = projectsRes.body.data.projects[0].id;
      console.log(`  ℹ️  Testing with project: ${projectId}`);

      const r = (await get(`/projects/${projectId}/risk/findings`, token)) as {
        status: number;
        body: { success: boolean; data?: Record<string, unknown> };
      };
      allPassed = check('200', r.status, 200) && allPassed;
      allPassed = check('success:true', r.body?.success, true) && allPassed;
      if (r.body?.data) {
        const d = r.body.data;
        allPassed = checkKey('findings: array', d, 'findings', 'object') && allPassed;
        allPassed = checkKey('total: number', d, 'total', 'number') && allPassed;

        // Check that findings include project info
        const findings = d.findings as Array<Record<string, unknown>>;
        if (findings.length > 0) {
          const f = findings[0];
          allPassed = checkKey('finding.project: object', f, 'project', 'object') && allPassed;
          allPassed = checkKey('finding.projectId: string', f, 'projectId', 'string') && allPassed;
          console.log(`  ℹ️  First finding: "${f.title}" (severity: ${f.severity})`);
        } else {
          console.log(`  ℹ️  No findings for this project yet (run risk analysis first)`);
        }
      }
    } else {
      console.log(`  ⚠️  No projects found in DB — run db:seed first`);
      allPassed = false;
    }
  }

  // ── 9. GET /projects/:id/risk (project risk summary) ────────
  console.log('\n📋 GET /projects/:id/risk (project risk summary)');
  {
    const projectsRes = (await get('/projects?limit=1', token)) as {
      body: { data?: { projects?: Array<{ id: string }> } };
    };
    if (projectsRes.body?.data?.projects?.length) {
      const projectId = projectsRes.body.data.projects[0].id;
      const r = (await get(`/projects/${projectId}/risk`, token)) as {
        status: number;
        body: { success: boolean; data?: Record<string, unknown> };
      };
      allPassed = check('200', r.status, 200) && allPassed;
      allPassed = check('success:true', r.body?.success, true) && allPassed;
      if (r.body?.data) {
        const d = r.body.data;
        allPassed = checkKey('projectId: string', d, 'projectId', 'string') && allPassed;
        allPassed = checkKey('project: object', d, 'project', 'object') && allPassed;
        allPassed = checkKey('signals: object', d, 'signals', 'object') && allPassed;
        allPassed = checkKey('findings: object', d, 'findings', 'object') && allPassed;
        allPassed = checkKey('timeline: object', d, 'timeline', 'object') && allPassed;
      }
    }
  }

  // ── 10. Auth guard — /risk/summary without token ────────────
  console.log('\n📋 Auth guard: GET /risk/summary without token → 401');
  {
    const r = (await get('/risk/summary')) as { status: number };
    allPassed = check('401', r.status, 401) && allPassed;
  }

  // ── 11. Auth guard — /risk/findings without token ───────────
  console.log('\n📋 Auth guard: GET /risk/findings without token → 401');
  {
    const r = (await get('/risk/findings')) as { status: number };
    allPassed = check('401', r.status, 401) && allPassed;
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────');
  if (allPassed) {
    console.log('✅ All checks passed');
    console.log('────────────────────────────────────────\n');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed — see above');
    console.log('────────────────────────────────────────\n');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
