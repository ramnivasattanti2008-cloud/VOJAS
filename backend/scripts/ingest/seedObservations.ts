/**
 * Seed synthetic but realistic satellite observations for the 5 pilot projects.
 * Used to test the verification engine end-to-end without CDSE credentials.
 *
 * Each observation has realistic NDVI/NDBI values that match the project's
 * reported progress to avoid triggering false anomalies.
 *
 * Run: cd backend && npx tsx scripts/ingest/seedObservations.ts
 */

import { prisma, disconnectDatabase } from "../../src/config/database.js";
import { logger } from "../../src/utils/logger.js";
import { verificationService } from "../../src/services/verificationService.js";

async function main() {
  const pilots = await prisma.project.findMany({
    where: { pilotProject: true },
    select: { id: true, name: true, reportedProgress: true },
  });

  logger.info(`Seeding observations for ${pilots.length} pilot projects...`);

  for (const pilot of pilots) {
    const progress = pilot.reportedProgress ?? 0;

    // Map progress to realistic NDVI/NDBI values:
    // - Low progress (0-30%): site preparation, mixed vegetation
    // - Medium progress (30-70%): construction, decreasing vegetation
    // - High progress (70-100%): near-complete, building footprint
    const ndvi = parseFloat((0.3 - progress * 0.002).toFixed(4)); // 0.3 at 0%, ~0.15 at 75%
    const ndbii = parseFloat((progress * 0.005 - 0.1).toFixed(4)); // -0.1 at 0%, ~0.2 at 60%

    // Generate 4 observations spread over 18 months
    const observations = [
      {
        daysBack: 540, // ~18 months ago
        cloudCover: 15,
        ndvi: parseFloat((ndvi + 0.1).toFixed(4)),
        ndbii: parseFloat((ndbii - 0.05).toFixed(4)),
        builtUpArea: Math.round(progress * 100),
      },
      {
        daysBack: 360, // ~12 months ago
        cloudCover: 8,
        ndvi: parseFloat((ndvi + 0.05).toFixed(4)),
        ndbii: parseFloat((ndbii - 0.02).toFixed(4)),
        builtUpArea: Math.round(progress * 70),
      },
      {
        daysBack: 180, // ~6 months ago
        cloudCover: 22,
        ndvi: parseFloat((ndvi + 0.02).toFixed(4)),
        ndbii: parseFloat((ndbii - 0.01).toFixed(4)),
        builtUpArea: Math.round(progress * 90),
      },
      {
        daysBack: 30, // ~1 month ago
        cloudCover: 5,
        ndvi,
        ndbii,
        builtUpArea: Math.round(progress * 100),
      },
    ];

    for (const obs of observations) {
      const now = new Date();
      const obsDate = new Date(now.getTime() - obs.daysBack * 24 * 60 * 60 * 1000);
      const sceneId = `TEST_S2A_${obsDate.toISOString().slice(0, 10).replace(/-/g, '')}_N9999_R005_T99AAA_V999`;

      // Skip if already exists
      const existing = await prisma.satelliteObservation.findUnique({
        where: { sceneId_observationDate: { sceneId, observationDate: obsDate } },
      });
      if (existing) {
        logger.info(`  · ${pilot.name}: scene ${sceneId} already exists, skipping`);
        continue;
      }

      await prisma.satelliteObservation.create({
        data: {
          projectId: pilot.id,
          sceneId,
          observationDate: obsDate,
          provider: "CDSE",
          satellite: "SENTINEL-2A",
          sensor: "MSI",
          dataset: "S2_L2A",
          cloudCover: obs.cloudCover,
          resolution: 10,
          bbox: JSON.stringify({ sw: [0, 0], ne: [0, 0] }),
          tileUrl: "",
          thumbnailUrl: "",
          centerLat: 0,
          centerLng: 0,
          processingDate: obsDate,
          processingBaseline: "05.00",
          processingLevel: "L2A",
          sourceUrl: "https://dataspace.copernicus.eu",
          sourceName: "Copernicus Data Space Ecosystem (test)",
          retrievalDate: now,
          ndvi: obs.ndvi,
          ndbii: obs.ndbii,
          bsi: 0,
          builtUpArea: obs.builtUpArea,
          vegetationArea: Math.round(10000 - obs.builtUpArea),
          constructionScore: Math.min(100, progress),
          quality: obs.cloudCover < 15 ? "GOOD" : "MODERATE",
        },
      });

      logger.info(
        `  + ${pilot.name}: scene ${sceneId.slice(0, 40)}... | ` +
        `date=${obsDate.toISOString().slice(0, 10)} | ` +
        `cloud=${obs.cloudCover}% | ` +
        `NDVI=${obs.ndvi} | NDBI=${obs.ndbii} | ` +
        `builtUp=${obs.builtUpArea}m²`
      );
    }
  }

  logger.info(`\nDone. Running verification for all pilot projects...\n`);

  for (const pilot of pilots) {
    const result = await verificationService.runAndStore({ projectId: pilot.id });
    const anomalyCount = await prisma.anomaly.count({
      where: { projectId: pilot.id, category: "PROGRESS_DISCREPANCY" },
    });
    logger.info(
      `  ${pilot.name}: ${result.output.result} | confidence=${result.output.confidence} | ` +
      `score=${result.output.score.toFixed(1)} | anomalies=${anomalyCount}`
    );
  }

  logger.info(`\nSeed complete.`);
}

main()
  .catch((err) => {
    logger.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
