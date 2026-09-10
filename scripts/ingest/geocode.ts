/**
 * Backfill Project.latitude / Project.longitude from district geocodes.
 *
 * The Vonter MPLADS export carries no coordinates, so every ingested project
 * had latitude = null. That leaves the map, marker clustering, the state/sector
 * map aggregations and the satellite scene search with nothing to work on —
 * /projects/:id/satellite returns NO_COORDINATES for all of them.
 *
 * This resolves the district a project is *actually recorded in* to that
 * district's capital coordinates (data.gov.in + Census 2011). It is derived
 * geography, not a surveyed site position, so every row it writes sets
 *
 *   locationSource = "DISTRICT_CENTROID"
 *
 * Consumers must treat that as district-level precision. Projects whose
 * district cannot be matched are left null rather than being placed somewhere
 * plausible — an unplaced project is honest, a wrongly placed one is not.
 *
 * Idempotent: only fills rows that have no coordinates yet, unless --force.
 *
 * Run:  pnpm exec tsx scripts/ingest/geocode.ts
 *   dry: pnpm exec tsx scripts/ingest/geocode.ts --dry-run
 */
import { getPrisma, Progress } from "./_shared.js";
import { DISTRICT_GEOCODES } from "./districtGeocodes.js";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const BATCH_SIZE = 500;
const LOCATION_SOURCE = "DISTRICT_CENTROID";

/** Normalise a district or state name for matching: letters and digits only. */
function key(s: string): string {
  return s
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Districts are matched within their state, because district names repeat
 * across states (Aurangabad exists in both Bihar and Maharashtra, Bilaspur in
 * both Chhattisgarh and Himachal Pradesh). A state-blind match would place
 * projects in the wrong half of the country.
 */
function buildIndex() {
  const byStateDistrict = new Map<string, { lat: number; lng: number }>();
  for (const d of DISTRICT_GEOCODES) {
    byStateDistrict.set(`${key(d.state)}::${key(d.name)}`, { lat: d.lat, lng: d.lng });
  }
  return byStateDistrict;
}

async function main() {
  console.log(`📍 Geocode backfill: Project.latitude/longitude from district capitals`);
  console.log(`   reference districts: ${DISTRICT_GEOCODES.length.toLocaleString()}`);
  if (DRY_RUN) console.log(`   (dry run — no DB writes)`);

  const prisma = await getPrisma();
  const index = buildIndex();

  // Paginate over every project by id and skip the ones already placed, rather
  // than filtering on latitude: null. Districts with no geocode stay null by
  // design, so a latitude-filtered query keeps returning them and the scan
  // never terminates.
  const total = await prisma.project.count();
  const alreadyPlaced = await prisma.project.count({ where: { NOT: { latitude: null } } });
  console.log(`   projects: ${total.toLocaleString()}  (already placed: ${alreadyPlaced.toLocaleString()})`);

  if (total === 0) {
    console.log(`\n✅ Nothing to do — every project already has coordinates.`);
    return;
  }

  const progress = new Progress("   geocode");
  let processed = 0;
  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  const unmatchedKeys = new Map<string, number>();

  let cursor: string | undefined;

  for (;;) {
    const page = await prisma.project.findMany({
      select: { id: true, district: true, state: true, latitude: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1].id;

    const batch = page.filter((p) => FORCE || p.latitude === null);
    skipped += page.length - batch.length;

    // Group by resolved coordinate so each distinct district is one UPDATE
    // covering every project in it, rather than one UPDATE per project.
    const groups = new Map<string, { lat: number; lng: number; ids: string[] }>();

    for (const p of batch) {
      const hit = index.get(`${key(p.state)}::${key(p.district)}`);
      if (!hit) {
        unmatched++;
        const k = `${p.state} / ${p.district}`;
        unmatchedKeys.set(k, (unmatchedKeys.get(k) ?? 0) + 1);
        continue;
      }
      const gk = `${hit.lat},${hit.lng}`;
      const g = groups.get(gk) ?? { lat: hit.lat, lng: hit.lng, ids: [] };
      g.ids.push(p.id);
      groups.set(gk, g);
      matched++;
    }

    if (!DRY_RUN) {
      for (const g of groups.values()) {
        await prisma.project.updateMany({
          where: { id: { in: g.ids } },
          data: { latitude: g.lat, longitude: g.lng, locationSource: LOCATION_SOURCE },
        });
      }
    }

    processed += page.length;
    progress.tick(Math.min(processed, total), total);
  }

  progress.tick(total, total);

  console.log(`\n✅ Done.`);
  console.log(`   scanned:     ${processed.toLocaleString()}`);
  console.log(`   geocoded:    ${matched.toLocaleString()}`);
  console.log(`   unmatched:   ${unmatched.toLocaleString()} (left null on purpose)`);
  console.log(`   skipped:     ${skipped.toLocaleString()} (already had coordinates)`);

  if (unmatchedKeys.size > 0) {
    const top = [...unmatchedKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log(`\n   Top unmatched districts (add these to districtGeocodes.ts):`);
    for (const [k, n] of top) console.log(`     ${n.toLocaleString().padStart(7)}  ${k}`);
  }

  if (!DRY_RUN) {
    const withCoords = await prisma.project.count({ where: { NOT: { latitude: null } } });
    const all = await prisma.project.count();
    const pct = all === 0 ? 0 : ((withCoords / all) * 100).toFixed(1);
    console.log(`\n   Projects with coordinates: ${withCoords.toLocaleString()} / ${all.toLocaleString()} (${pct}%)`);
  }
}

main()
  .catch((e) => {
    console.error(`💥 Geocode failed:`, e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = await getPrisma();
    await prisma.$disconnect();
  });
