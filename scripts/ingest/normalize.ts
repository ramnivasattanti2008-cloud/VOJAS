/**
 * Post-ingest normalization.
 *
 * After lgd, vonter, dataful, and opencity are loaded:
 *   1. For each Project missing districtId/stateId, match `district` +
 *      `state` against LGDLocation, then link to the District row with
 *      that lgdCode. Requires `ingest:lgd` to have populated District
 *      rows with real lgdCode values first — otherwise this is a no-op.
 *   2. For each Vendor, recompute totalValue/totalContracts from the
 *      Projects it's linked to (Project.vendorId, set by dataful.ts and
 *      opencity.ts at ingest time).
 *
 * Run:  pnpm run ingest:normalize
 */
import {
  getPrisma,
  normalizeDistrictName,
  normalizeStateName,
  Progress,
} from "./_shared.js";

async function main() {
  console.log(`🔧 Post-ingest normalization`);
  const prisma = await getPrisma();

  // ── 1. Project → LGD match ──
  console.log(`\n   1. Matching projects to LGD locations…`);
  const lgdDistricts = await prisma.lGDLocation.findMany({
    where: { entityType: "DISTRICT" },
  });
  const lgdByKey = new Map<string, { code: string; name: string; state: string }>();
  for (const d of lgdDistricts) {
    const key = `${d.nameCanonical}|${normalizeStateName(d.stateName || "")}`;
    if (!lgdByKey.has(key)) {
      lgdByKey.set(key, { code: d.lgdCode, name: d.name, state: d.stateName || "" });
    }
  }
  console.log(`     loaded ${lgdByKey.size} LGD districts`);

  // Project has no lgdDistrictCode/lgdStateCode columns — district/state
  // linkage is via districtId/stateId relations to the District/State
  // models, which carry the LGD code themselves (District.lgdCode).
  const districtByLgdCode = new Map<string, { id: string; stateId: string }>();
  for (const d of await prisma.district.findMany({ select: { id: true, lgdCode: true, stateId: true } })) {
    districtByLgdCode.set(d.lgdCode, { id: d.id, stateId: d.stateId });
  }

  const projects = await prisma.project.findMany({
    where: { OR: [{ districtId: null }, { stateId: null }] },
  });
  const progress = new Progress("     matching");
  let matched = 0;
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const key = `${normalizeDistrictName(p.district)}|${normalizeStateName(p.state)}`;
    const match = lgdByKey.get(key);
    const district = match ? districtByLgdCode.get(match.code) : undefined;
    if (district) {
      await prisma.project.update({
        where: { id: p.id },
        data: {
          districtId: district.id,
          stateId: district.stateId,
        },
      });
      matched++;
    }
    if (i % 200 === 0) progress.tick(i, projects.length);
  }
  progress.tick(projects.length, projects.length);
  console.log(`     ✓ matched ${matched.toLocaleString()} / ${projects.length.toLocaleString()}`);
  if (districtByLgdCode.size === 0) {
    console.log(`     ! 0 District rows have an lgdCode — run ingest:lgd first, then re-run normalize.`);
  }

  // ── 2. Vendor aggregates ──
  console.log(`\n   2. Recomputing vendor aggregates…`);
  // FinancialObservation.vendorId is a FK to Contractor, not Vendor (see
  // ingest scripts' comments) — real per-vendor spend isn't linkable via
  // that relation. Vendor.totalValue/totalContracts are instead recomputed
  // from Project.vendorId, which does point at Vendor and is set by
  // dataful.ts/opencity.ts at ingest time.
  const vendors = await prisma.vendor.findMany({ select: { id: true } });
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    const vendorProjects = await prisma.project.findMany({
      where: { vendorId: v.id },
      select: { approvedAmount: true, constituency: true, district: true },
    });
    const distinctPlaces = new Set<string>();
    let totalValue = 0;
    for (const p of vendorProjects) {
      totalValue += p.approvedAmount;
      distinctPlaces.add(`${p.constituency || ""}|${p.district || ""}`);
    }
    await prisma.vendor.update({
      where: { id: v.id },
      data: {
        totalValue,
        totalContracts: vendorProjects.length,
      },
    });
    if (i % 200 === 0) progress.tick(i, vendors.length);
  }
  progress.tick(vendors.length, vendors.length);
  console.log(`     ✓ updated ${vendors.length.toLocaleString()} vendors`);

  console.log(`\n✅ Done.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Normalize failed:", e);
  process.exit(1);
});
