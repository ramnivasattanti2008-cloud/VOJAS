/**
 * VOJAS — MP data enrichment from real 17th Lok Sabha dataset
 *
 * Sources:
 *   - Vonter/india-representatives-activity: 559 MPs with party, attendance,
 *     state, constituency, age, education, gender
 *   - OpenCity.in: 17th Lok Sabha MPLADS spending per MP
 *
 * What it does:
 *   1. Updates existing MP records with real party, attendance
 *   2. Creates new MP records for ones not in DB
 *   3. Links projects to MPs by matching name+constituency
 *
 * Run: cd backend && npx tsx scripts/ingest-mp-data.ts
 */

import { prisma, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";
import * as fs from "fs";

function parseDate(s: string | null | undefined): Date | null {
  if (!s || s === "In Office") return null;
  // Formats: DD-MM-YYYY or YYYY-MM-DD
  const parts = s.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) return new Date(s);
    if (parts[2].length === 4) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return null;
}

function normalizeName(s: string): string {
  return s.toUpperCase().trim().replace(/\s+/g, " ").replace(/[^A-Z ]/g, "");
}

function normalizeConstituency(s: string): string {
  return s.toUpperCase().trim().replace(/\s+/g, " ");
}

async function main() {
  const mpsRaw = JSON.parse(fs.readFileSync("mps_17th.json", "utf-8"));
  logger.info(`Loaded ${mpsRaw.length} MPs from 17th Lok Sabha dataset`);

  // Get existing MPs from DB
  const existingMPs = await prisma.mP.findMany({
    where: { term: "SEVENTEENTH" },
  });
  logger.info(`Found ${existingMPs.length} existing 17th Lok Sabha MPs in DB`);

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const raw of mpsRaw) {
    const name = raw.Name?.trim();
    if (!name) { skipped++; continue; }

    const state = (raw.State || "Unknown").trim();
    const constituency = (raw.Constituency || "Unknown").trim();
    const party = raw.Party || null;
    const attendance = raw.Attendance || null;
    const termStart = parseDate(raw["Start of Term"]);
    const termEnd = parseDate(raw["End of Term"]);

    const normName = normalizeName(name);
    const normConst = normalizeConstituency(constituency);

    // Try to find existing MP (matching by normalized name + constituency)
    const existing = existingMPs.find(
      (m) => normalizeName(m.name) === normName && normalizeConstituency(m.constituency) === normConst
    );

    if (existing) {
      // Update with real data
      await prisma.mP.update({
        where: { id: existing.id },
        data: {
          party: party ?? existing.party,
          attendance: attendance ?? existing.attendance,
          termStart: termStart ?? existing.termStart,
          termEnd: termEnd ?? existing.termEnd,
          state: state,
        },
      });
      updated++;
    } else {
      // Create new MP
      try {
        await prisma.mP.create({
          data: {
            name,
            house: "LOK_SABHA",
            state: state.toUpperCase(),
            constituency,
            term: "SEVENTEENTH",
            termStart,
            termEnd,
            party,
            attendance,
          },
        });
        created++;
      } catch (e: any) {
        // Duplicate constraint
        if (e?.code === "P2002") {
          skipped++;
        } else {
          logger.error(`Failed to create MP ${name}: ${e?.message}`);
          skipped++;
        }
      }
    }
  }

  logger.info(`MP enrichment complete: ${updated} updated, ${created} created, ${skipped} skipped`);

  // ── Link projects to MPs ────────────────────────────────────────────────
  logger.info("Linking projects to MPs...");

  // Build a name → MP map for fast lookup
  const allMPs = await prisma.mP.findMany({ where: { term: "SEVENTEENTH" } });
  const mpByNameAndConst = new Map<string, string>();
  const mpByNameOnly = new Map<string, string>();
  for (const mp of allMPs) {
    const key = `${normalizeName(mp.name)}|${normalizeConstituency(mp.constituency)}`;
    mpByNameAndConst.set(key, mp.id);
    // For "name only" lookups, prefer longest constituency
    if (!mpByNameOnly.has(normalizeName(mp.name)) ||
        (mpByNameOnly.get(normalizeName(mp.name))?.length ?? 0) < mp.constituency.length) {
      mpByNameOnly.set(normalizeName(mp.name), mp.id);
    }
  }

  // Find projects with mpName but no mpId
  const unlinkedProjects = await prisma.project.findMany({
    where: { mpId: null, mpName: { not: null } },
    select: { id: true, mpName: true, constituency: true, state: true },
    take: 60000,
  });
  logger.info(`Found ${unlinkedProjects.length} unlinked projects`);

  let linked = 0;
  let failed = 0;
  const batchSize = 500;
  const updates: Array<{ id: string; mpId: string }> = [];

  for (const p of unlinkedProjects) {
    if (!p.mpName) { failed++; continue; }
    const normName = normalizeName(p.mpName);
    let mpId: string | undefined;

    // Try name + constituency first
    if (p.constituency) {
      const key = `${normName}|${normalizeConstituency(p.constituency)}`;
      mpId = mpByNameAndConst.get(key);
    }

    // Fallback: name only
    if (!mpId) {
      mpId = mpByNameOnly.get(normName);
    }

    if (mpId) {
      updates.push({ id: p.id, mpId });
      linked++;
    } else {
      failed++;
    }
  }

  // Bulk update via raw queries (batches of 500)
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    // Use individual updates for simplicity (Prisma doesn't support bulk conditional updates)
    for (const { id, mpId } of batch) {
      await prisma.project.update({ where: { id }, data: { mpId } });
    }
    if (i % 5000 === 0) {
      logger.info(`Linked ${Math.min(i + batchSize, updates.length)}/${updates.length} projects...`);
    }
  }
  logger.info(`Linked ${linked} projects to MPs, ${failed} could not be linked`);

  // Final stats
  const finalMPs = await prisma.mP.count({ where: { term: "SEVENTEENTH" } });
  const finalProjectsWithMP = await prisma.project.count({ where: { mpId: { not: null } } });
  const finalParties = await prisma.mP.groupBy({
    by: ["party"],
    _count: true,
    where: { term: "SEVENTEENTH" },
  });

  logger.info(`=== Final MP Stats ===`);
  logger.info(`17th Lok Sabha MPs: ${finalMPs}`);
  logger.info(`Projects with MP: ${finalProjectsWithMP}`);
  logger.info(`Top parties: ${finalParties
    .sort((a, b) => b._count - a._count)
    .slice(0, 10)
    .map(p => `${p.party}(${p._count})`)
    .join(", ")}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
