/**
 * Backfill SatelliteObservation.centerLat/Lng from the parent project's
 * latitude/longitude. Existing rows have lat/lng = 0 because they were
 * created without project coordinate lookups.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all observations with centerLat = 0 OR null
  const observations = await prisma.satelliteObservation.findMany({
    where: {
      OR: [{ centerLat: 0 }, { centerLat: null }, { centerLng: 0 }, { centerLng: null }],
    },
    select: { id: true, projectId: true, centerLat: true, centerLng: true },
  });

  console.log(`Found ${observations.length} observations to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const obs of observations) {
    const project = await prisma.project.findUnique({
      where: { id: obs.projectId },
      select: { latitude: true, longitude: true },
    });

    if (!project || !project.latitude || !project.longitude) {
      skipped++;
      continue;
    }

    // Use the project coordinates; add small jitter so multiple observations
    // of the same project don't all stack on the exact same point on the map.
    // The jitter is tiny (~0.0001° = ~11m) so it doesn't visually move the marker.
    const jitterLat = (Math.random() - 0.5) * 0.0002;
    const jitterLng = (Math.random() - 0.5) * 0.0002;

    await prisma.satelliteObservation.update({
      where: { id: obs.id },
      data: {
        centerLat: project.latitude + jitterLat,
        centerLng: project.longitude + jitterLng,
      },
    });
    updated++;
  }

  console.log(`Updated: ${updated}  Skipped (no project coords): ${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
