const https = require('https');
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
  // Login as the existing admin user
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
  const token = loginRes.body?.data?.token;
  console.log('Login user:', JSON.stringify(loginRes.body?.data?.user, null, 2));

  // Try various list endpoints
  const projects = await get('/api/v1/projects?page=1&limit=3', token);
  console.log('\nProjects:', projects.status, JSON.stringify(projects.body?.data, null, 2).slice(0, 500));

  const analytics = await get('/api/v1/analytics/overview', token);
  console.log('\nAnalytics:', analytics.status, JSON.stringify(analytics.body?.data, null, 2).slice(0, 500));

  // Try project stats endpoint
  const stats = await get('/api/v1/projects/stats', token);
  console.log('\nProject stats:', stats.status, JSON.stringify(stats.body?.data, null, 2).slice(0, 500));

  // Check if any reports endpoint
  const reports = await get('/api/v1/reports?page=1&limit=3', token);
  console.log('\nReports:', reports.status, JSON.stringify(reports.body?.data, null, 2).slice(0, 500));
}

main().catch(console.error);
