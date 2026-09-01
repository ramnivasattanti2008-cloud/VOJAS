/**
 * Ingest: github.com/Vonter/india-mplads-works
 *
 * Source: 60,359 MPLADS work recommendations, single-day snapshot (2024-03-04).
 *   - Includes Rajya Sabha (14,011 rows) — unique to this source.
 *   - ALLOCATION AMOUNT is in raw rupees (not crore).
 *   - Status is a recommendation-stage status, not execution status.
 *
 * This is a recommendation snapshot. Each row is created as a Project with
 * status: PROPOSED|UNSANCTIONED|APPROVED|IN_PROGRESS|COMPLETED (mapped).
 * No Expenditure or Vendor records are created from this source — those
 * come from dataful and opencity.
 *
 * Idempotency: keyed on (source: VONTER, sourceWorkId: row index in CSV).
 *
 * Run:  npm run ingest:vonter
 *   or: npx tsx scripts/ingest/vonter.ts
 *   dry: npx tsx scripts/ingest/vonter.ts --dry-run
 */
import {
  DATA_DIR,
  categoryToSector,
  fileExists,
  inferHouseFromValue,
  mapIdaApproval,
  mapStatus,
  normalizeStateName,
  parseCSV,
  parseIndianDate,
  rupeesToFloat,
  slugify,
  toLokSabhaTerm,
  Progress,
} from "./_shared.js";
import path from "node:path";
import { getPrisma } from "./_shared.js";

