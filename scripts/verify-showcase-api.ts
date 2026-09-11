import 'dotenv/config';

async function testEndpoint(url: string, name: string) {
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\n=== [${res.status}] ${name} ===`);
    console.log(`URL: ${url}`);
    if (res.status !== 200) {
      console.log('Error Body:', JSON.stringify(json, null, 2));
    } else {
      const data = json.data ?? json;
      if (data.name) {
        console.log(`Project: "${data.name}" | Status: ${data.status} | MP: ${data.mp?.name} (${data.mp?.party})`);
      } else if (data.availability) {
        console.log(`Satellite Availability: ${data.availability} | Count: ${data.observationCount} | Baseline: ${data.baseline?.observationDate} | Latest: ${data.latest?.observationDate}`);
      } else if (data.entries) {
        console.log(`Timeline Checkpoints: ${data.entries.length} entries`);
      } else if (data.reports) {
        console.log(`Citizen Reports: ${data.reports.length} reports`);
        for (const r of data.reports) {
          console.log(`  - [${r.reportReference}] (${r.category}) ${r.title}`);
        }
      } else {
        console.log('Response summary:', JSON.stringify(data).slice(0, 180) + '...');
      }
    }
  } catch (err) {
    console.error(`Failed to fetch ${name}:`, err);
  }
}

async function main() {
  const BASE = 'http://localhost:5000/api/v1';

  // 1. Showcase Bangalore School
  await testEndpoint(`${BASE}/projects/public/cmtwjxvip000n932octqrfpw7`, 'Bangalore Public Project');
  await testEndpoint(`${BASE}/projects/cmtwjxvip000n932octqrfpw7/satellite`, 'Bangalore Satellite Status');
  await testEndpoint(`${BASE}/projects/cmtwjxvip000n932octqrfpw7/satellite/timeline`, 'Bangalore Satellite Timeline');
  await testEndpoint(`${BASE}/projects/public/cmtwjxvip000n932octqrfpw7/reports`, 'Bangalore Citizen Reports');

  // 2. Showcase Bhubaneswar Science Lab
  await testEndpoint(`${BASE}/projects/public/showcase-fin-1`, 'Bhubaneswar Public Project');
  await testEndpoint(`${BASE}/projects/showcase-fin-1/satellite`, 'Bhubaneswar Satellite Status');
  await testEndpoint(`${BASE}/projects/public/showcase-fin-1/reports`, 'Bhubaneswar Citizen Reports');

  // 4. Mumbai Health Center
  await testEndpoint(`${BASE}/projects/public/cmtwjxvjl000v932of8gat0wn`, 'Mumbai Health Center Public Project');
  await testEndpoint(`${BASE}/projects/cmtwjxvjl000v932of8gat0wn/satellite`, 'Mumbai Satellite Status');
  await testEndpoint(`${BASE}/projects/public/cmtwjxvjl000v932of8gat0wn/reports`, 'Mumbai Citizen Reports');

  // 5. Jatni Anganwadi
  await testEndpoint(`${BASE}/projects/public/showcase-ong-1`, 'Jatni Anganwadi Public Project');
  await testEndpoint(`${BASE}/projects/showcase-ong-1/satellite`, 'Jatni Satellite Status');
  await testEndpoint(`${BASE}/projects/public/showcase-ong-1/reports`, 'Jatni Citizen Reports');
}

main();
