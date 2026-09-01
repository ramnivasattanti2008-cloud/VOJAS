// Render helper - reads credentials from env
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
  const cmd = process.argv[2];
  if (cmd === 'env') {
    const r = await req(`/v1/services/${SERVICE_ID}/env-vars`, 'GET');
    console.log('Status:', r.status);
    console.log('Body type:', Array.isArray(r.body) ? 'array' : typeof r.body);
    console.log('Keys:', Object.keys(r.body || {}).slice(0, 10));
    if (Array.isArray(r.body)) {
      r.body.forEach(e => console.log(`${e.key} = ${e.value ? '[SET]' : '[empty]'}`));
    } else {
      console.log('Full body:', JSON.stringify(r.body).slice(0, 1000));
    }
  } else if (cmd === 'deploy') {
    const r = await req(`/v1/services/${SERVICE_ID}/deploys`, 'POST', {});
    console.log('Deploy triggered:', r.body.id, 'status:', r.status);
  } else if (cmd === 'status') {
    const r = await req(`/v1/services/${SERVICE_ID}/deploys?limit=1`, 'GET');
    const d = r.body[0]?.deploy;
    console.log(d.id, d.status, d.commit?.id?.slice(0,7), d.finishedAt || 'in progress');
  } else if (cmd === 'service') {
    const r = await req(`/v1/services/${SERVICE_ID}`, 'GET');
    const s = r.body;
    console.log('Name:', s.name, '| Status:', s.status, '| Region:', s.region);
    console.log('RootDir:', s.rootDir, '| AutoDeploy:', s.autoDeploy);
    console.log('Health:', s.healthCheckPath);
  } else {
    console.log('Usage: node _render-helper.js [env|deploy|status|service]');
  }
}

main().catch(console.error);
