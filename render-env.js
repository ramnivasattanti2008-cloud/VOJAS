// Render env var setter — reads API key from RENDER_API_KEY env var (not command line)
const https = require('https');
const TOKEN = process.env.RENDER_API_KEY;
const SERVICE_ID = 'srv-daaocqek1f9s73b1l520';
if (!TOKEN) { console.error('Set RENDER_API_KEY env var first'); process.exit(1); }

function req(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.render.com', path, method,
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 },
    };
    const r = https.request(opts, (res) => {
      let d = ''; res.on('data', (c) => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    r.on('error', reject);
    if (data) r.write(data); r.end();
  });
}

async function main() {
  const vars = [
    { key: 'SEED_ON_BOOT', value: 'true' },
    { key: 'DEMO_PASSWORD', value: 'VojasDemo2026' },
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '10000' },
  ];
  for (const v of vars) {
    const r = await req(`/v1/services/${SERVICE_ID}/env-vars/${v.key}`, 'PUT', { value: v.value });
    console.log(`${v.key} -> ${r.status} ${JSON.stringify(r.body || '').slice(0, 100)}`);
  }
}

main().catch(console.error);