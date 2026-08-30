// Backfill primary Location records for all demo projects
// Run: npx tsx scripts/update-coordinates.ts

import { prisma, disconnectDatabase } from "../src/config/database.js";

const COORDS: Record<string, { lat: number; lng: number }> = {
  "Thiruvananthapuram": { lat: 8.5241,  lng: 76.9366 },
  "Bangalore Rural":    { lat: 13.2516, lng: 77.7081 },
  "Varanasi":          { lat: 25.3176, lng: 82.9739 },
  "Nagpur":            { lat: 21.1458, lng: 79.0882 },
  "Koraput":           { lat: 18.8120, lng: 82.7100 },
  "Yavatmal":          { lat: 20.3888, lng: 78.1304 },
  "Patna":             { lat: 25.5941, lng: 85.1376 },
  "Coimbatore":        { lat: 11.0168, lng: 76.9558 },
};

async function main() {
  const projects = await prisma.project.findMany();
  let created = 0, updated = 0;

  for (const p of projects) {
    const coord = COORDS[p.district];
    if (!coord) {
      console.log(`  ? No coord for: ${p.name} (${p.district})`);
      continue;
    }

    const existing = await prisma.location.findFirst({
      where: { projectId: p.id, isPrimary: true },
    });

    if (existing) {
      if (Math.abs(existing.latitude - coord.lat) > 0.0001 || Math.abs(existing.longitude - coord.lng) > 0.0001) {
        await prisma.location.update({
          where: { id: existing.id },
          data: { latitude: coord.lat, longitude: coord.lng, verified: true },
        });
        console.log(`  ↻ ${p.name} — coords updated`);
        updated++;
      } else {
        console.log(`  ○ ${p.name} — already has coords`);
      }
      continue;
    }

    await prisma.location.create({
      data: {
        projectId: p.id,
        latitude: coord.lat,
        longitude: coord.lng,
        isPrimary: true,
        verified: true,
        label: "Primary Site",
        address: [p.constituency, p.district, p.state].filter(Boolean).join(", "),
      },
    });
    console.log(`  ✓ ${p.name} (${p.district}) → ${coord.lat}, ${coord.lng}`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${updated} updated.`);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
