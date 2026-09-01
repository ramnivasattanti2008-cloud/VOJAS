/**
 * Ingest: dataful.in/datasets/22565 (18th Lok Sabha MPLADS expenditures)
 *
 * 96,541 rows · 13 cols · 2024-2026 actual expenditure transactions
 * Columns: data_as_on, state, implementing_district, loksabha_constituency,
 *   loksabha_MP_name, work, implementing_agency_name, vendor_name,
 *   expenditure_date, payment_status, expenditure_amount, units, notes
 *
 * CRITICAL: `expenditure_amount` is in ₹ CRORE — multiply by 10,000,000
 * to convert to raw rupees (which is what Prisma stores).
 *
 * Has 14,754 unique vendor names — the source of truth for Vendor model.
 *
 * Idempotency:
 *   - MP: unique on (name, constituency, term=EIGHTEENTH)
 *   - Project: unique on (source, sourceWorkId) — we use line number
 *   - Vendor: unique on (nameNormalized, state)
 *   - Expenditure: unique on (source, sourceTxnId)
 *
 * Run:  npm run ingest:dataful
 *   dry: npx tsx scripts/ingest/dataful.ts --dry-run
 */
import {
  DATA_DIR,
  croreToRupees,
  downloadWithRetry,
  ensureDir,
  fileExists,
  inferSector,
  normalizeStateName,
  parseCSV,
  parseIndianDate,
  slugify,
  Progress,
  getPrisma,
} from "./_shared.js";
import path from "node:path";

const SOURCE = "DATAFUL";
const DATA_URL =
  process.env.DATAFUL_CSV_URL ||
  "https://dataful.in/dataset/lok-sabha-mp-local-area-development-funds-details/download";
