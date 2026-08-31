const https = require('https');
const BASE = 'https://vojas-backend.onrender.com';

// Minimal poll + verify
function get(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    }).on('error', reject);
  });
}

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'vojas-backend.onrender.com', path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function verify() {
  const health = await get('/api/v1/health');
  console.log('[1] Health:', health.status, health.body?.data?.checks?.database?.status);

  const login = await post('/api/v1/auth/login', { email: 'admin@vojas.gov', password: 'VojasDemo2026' });
  const token = login.body?.data?.token;
  console.log('[2] Login:', login.status, login.body?.success ? 'OK' : 'FAIL', '| Role:', login.body?.data?.user?.role);

  if (!token) { console.log('No token — abort'); return; }

  const projects = await get('/api/v1/projects?page=1&limit=5', token);
  const projectCount = projects.body?.data?.items?.length ?? -1;
  console.log('[3] Projects:', projects.status, '| count:', projectCount);

  const stats = await get('/api/v1/projects/stats', token);
  const totalBudget = stats.body?.data?.stats?.totalBudget ?? -1;
  console.log('[4] Total budget:', totalBudget > 0 ? `₹${totalBudget.toLocaleString()}` : '0 (not seeded)');

  const allGood = health.body?.data?.checks?.database?.status === 'connected'
    && login.body?.success
    && projects.body?.success
    && projectCount > 0
    && totalBudget > 0;

  console.log('\n' + (allGood ? '🎉 SITE FULLY FUNCTIONAL WITH DATA!' : '⚠️  Seed may still be running — try again in 30s'));
}

verify().catch(console.error);
