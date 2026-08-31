// Wait for the latest deploy to go live, then run verification
const https = require('https');

const TOKEN = 'rnd_rlVLrdFr0moSx29zgBek4BxdIBpR';
const SERVICE_ID = 'srv-daaocqek1f9s73b1l520';

function api(path) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'api.render.com', path, headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject);
  });
}

async function getDeploy() {
  const r = await api(`/v1/services/${SERVICE_ID}/deploys?limit=1`);
  return r[0]?.deploy;
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  let deploy = await getDeploy();
  console.log(`\rCurrent: ${deploy.status} | ${deploy.commit.id.slice(0,7)} | ${deploy.commit.message.split('\n')[0]}`);

  for (let i = 0; i < 60; i++) {
    if (deploy.status === 'live') {
      console.log('\n✅ Deploy is LIVE');
      // Now wait for the seed to run on boot (up to 60s)
      console.log('Waiting for seed to complete on boot...');
      break;
    }
    if (deploy.status === 'update_failed' || deploy.status === 'build_failed') {
      console.log(`\n❌ Deploy FAILED: ${deploy.status}`);
      console.log("This is the Dockerfile build error. Check the latest commit status.");
      process.exit(1);
    }
    process.stdout.write(`\rWaiting for deploy... ${deploy.status.padEnd(20)} | attempt ${i+1}/60`);
    await wait(3000);
    deploy = await getDeploy();
  }
  console.log('\n');
  if (deploy.status !== 'live') {
    console.log(`Final status: ${deploy.status}`);
    process.exit(1);
  }
  // Now poll the live site until projects > 0 (seed finished)
  for (let i = 0; i < 30; i++) {
    const r = await new Promise((resolve, reject) => {
      https.get('https://vojas-backend.onrender.com/api/v1/projects?page=1&limit=1', { headers: { Authorization: `Bearer ${''}` } }, (res) => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
      }).on('error', reject);
    });
    process.stdout.write(`\rPoll ${i+1}/30: ${r.slice(0, 100)}`);
    await wait(2000);
  }
  console.log('\n\nDone. Run `node monitor.js` to see final state.');
})().catch(console.error);
