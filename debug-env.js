const https = require('https');

// Check health endpoint to see if SEED_ON_BOOT env is being read
const BASE = 'https://vojas-backend.onrender.com';

function get(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    https.get(url, { headers }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  // 1. Health - check environment info
  const health = await get('/api/v1/health');
  console.log('Health:', JSON.stringify(health.body?.data, null, 2));

  // 2. Login
  const loginRes = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'admin@vojas.gov', password: 'VojasDemo2026' });
    const req = https.request({
      hostname: 'vojas-backend.onrender.com', path: '/api/v1/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  console.log('\nLogin:', JSON.stringify(loginRes, null, 2));
  const token = loginRes.body?.data?.token;
  console.log('Token:', token ? token.slice(0, 80) + '...' : 'NONE');

  if (!token) return;

  // 3. Projects
  const projects = await get('/api/v1/projects?page=1&limit=5', token);
  console.log('\nProjects:', projects.status, '| count:', projects.body?.data?.items?.length, '| total:', projects.body?.data?.total);

  // 4. Check /me endpoint to see actual user role
  const me = await get('/api/v1/auth/me', token);
  console.log('\n/me:', JSON.stringify(me.body?.data?.user, null, 2));
}

main().catch(console.error);