const SOURCE = "VONTER";
const CSV_PATH = path.join(DATA_DIR, "MPLADS.csv");
const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  if (!fileExists(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    console.error(`   Download from: https://github.com/Vonter/india-mplads-works`);
    console.error(`   Save to: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`📥 Ingest: Vonter/india-mplads-works → Project (status: recommendation)`);
  console.log(`   file: ${CSV_PATH}`);

  const prisma = await getPrisma();

  // ── Pass 1: count rows + sanity check ──
  let totalRows = 0;
  for await (const _row of parseCSV(CSV_PATH, ";")) totalRows++;
  const dataRows = totalRows - 1; // subtract header
  console.log(`   rows: ${dataRows.toLocaleString()}`);

  if (DRY_RUN) {
    console.log(`\n   (dry run — no DB writes)`);
    let i = 0;
    for await (const row of parseCSV(CSV_PATH, ";")) {
      if (i > 3) break;
      if (i === 0) {
        console.log(`   columns: ${row.join(" | ")}`);
      } else {
        console.log(`   sample[${i}]: MP=${row[0]} STATE=${row[3]} AMT=${row[11]}`);
      }
      i++;
    }
    return;
  }

  // ── Pass 2: ingest ──
  const progress = new Progress("   ingest");
  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const mpCache = new Map<string, string>(); // key = "slugName|slugConst|term" → MP id
  const sectorCache = new Map<string, string>();

  let rowsBuffer: any[] = [];
  let lineNum = 0;

  /**
   * Bulk flush — one bulk find + createMany + updateMany per batch.
   * Cuts ~1,000 queries/batch down to 3 queries/batch.
   */
  async function flushBatch() {
    if (!rowsBuffer.length) return;

    const batch = rowsBuffer;
    rowsBuffer = [];

    // 1. Bulk lookup: which sourceWorkIds already exist?
    const ids = batch.map((p) => p.sourceWorkId);
    const existing = await prisma.project.findMany({
      where: { source: SOURCE, sourceWorkId: { in: ids } },
      select: { sourceWorkId: true, id: true },
    });
    const existingIds = new Set(existing.map((e) => e.sourceWorkId));
    const existingIdMap = new Map(existing.map((e) => [e.sourceWorkId, e.id]));

    const toCreate = batch.filter((p) => !existingIds.has(p.sourceWorkId));
    const toUpdate = batch.filter((p) => existingIds.has(p.sourceWorkId));

    // 2. Bulk insert new rows
    if (toCreate.length > 0) {
      // SQLite: createMany does NOT support skipDuplicates.
      // Bulk insert all; duplicates hit the unique-constraint error and are skipped.
      try {
        await prisma.project.createMany({ data: toCreate });
        created += toCreate.length;
      } catch (e: any) {
        if (e.code === "P2002") {
          // Partial failure from duplicate key — insert one-by-one to isolate bad rows
          for (const proj of toCreate) {
            try {
              await prisma.project.create({ data: proj });
              created++;
            } catch (e2: any) {
              errors++;
              if (errors <= 3) console.log(`\n   ! create failed: ${e2.message?.slice(0, 120)}`);
            }
          }
        } else {
          // Unknown error — fallback to per-row
          for (const proj of toCreate) {
            try {
              await prisma.project.create({ data: proj });
              created++;
            } catch (e2: any) {
              errors++;
              if (errors <= 3) console.log(`\n   ! create failed: ${e2.message?.slice(0, 120)}`);
            }
          }
        }
      }
    }

    // 3. Bulk update existing rows
    if (toUpdate.length > 0) {
      for (const proj of toUpdate) {
        try {
          await prisma.project.update({
            where: { id: existingIdMap.get(proj.sourceWorkId)! },
            data: proj,
          });
          updated++;
        } catch (e: any) {
          errors++;
          if (errors <= 3) console.log(`\n   ! update failed: ${e.message?.slice(0, 120)}`);
        }
      }
    }

    processed += batch.length;
    progress.tick(processed, dataRows);
  }

  for await (const row of parseCSV(CSV_PATH, ";")) {
    lineNum++;
    if (lineNum === 1) continue; // skip header

    const [
      mpName,
      workDesc,
      category,
      state,
      constituency,
      ida,
      city,
      ward,
      block,
      village,
      recommendedDate,
      allocationAmount,
      idaApproval,
      status,
      house,
    ] = row;

    if (!mpName || !state || !allocationAmount) {
      skipped++;
      continue;
    }

    const sector = sectorCache.get(category) || categoryToSector(category);
    sectorCache.set(category, sector);

    // MP cache — upsert once, reuse id
    const mpKey = `${slugify(mpName)}|${slugify(constituency)}|EIGHTEENTH`;
    let mpId = mpCache.get(mpKey);
    if (!mpId) {
      const mp = await prisma.mP.upsert({
        where: {
          name_constituency_term: {
            name: mpName.trim(),
            constituency: (constituency || "").trim(),
            term: "EIGHTEENTH" as const,
          },
        },
        update: {},
        create: {
          name: mpName.trim(),
          house: inferHouseFromValue(house) as any,
          state: normalizeStateName(state),
          constituency: (constituency || "").trim(),
          term: "EIGHTEENTH" as const,
        },
      });
      mpId = mp.id;
      mpCache.set(mpKey, mpId);
    }

    const recDate = parseIndianDate(recommendedDate);
    const termFromDate = recDate ? toLokSabhaTerm(recDate.getFullYear()) : "EIGHTEENTH";

    rowsBuffer.push({
      source: SOURCE,
      sourceWorkId: String(lineNum),
      sourceRef: JSON.stringify({
        mpName, workDesc, category, state, constituency,
        ida, city, ward, block, village,
        recommendedDate, allocationAmount, idaApproval, status, house,
      }),
      name: workDesc.slice(0, 200),
      description: `${workDesc}\n\nBlock: ${block || "—"}\nVillage: ${village || "—"}\nIDA: ${ida || "—"}\nRecommended: ${recommendedDate}`,
      status: mapStatus(status) as any,
      sector: sector as any,
      district: (() => {
        if (!ida) return (block || village || "—").trim();
        const cleaned = ida
          .replace(/_IDA$/, "")
          .replace(/^(DISTRICT COLLECTOR|DISTRICT MAGISTRATE|DEPUTY COMMISSIONER|DEP COMM|DISTRICT PLANNING OFFICER|COLLECTOR)\s+/i, "")
          .replace(/^District\s+/i, "")
          .trim();
        return cleaned || state;
      })(),
      constituency: (constituency || "").trim() || null,
      state: normalizeStateName(state),
      approvedAmount: rupeesToFloat(allocationAmount),
      spentAmount: 0,
      mpId,
      mpName: mpName.trim(),
      house: inferHouseFromValue(house) as any,
      term: termFromDate as any,
      implementingAgency: (ida || "").trim() || null,
      idaApproval: mapIdaApproval(idaApproval) as any,
      recommendedDate: recDate,
      contractor: null,
      startDate: null,
      expectedEndDate: null,
      completedAt: null,
    });

    if (rowsBuffer.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (rowsBuffer.length) {
    await flushBatch();
  }
  progress.tick(processed, dataRows);

  console.log(`\n✅ Done.`);
  console.log(`   rows processed: ${processed.toLocaleString()}`);
  console.log(`   created:       ${created.toLocaleString()}`);
  console.log(`   updated:       ${updated.toLocaleString()}`);
  console.log(`   skipped:       ${skipped.toLocaleString()}`);
  console.log(`   errors:        ${errors.toLocaleString()}`);

  // Summary by house
  const byHouse = await prisma.project.groupBy({
    by: ["house"],
    where: { source: SOURCE },
    _count: true,
    _sum: { approvedAmount: true },
  });
  console.log(`\n   By house:`);
  for (const r of byHouse) {
    console.log(`     ${r.house ?? "null"}: ${r._count.toLocaleString()} projects, ₹${(r._sum.approvedAmount ?? 0).toLocaleString()}`);
  }

  // Summary by state (top 10)
  const byState = await prisma.project.groupBy({
    by: ["state"],
    where: { source: SOURCE },
    _count: true,
    _sum: { approvedAmount: true },
    orderBy: { _count: { state: "desc" } },
    take: 10,
  });
  console.log(`\n   Top 10 states:`);
  for (const r of byState) {
    console.log(`     ${r.state}: ${r._count.toLocaleString()} projects, ₹${((r._sum.approvedAmount ?? 0) / 1_00_00_000).toFixed(2)} Cr`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Ingest failed:", e);
  process.exit(1);
});