const LOCAL_PATH = path.join(DATA_DIR, "dataful-18th-lok-sabha.csv");
const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`📥 Ingest: dataful.in 18th Lok Sabha → Project + Vendor + Expenditure`);
  console.log(`   url: ${DATA_URL}`);

  if (!fileExists(LOCAL_PATH)) {
    console.log(`   local cache miss — downloading...`);
    const ok = await downloadWithRetry(DATA_URL, LOCAL_PATH, {
      label: "dataful 18th Lok Sabha",
      timeoutMs: 120_000,
    });
    if (!ok) {
      console.error(`\n❌ Download failed. Manual fallback:`);
      console.error(`   1. Visit https://dataful.in/datasets/22565/`);
      console.error(`   2. Click "Download CSV"`);
      console.error(`   3. Save to: ${LOCAL_PATH}`);
      console.error(`   4. Re-run this script.`);
      process.exit(1);
    }
  } else {
    console.log(`   ✓ using cached: ${LOCAL_PATH}`);
  }

  const prisma = await getPrisma();

  // ── Detect delimiter & columns ──
  let firstRow: string[] | null = null;
  for await (const r of parseCSV(LOCAL_PATH, ",")) {
    firstRow = r;
    break;
  }
  if (!firstRow) {
    console.error("❌ Empty CSV");
    process.exit(1);
  }
  const cols = firstRow.map((c) => c.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_"));
  console.log(`   columns: ${cols.join(" | ")}`);

  const col = (name: string) => cols.findIndex((c) => c === name || c.includes(name));
  const iState = col("state");
  const iDistrict = col("implementing_district");
  const iConstituency = col("loksabha_constituency");
  const iMP = col("loksabha_mp_name");
  const iWork = col("work");
  const iAgency = col("implementing_agency_name");
  const iVendor = col("vendor_name");
  const iDate = col("expenditure_date");
  const iStatus = col("payment_status");
  const iAmount = col("expenditure_amount");

  if (iState < 0 || iMP < 0 || iAmount < 0) {
    console.error("❌ Required columns not found (state, loksabha_mp_name, expenditure_amount).");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`\n   (dry run — no DB writes)`);
    let i = 0;
    for await (const r of parseCSV(LOCAL_PATH, ",")) {
      if (i > 3) break;
      console.log(`   sample[${i}]: MP=${r[iMP]} | amount=${r[iAmount]} (₹${croreToRupees(r[iAmount]).toLocaleString()})`);
      i++;
    }
    return;
  }

  // ── Count rows ──
  let totalRows = 0;
  for await (const _ of parseCSV(LOCAL_PATH, ",")) totalRows++;
  const dataRows = totalRows - 1;
  console.log(`   rows: ${dataRows.toLocaleString()}`);

  // ── Ingest ──
  const progress = new Progress("   ingest");
  let processed = 0;
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let expendituresCreated = 0;
  let vendorsCreated = 0;
  let mpsCreated = 0;
  let skipped = 0;

  const mpCache = new Map<string, string>();
  const vendorCache = new Map<string, string>(); // key: nameNormalized|state → vendorId
  const projectCache = new Map<string, string>(); // key: sourceWorkId → projectId

  // Buffer expenditures to batch-create with proper FKs
  const expBuffer: any[] = [];
  let lineNum = 0;

  async function flush() {
    if (!expBuffer.length) return;
    // Bulk look up which sourceTxnIds already exist
    const ids = expBuffer.map((e) => e.sourceTxnId);
    const existing = await prisma.expenditure.findMany({
      where: { source: SOURCE, sourceTxnId: { in: ids } },
      select: { sourceTxnId: true, id: true },
    });
    const existingIds = new Map(existing.map((e) => [e.sourceTxnId, e.id]));
    const toCreate = expBuffer.filter((e) => !existingIds.has(e.sourceTxnId));
    const toUpdate = expBuffer.filter((e) => existingIds.has(e.sourceTxnId));

    if (toCreate.length > 0) {
      try {
        // SQLite: createMany does NOT support skipDuplicates; on partial dup fail, fall back
        await prisma.expenditure.createMany({ data: toCreate });
        expendituresCreated += toCreate.length;
      } catch (err: any) {
        // Partial dup-failure (P2002) — insert one-by-one
        for (const e of toCreate) {
          try {
            await prisma.expenditure.create({ data: e });
            expendituresCreated++;
          } catch (e2: any) {
            skipped++;
            if (skipped <= 3) {
              console.log(`\n   ! skipped txn ${e.sourceTxnId}: ${e2.message?.slice(0, 200)}`);
            }
          }
        }
      }
    }

    for (const e of toUpdate) {
      try {
        await prisma.expenditure.update({
          where: { id: existingIds.get(e.sourceTxnId)! },
          data: e,
        });
        expendituresCreated++;
      } catch (e2: any) {
        skipped++;
      }
    }
    expBuffer.length = 0;
  }
      }
    });
    expBuffer.length = 0;
  }

  for await (const row of parseCSV(LOCAL_PATH, ",")) {
    lineNum++;
    if (lineNum === 1) continue;

    const state = (row[iState] || "").trim();
    const district = (row[iDistrict] || "").trim();
    const constituency = (row[iConstituency] || "").trim();
    const mpName = (row[iMP] || "").trim();
    const workDesc = (row[iWork] || "").trim();
    const agency = (row[iAgency] || "").trim();
    const vendorName = (row[iVendor] || "").trim();
    const expDate = parseIndianDate(row[iDate]);
    const paymentStatus = (row[iStatus] || "").trim();
    const amount = croreToRupees(row[iAmount]);

    if (!mpName || !state || !amount) {
      skipped++;
      continue;
    }

    // ── MP ──
    const mpKey = `${slugify(mpName)}|${slugify(constituency)}|EIGHTEENTH`;
    let mpId = mpCache.get(mpKey);
    if (!mpId) {
      const mp = await prisma.mP.upsert({
        where: {
          name_constituency_term: {
            name: mpName,
            constituency: constituency || "—",
            term: "EIGHTEENTH" as const,
          },
        },
        update: {},
        create: {
          name: mpName,
          house: "LOK_SABHA" as any,
          state: normalizeStateName(state),
          constituency: constituency || "—",
          term: "EIGHTEENTH" as const,
        },
      });
      mpId = mp.id;
      mpCache.set(mpKey, mpId);
      mpsCreated++;
    }

    // ── Project (one per unique work per MP) ──
    const projKey = `${lineNum}`; // use line number as sourceWorkId for simplicity
    let projectId = projectCache.get(projKey);
    if (!projectId) {
      const sector = inferSector(workDesc);
      const existing = await prisma.project.findFirst({
        where: { source: SOURCE, sourceWorkId: projKey },
      });
      if (existing) {
        projectId = existing.id;
        projectsUpdated++;
      } else {
        const created = await prisma.project.create({
          data: {
            source: SOURCE,
            sourceWorkId: projKey,
            name: workDesc.slice(0, 200),
            description: workDesc,
            status: "IN_PROGRESS" as any,
            sector: sector as any,
            district: district || state,
            constituency: constituency || null,
            state: normalizeStateName(state),
            approvedAmount: amount,
            spentAmount: amount,
            mpId,
            mpName,
            house: "LOK_SABHA" as any,
            term: "EIGHTEENTH" as any,
            implementingAgency: agency || null,
            startDate: expDate,
            recommendedDate: expDate,
          },
        });
        projectId = created.id;
        projectsCreated++;
      }
      projectCache.set(projKey, projectId);
    }

    // ── Vendor ──
    let vendorId: string | null = null;
    if (vendorName) {
      const { normalizeVendorName } = await import("./_shared.js");
      const norm = normalizeVendorName(vendorName);
      if (norm) {
        const vKey = `${norm}|${normalizeStateName(state)}`;
        vendorId = vendorCache.get(vKey) || null;
        if (!vendorId) {
          const existing = await prisma.vendor.findFirst({
            where: { nameNormalized: norm, state: normalizeStateName(state) },
          });
          if (existing) {
            vendorId = existing.id;
            await prisma.vendor.update({
              where: { id: existing.id },
              data: {
                totalPaid: existing.totalPaid + amount,
                projectCount: existing.projectCount + 1,
              },
            });
          } else {
            const created = await prisma.vendor.create({
              data: {
                name: vendorName,
                nameNormalized: norm,
                state: normalizeStateName(state),
                district: district || null,
                totalPaid: amount,
                projectCount: 1,
              },
            });
            vendorId = created.id;
            vendorsCreated++;
          }
          vendorCache.set(vKey, vendorId);
        }
      }
    }

    // ── Expenditure ──
    expBuffer.push({
      source: SOURCE,
      sourceTxnId: String(lineNum),
      sourceRef: JSON.stringify(row),
      projectId,
      amount,
      category: "OTHER" as any,
      description: workDesc.slice(0, 500),
      vendor: vendorName || null,
      vendorId,
      paidOn: expDate,
      expenditureDate: expDate,
      paymentStatus: paymentStatus || null,
      status: paymentStatus.toLowerCase().includes("success")
        ? ("PAID" as any)
        : ("PENDING" as any),
    });

    processed++;
    if (expBuffer.length >= BATCH_SIZE) {
      await flush();
    }
    if (processed % 2000 === 0) progress.tick(processed, dataRows);
  }

  await flush();
  progress.tick(processed, dataRows);

  console.log(`\n✅ Done.`);
  console.log(`   projects:  created=${projectsCreated.toLocaleString()} updated=${projectsUpdated.toLocaleString()}`);
  console.log(`   expenditures: created=${expendituresCreated.toLocaleString()}`);
  console.log(`   vendors:   created=${vendorsCreated.toLocaleString()}`);
  console.log(`   mps:       created=${mpsCreated.toLocaleString()}`);
  console.log(`   skipped:   ${skipped.toLocaleString()}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Ingest failed:", e);
  process.exit(1);
});
