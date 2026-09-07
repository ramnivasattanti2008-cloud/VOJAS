/**
 * Performance test suite — VOJAS M17
 *
 * Run: npx ts-node scripts/perf-test.ts
 * Requires API to be running at NEXT_PUBLIC_API_URL (default http://localhost:5000)
 *
 * Tests key endpoints for latency and correctness.
 */

import http from 'http';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Demo token — replace with actual auth in CI
const DEMO_TOKEN = process.env.VOJAS_TEST_TOKEN || 'Bearer demo';

function request(path: string, method = 'GET'): Promise<{ latency: number; status: number; body: unknown }> {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const start = Date.now();
    const req = http.request(url, { method, headers: { Authorization: DEMO_TOKEN } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - start;
        try {
          resolve({ latency, status: res.statusCode ?? 0, body: JSON.parse(data) });
        } catch {
          resolve({ latency, status: res.statusCode ?? 0, body: data });
        }
      });
    });
    req.on('error', () => resolve({ latency: Date.now() - start, status: 0, body: null }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ latency: 99999, status: 0, body: null });
    });
    req.end();
  });
}

async function measure(name: string, path: string, maxMs: number): Promise<boolean> {
  const { latency, status } = await request(path);
  const ok = latency < maxMs && status >= 200 && status < 400;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name} — ${latency}ms (target <${maxMs}ms, status=${status})`);
  return ok;
}

async function runTests(): Promise<void> {
  console.log('\n=== VOJAS M17 Performance Tests ===\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = await Promise.all([
    // Public endpoints
    measure('Public projects list', '/api/public-projects?limit=10', 500),
    measure('Public projects by state', '/api/public-projects/state/Karnataka', 500),

    // List endpoints (authenticated)
    measure('Projects list (paginated)', '/api/projects?limit=10', 500),
    measure('Risk signals list', '/api/projects/test/risk/signals?limit=10', 500),
    measure('Risk findings list', '/api/risk/findings?limit=10', 500),
    measure('Anomalies list', '/api/anomalies?limit=10', 500),
    measure('Reports list', '/api/reports?limit=10', 500),
    measure('Vendors list', '/api/vendors?limit=10', 500),
    measure('Notifications list', '/api/notifications?limit=10', 500),

    // Detail endpoints
    measure('Single project detail', '/api/projects/test', 300),

    // Export endpoints
    measure('Export projects CSV', '/api/export/projects?limit=100', 2000),
    measure('Export reports CSV', '/api/export/reports?limit=100', 2000),
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`\n=== Results: ${passed}/${total} passed ===\n`);

  if (passed < total) {
    process.exit(1);
  }
}

runTests().catch(console.error);
