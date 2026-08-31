const https = require('https');

function api(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.render.com',
      path,
      method: 'GET',
      headers: { Authorization: 'Bearer rnd_rlVLrdFr0moSx29zgBek4BxdIBpR' }
    };
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject);
  });
}

async function main() {
  const deploys = await api('/v1/services/srv-daaocqek1f9s73b1l520/deploys?limit=3');
  for (const item of deploys) {
    const { id, status, commit, trigger, createdAt, finishedAt } = item.deploy;
    console.log(`${status.padEnd(12)} | ${commit.id.slice(0,7)} | ${commit.message.split('\n')[0]} | ${trigger} | ${createdAt}${finishedAt ? ' → ' + finishedAt : ''}`);
  }
  console.log('\nLatest commit on origin: 55a0bd8 — waiting for Render to pick it up...');
}

main().catch(console.error);
