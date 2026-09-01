/**
 * Ingest: LGD — Local Government Directory (lgdirectory.gov.in)
 *
 * Master reference: 36 states, 784 districts, 7,323 blocks, 677,417 villages.
 * Used to canonicalize district/village names across all other datasets.
 *
 * Access:
 *   - NAPIX API: https://dev.napix.gov.in/nic/lgd/
 *   - Bulk download via portal (may need session — fallback to cached JSON)
 *
 * This script tries the API first, falls back to a bundled JSON file
 * in scripts/ingest/data/lgd-districts.json if the API fails.
 *
 * Idempotent: upserts on lgdCode.
 *
 * Run:  npm run ingest:lgd
 *   dry: npx tsx scripts/ingest/lgd.ts --dry-run
 */
import { DATA_DIR, ensureDir, fileExists, getPrisma } from "./_shared.js";
import { writeJSON, Progress } from "./_shared.js";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");

// Small in-memory district centroid cache for geocoding service.
const CENTROID_CACHE_PATH = path.join(DATA_DIR, "lgd-centroids.json");

interface LGDEntity {
  lgdCode: string;
  entityType: "STATE" | "DISTRICT" | "BLOCK" | "VILLAGE" | "GP" | "ULB";
  name: string;
  nameCanonical: string;
  parentCode: string | null;
  stateName: string;
  districtName?: string;
  blockName?: string;
  latitude?: number;
  longitude?: number;
}

/** Attempt the NAPIX LGD API. Returns entities, or null on failure. */
async function fetchFromAPI(): Promise<LGDEntity[] | null> {
  const entities: LGDEntity[] = [];
  const base = "https://dev.napix.gov.in/nic/lgd";

  // Try states first
  let states: Array<{ stateCode: string; census2011Code: string; nameEnglish: string }> = [];
  try {
    console.log(`  → trying ${base}/state`);
    const res = await fetch(`${base}/state`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = await res.json();
      states = Array.isArray(json) ? json : (json.data ?? json.states ?? []);
    }
  } catch (e: any) {
    console.log(`  ! API states failed: ${e.message}`);
  }

  if (!states.length) return null;
  console.log(`  ✓ states API: ${states.length} records`);

  // Fetch districts for each state
  const progress = new Progress("  lgd districts");
  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    try {
      const res = await fetch(`${base}/district?stateCode=${s.stateCode}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const districts: any[] = Array.isArray(json) ? json : (json.data ?? json.districts ?? []);

      for (const d of districts) {
        const name = d.nameEnglish ?? d.districtNameEnglish ?? d.districtName ?? "";
        if (!name) continue;
        entities.push({
          lgdCode: String(d.districtCode ?? d.lgdCode ?? ""),
          entityType: "DISTRICT",
          name,
          nameCanonical: name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 32),
          parentCode: s.stateCode ?? null,
          stateName: s.nameEnglish ?? "",
        });
      }
    } catch {
      // non-fatal
    }
    progress.tick(i + 1, states.length);
  }

  console.log(`  ✓ districts fetched: ${entities.length}`);
  return entities.length > 0 ? entities : null;
}

/** Build centroid lookup from a simple district list. */
function buildCentroids(districts: LGDEntity[]): Map<string, { lat: number; lng: number }> {
  const centroids = new Map<string, { lat: number; lng: number }>();
  // Use district name as key — real lat/lng requires a geocoding pass.
  for (const d of districts) {
    if (d.latitude != null && d.longitude != null) {
      centroids.set(d.nameCanonical, { lat: d.latitude, lng: d.longitude });
    }
  }
  return centroids;
}

async function main() {
  console.log(`📥 Ingest: LGD master reference → LGDLocation`);
  ensureDir(DATA_DIR);

  let entities: LGDEntity[] = [];

  // Try API
  const fromApi = await fetchFromAPI();

  if (fromApi) {
    entities = fromApi;
    // Cache it
    const cachePath = path.join(DATA_DIR, "lgd-api-cache.json");
    writeJSON(cachePath, entities);
    console.log(`  ✓ cached to ${cachePath}`);
  } else {
    // Fall back to cached JSON
    const cachePath = path.join(DATA_DIR, "lgd-api-cache.json");
    if (fileExists(cachePath)) {
      console.log(`  → loading from cache: ${cachePath}`);
      const { readFileSync } = await import("node:fs");
      entities = JSON.parse(readFileSync(cachePath, "utf-8"));
    } else {
      console.log(`\n❌ LGD API unavailable and no cache found.`);
      console.log(`   Options:`);
      console.log(`   1. Visit https://lgdirectory.gov.in/ and download district list`);
      console.log(`   2. Save as scripts/ingest/data/lgd-api-cache.json`);
      console.log(`   3. Re-run this script.`);
      console.log(`\n   (The district canonicalization will still work using`);
      console.log(`    the normalizeDistrictName() helper in _shared.ts)`);
      return;
    }
  }

  if (DRY_RUN) {
    console.log(`\n   (dry run — no DB writes)`);
    console.log(`   entities: ${entities.length} (sample 5):`);
    for (const e of entities.slice(0, 5)) {
      console.log(`     ${e.entityType} ${e.lgdCode} ${e.name} (${e.stateName})`);
    }
    return;
  }

  const prisma = await getPrisma();
  let created = 0;
  let updated = 0;

  for (const e of entities) {
    if (!e.lgdCode || !e.name) continue;
    try {
      const existing = await prisma.lGDLocation.findUnique({ where: { lgdCode: e.lgdCode } });
      if (existing) {
        await prisma.lGDLocation.update({
          where: { lgdCode: e.lgdCode },
          data: {
            name: e.name,
            nameCanonical: e.nameCanonical,
            parentCode: e.parentCode,
            stateName: e.stateName,
            districtName: e.districtName,
            blockName: e.blockName,
            latitude: e.latitude ?? undefined,
            longitude: e.longitude ?? undefined,
          },
        });
        updated++;
      } else {
        await prisma.lGDLocation.create({
          data: {
            lgdCode: e.lgdCode,
            entityType: e.entityType,
            name: e.name,
            nameCanonical: e.nameCanonical,
            parentCode: e.parentCode,
            stateName: e.stateName,
            districtName: e.districtName,
            blockName: e.blockName,
            latitude: e.latitude ?? undefined,
            longitude: e.longitude ?? undefined,
          },
        });
        created++;
      }
    } catch {
      // skip duplicates
    }
  }

  console.log(`\n✅ Done.`);
  console.log(`   created: ${created.toLocaleString()}`);
  console.log(`   updated: ${updated.toLocaleString()}`);

  // Stats
  const byType = await prisma.lGDLocation.groupBy({
    by: ["entityType"],
    _count: true,
  });
  console.log(`\n   By entity type:`);
  for (const r of byType) {
    console.log(`     ${r.entityType}: ${r._count.toLocaleString()}`);
  }

  // Build centroid cache
  const centroids = buildCentroids(entities);
  writeJSON(CENTROID_CACHE_PATH, Object.fromEntries(centroids));
  console.log(`\n   centroid cache: ${centroids.size} entries → ${CENTROID_CACHE_PATH}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 LGD ingest failed:", e);
  process.exit(1);
});
