const https = require('https');

const TOKEN = 'rnd_rlVLrdFr0moSx29zgBek4BxdIBpR';
const SERVICE_ID = 'srv-daaocqek1f9s73b1l520';

function apiReq(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.render.com',
      path,
      method: method || 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    if (data) {
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Get latest deploy
  const deploys = await apiReq(`/v1/services/${SERVICE_ID}/deploys?limit=1`);
  const deploy = deploys.body[0]?.deploy;
  console.log('Latest deploy:', deploy.id, deploy.status, deploy.commit.id.slice(0, 7));

  // Try get deploy details
  const details = await apiReq(`/v1/deploys/${deploy.id}`);
  console.log('Deploy details status:', details.status);
  console.log(JSON.stringify(details.body, null, 2).slice(0, 2000));
}

main().catch(console.error);
