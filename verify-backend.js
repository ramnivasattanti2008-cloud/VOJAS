// VOJAS live-site verification script
const https = require('https');

const BASE = 'https://vojas-backend.onrender.com';

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, body }); } });
    }).on('error', reject);
  });
}

function post(path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const body = JSON.stringify(data);
    const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Health check
  const health = await get('/api/v1/health');
  console.log('1. Health:', health.status, health.body?.data?.status, '| DB:', health.body?.data?.checks?.database?.status);

  // 2. Login
  const login = await post('/api/v1/auth/login', { email: 'admin@vojas.gov', password: 'VojasDemo2026' });
  console.log('2. Login:', login.status, login.body?.success ? 'OK' : 'FAIL', '| Role:', login.body?.data?.user?.role);
  const token = login.body?.data?.token;
  if (!token) { console.log('   No token — cannot test auth'); return; }

  // 3. Protected: list projects
  const proj = await new Promise((resolve, reject) => {
    const url = new URL('/api/v1/projects?page=1&limit=2', BASE);
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, body }); } });
    });
    req.on('error', reject);
  });
  console.log('3. Projects:', proj.status, proj.body?.success ? 'OK' : 'FAIL', '| Count:', proj.body?.data?.items?.length ?? '?');

  // 4. Protected: list reports
  const reports = await new Promise((resolve, reject) => {
    const url = new URL('/api/v1/reports?page=1&limit=2', BASE);
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, body }); } });
    });
    req.on('error', reject);
  });
  console.log('4. Reports:', reports.status, reports.body?.success ? 'OK' : 'FAIL', '| Count:', reports.body?.data?.items?.length ?? '?');

  // 5. Summary
  const allGood = health.body?.data?.checks?.database?.status === 'connected'
    && login.body?.success
    && proj.body?.success
    && reports.body?.success;
  console.log('\n' + (allGood ? '✅ ALL CHECKS PASS — site is fully functional!' : '❌ Some checks failed'));
}

main().catch(console.error);
