// Automated Render deploy + seed orchestration
const https = require('https');

const TOKEN = 'rnd_rlVLrdFr0moSx29zgBek4BxdIBpR';
const SERVICE_ID = 'srv-daaocqek1f9s73b1l520';
const BASE = 'api.render.com';

function req(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
      },
    };
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function getLatestDeploy() {
  const r = await req(`/v1/services/${SERVICE_ID}/deploys?limit=1`, 'GET');
  return r.body[0]?.deploy;
}

async function triggerDeploy(clearCache = false) {
  // Render's API expects an empty POST body or specific params
  const r = await req(`/v1/services/${SERVICE_ID}/deploys`, 'POST', { clearCache });
  return r;
}

async function getLogs(deployId) {
  // Get log lines for a deploy
  const r = await req(`/v1/services/${SERVICE_ID}/logs?limit=100`, 'GET');
  return r;
}

async function main() {
  console.log('=== Step 1: Latest deploy status ===');
  const latest = await getLatestDeploy();
  console.log(`${latest.status} | ${latest.commit.id.slice(0, 7)} | ${latest.commit.message.split('\n')[0]}`);

  console.log('\n=== Step 2: Trigger fresh deploy with clear cache ===');
  const result = await triggerDeploy(true);
  console.log('Trigger result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
