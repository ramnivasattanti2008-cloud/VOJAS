/**
 * Post-ingest normalization.
 *
 * After Vonter, dataful, and opencity are loaded:
 *   1. For each Project missing lgdDistrictCode, attempt to match
 *      `district` + `state` against LGDLocation.nameCanonical.
 *   2. For each Vendor, recompute totalPaid, projectCount, constituencyCount.
 *   3. For each MP, recompute aggregate project count.
 *
 * Run:  npm run ingest:normalize
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

  const projects = await prisma.project.findMany({
    where: { OR: [{ lgdDistrictCode: null }, { lgdStateCode: null }] },
  });
  const progress = new Progress("     matching");
  let matched = 0;
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const key = `${normalizeDistrictName(p.district)}|${normalizeStateName(p.state)}`;
    const match = lgdByKey.get(key);
    if (match) {
      await prisma.project.update({
        where: { id: p.id },
        data: {
          lgdDistrictCode: match.code,
          lgdStateCode: lgdDistricts.find((d) => d.lgdCode === match.code && d.parentCode)?.parentCode ?? null,
        },
      });
      matched++;
    }
    if (i % 200 === 0) progress.tick(i, projects.length);
  }
  progress.tick(projects.length, projects.length);
  console.log(`     ✓ matched ${matched.toLocaleString()} / ${projects.length.toLocaleString()}`);

  // ── 2. Vendor aggregates ──
  console.log(`\n   2. Recomputing vendor aggregates…`);
  const vendors = await prisma.vendor.findMany({ select: { id: true } });
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    const [totalPaid, projectCount, distinctConst] = await Promise.all([
      prisma.expenditure.aggregate({
        where: { vendorId: v.id },
        _sum: { amount: true },
      }),
      prisma.expenditure.findMany({
        where: { vendorId: v.id },
        distinct: ["projectId"],
        select: { projectId: true },
      }),
      prisma.expenditure.findMany({
        where: { vendorId: v.id },
        select: { project: { select: { constituency: true, district: true } } },
      }),
    ]);
    const distinctPlaces = new Set<string>();
    for (const e of distinctConst) {
      const k = `${e.project?.constituency || ""}|${e.project?.district || ""}`;
      distinctPlaces.add(k);
    }
    await prisma.vendor.update({
      where: { id: v.id },
      data: {
        totalPaid: totalPaid._sum.amount || 0,
        projectCount: projectCount.length,
        constituencyCount: distinctPlaces.size,
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
