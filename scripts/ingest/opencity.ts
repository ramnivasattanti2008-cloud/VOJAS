/**
 * Ingest: data.opencity.in (Lok Sabha MPLADS funds 15th/16th/17th)
 *
 * Historical expenditure data covering 2009-2024 across 3 Lok Sabha terms.
 * Each CSV lives behind a stable URL.
 *
 * The exact column schema is unknown in advance — opencity is the source
 * we couldn't reach via WebFetch (502). The script auto-detects:
 *   - state, district, constituency, mp_name, work, vendor/agency, amount, date
 * by matching column names case-insensitively.
 *
 * Idempotent: same as dataful.ts (MP unique on name+constituency+term,
 * Project unique on source+sourceWorkId, Expenditure unique on source+sourceTxnId).
 *
 * Run:  npm run ingest:opencity
 *   dry: npx tsx scripts/ingest/opencity.ts --dry-run
 */
import {
  DATA_DIR,
  batch,
  croreToRupees,
  downloadWithRetry,
  ensureDir,
  fileExists,
  inferSector,
  normalizeStateName,
  parseCSV,
  parseIndianDate,
  rupeesToFloat,
  slugify,
  Progress,
  getPrisma,
} from "./_shared.js";
import path from "node:path";

type Term = "FIFTEENTH" | "SIXTEENTH" | "SEVENTEENTH";
const SOURCES: Array<{
  term: Term;
  url: string;
  file: string;
  years: string;
}> = [
  {
    term: "FIFTEENTH",
    url: "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/0b894524-3708-41ec-896e-7a5e8d15c2f3/download/cfa8c46b-1bb0-4d8a-b149-2d1d53ad0826.csv",
    file: "opencity-15th-lok-sabha.csv",
    years: "2009-2014",
  },
  {
    term: "SIXTEENTH",
    url: "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/57baaa96-04ca-4328-86bc-17b455af1024/download/d6a40c40-f0bb-44d7-b697-fd4d74ffefd3.csv",
    file: "opencity-16th-lok-sabha.csv",
    years: "2014-2019",
  },
  {
    term: "SEVENTEENTH",
    url: "https://data.opencity.in/dataset/0844e65b-76ff-422b-a213-2495aec592d9/resource/e4524ed7-6c9b-41a5-ad0a-003358fdabca/download/4d2bc892-cd12-4f17-befa-aa7efb6e210b.csv",
    file: "opencity-17th-lok-sabha.csv",
    years: "2019-2024",
  },
];

const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");

// Heuristics: find the most likely column index for each required field.
function pickColumn(cols: string[], names: string[]): number {
  for (const want of names) {
    const idx = cols.findIndex((c) => c === want || c.includes(want));
    if (idx >= 0) return idx;
  }
  return -1;
}

async function ingestTerm(
  prisma: any,
  source: typeof SOURCES[number],
): Promise<{ rows: number; projects: number; expenditures: number; vendors: number; mps: number; skipped: number }> {
  const localPath = path.join(DATA_DIR, source.file);
  console.log(`\n📦 ${source.term} (${source.years})`);
  console.log(`   url: ${source.url}`);

  if (!fileExists(localPath)) {
    const ok = await downloadWithRetry(source.url, localPath, {
      label: source.file,
      timeoutMs: 120_000,
    });
    if (!ok) {
      console.log(`   ! cannot download ${source.term}, skipping.`);
      console.log(`     place ${source.file} in scripts/ingest/data/ to retry.`);
      return { rows: 0, projects: 0, expenditures: 0, vendors: 0, mps: 0, skipped: 0 };
    }
  } else {
    console.log(`   ✓ cached: ${localPath}`);
  }

  // Detect columns
  let firstRow: string[] | null = null;
  for (const r of parseCSV(localPath, ",")) {
    firstRow = r;
    break;
  }
  if (!firstRow) return { rows: 0, projects: 0, expenditures: 0, vendors: 0, mps: 0, skipped: 0 };

  const cols = firstRow.map((c) => c.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_"));
  const iState = pickColumn(cols, ["state"]);
  const iDistrict = pickColumn(cols, ["district", "implementing_district"]);
  const iConstituency = pickColumn(cols, ["constituency", "loksabha_constituency", "parliamentary_constituency"]);
  const iMP = pickColumn(cols, ["mp_name", "loksabha_mp_name", "member_name"]);
  const iWork = pickColumn(cols, ["work", "project_name", "work_description"]);
  const iVendor = pickColumn(cols, ["vendor", "vendor_name", "implementing_agency", "agency"]);
  const iAmount = pickColumn(cols, ["amount", "expenditure_amount", "sanctioned_amount", "allocation"]);
  const iDate = pickColumn(cols, ["date", "expenditure_date", "transaction_date", "paid_on"]);

  if (iState < 0 || iMP < 0) {
    console.log(`   ! missing required columns (state, mp). Got: ${cols.join(", ")}`);
    return { rows: 0, projects: 0, expenditures: 0, vendors: 0, mps: 0, skipped: 0 };
  }
  console.log(`   columns: state@${iState} mp@${iMP} district@${iDistrict} const@${iConstituency} work@${iWork} vendor@${iVendor} amount@${iAmount} date@${iDate}`);

  if (DRY_RUN) {
    let i = 0;
    for (const r of parseCSV(localPath, ",")) {
      if (i > 3) break;
      console.log(`   sample[${i}]: MP=${r[iMP]} | state=${r[iState]}`);
      i++;
    }
    return { rows: 0, projects: 0, expenditures: 0, vendors: 0, mps: 0, skipped: 0 };
  }

  // Count rows
  let totalRows = 0;
  for (const _ of parseCSV(localPath, ",")) totalRows++;
  const dataRows = totalRows - 1;
  console.log(`   rows: ${dataRows.toLocaleString()}`);

  const progress = new Progress("   ingest");
  let processed = 0;
  let projectsCreated = 0;
  let expendituresCreated = 0;
  let vendorsCreated = 0;
  let mpsCreated = 0;
  let skipped = 0;

  const mpCache = new Map<string, string>();
  const vendorCache = new Map<string, string>();
  const expBuffer: any[] = [];
  let lineNum = 0;

  async function flush() {
    if (!expBuffer.length) return;
    await batch(expBuffer, BATCH_SIZE, async (chunk) => {
      for (const e of chunk) {
        try {
          await prisma.expenditure.upsert({
            where: { source_sourceTxnId: { source: e.source, sourceTxnId: e.sourceTxnId } },
            update: e,
            create: e,
          });
          expendituresCreated++;
        } catch {
          skipped++;
        }
      }
    });
    expBuffer.length = 0;
  }

  for (const row of parseCSV(localPath, ",")) {
    lineNum++;
    if (lineNum === 1) continue;

    const state = (row[iState] || "").trim();
    const district = iDistrict >= 0 ? (row[iDistrict] || "").trim() : "";
    const constituency = iConstituency >= 0 ? (row[iConstituency] || "").trim() : "";
    const mpName = (row[iMP] || "").trim();
    const workDesc = iWork >= 0 ? (row[iWork] || "").trim() : "";
    const vendorName = iVendor >= 0 ? (row[iVendor] || "").trim() : "";
    const rawAmount = iAmount >= 0 ? row[iAmount] : "0";
    const expDate = iDate >= 0 ? parseIndianDate(row[iDate]) : null;

    if (!mpName || !state) { skipped++; continue; }

    const isCrore = cols.find((c) => c.includes("amount"))?.includes("crore") ?? false;
    const amount = isCrore ? croreToRupees(rawAmount) : rupeesToFloat(rawAmount);
    if (!amount) { skipped++; continue; }

    // MP
    const mpKey = `${slugify(mpName)}|${slugify(constituency)}|${source.term}`;
    let mpId = mpCache.get(mpKey);
    if (!mpId) {
      const mp = await prisma.mP.upsert({
        where: {
          name_constituency_term: {
            name: mpName,
            constituency: constituency || "—",
            term: source.term as any,
          },
        },
        update: {},
        create: {
          name: mpName,
          house: "LOK_SABHA" as any,
          state: normalizeStateName(state),
          constituency: constituency || "—",
          term: source.term as any,
        },
      });
      mpId = mp.id;
      mpCache.set(mpKey, mpId);
      mpsCreated++;
    }

    // Project
    const projKey = `${lineNum}`;
    let projectId: string;
    const existing = await prisma.project.findFirst({
      where: { source: "OPENCITY", sourceWorkId: `${source.term}-${projKey}` },
    });
    if (existing) {
      projectId = existing.id;
    } else {
      const sector = inferSector(workDesc);
      const created = await prisma.project.create({
        data: {
          source: "OPENCITY",
          sourceWorkId: `${source.term}-${projKey}`,
          name: (workDesc || "Untitled work").slice(0, 200),
          description: workDesc,
          status: amount > 0 ? ("IN_PROGRESS" as any) : ("PROPOSED" as any),
          sector: sector as any,
          district: district || state,
          constituency: constituency || null,
          state: normalizeStateName(state),
          approvedAmount: amount,
          spentAmount: amount,
          mpId,
          mpName,
          house: "LOK_SABHA" as any,
          term: source.term as any,
          startDate: expDate,
        },
      });
      projectId = created.id;
      projectsCreated++;
    }

    // Vendor
    let vendorId: string | null = null;
    if (vendorName) {
      const { normalizeVendorName } = await import("./_shared.js");
      const norm = normalizeVendorName(vendorName);
      if (norm) {
        const vKey = `${norm}|${normalizeStateName(state)}`;
        vendorId = vendorCache.get(vKey) || null;
        if (!vendorId) {
          const found = await prisma.vendor.findFirst({
            where: { nameNormalized: norm, state: normalizeStateName(state) },
          });
          if (found) {
            vendorId = found.id;
            await prisma.vendor.update({
              where: { id: found.id },
              data: { totalPaid: found.totalPaid + amount, projectCount: found.projectCount + 1 },
            });
          } else {
            const v = await prisma.vendor.create({
              data: {
                name: vendorName,
                nameNormalized: norm,
                state: normalizeStateName(state),
                district: district || null,
                totalPaid: amount,
                projectCount: 1,
              },
            });
            vendorId = v.id;
            vendorsCreated++;
          }
          vendorCache.set(vKey, vendorId);
        }
      }
    }

    expBuffer.push({
      source: "OPENCITY",
      sourceTxnId: `${source.term}-${lineNum}`,
      sourceRef: JSON.stringify(row),
      projectId,
      amount,
      category: "OTHER" as any,
      description: workDesc.slice(0, 500),
      vendor: vendorName || null,
      vendorId,
      paidOn: expDate,
      expenditureDate: expDate,
      status: amount > 0 ? ("PAID" as any) : ("PENDING" as any),
    });

    processed++;
    if (expBuffer.length >= BATCH_SIZE) await flush();
    if (processed % 2000 === 0) progress.tick(processed, dataRows);
  }

  await flush();
  progress.tick(processed, dataRows);

  return {
    rows: processed,
    projects: projectsCreated,
    expenditures: expendituresCreated,
    vendors: vendorsCreated,
    mps: mpsCreated,
    skipped,
  };
}

async function main() {
  console.log(`📥 Ingest: opencity.in (15th, 16th, 17th Lok Sabha) → Project + Vendor + Expenditure`);
  const prisma = await getPrisma();
  let totalRows = 0;
  let totalProjects = 0;
  let totalExp = 0;
  let totalVendors = 0;
  let totalMps = 0;
  let totalSkipped = 0;

  for (const s of SOURCES) {
    const r = await ingestTerm(prisma, s);
    totalRows += r.rows;
    totalProjects += r.projects;
    totalExp += r.expenditures;
    totalVendors += r.vendors;
    totalMps += r.mps;
    totalSkipped += r.skipped;
  }

  console.log(`\n✅ Done.`);
  console.log(`   rows:          ${totalRows.toLocaleString()}`);
  console.log(`   projects:      created=${totalProjects.toLocaleString()}`);
  console.log(`   expenditures:  created=${totalExp.toLocaleString()}`);
  console.log(`   vendors:       created=${totalVendors.toLocaleString()}`);
  console.log(`   mps:           created=${totalMps.toLocaleString()}`);
  console.log(`   skipped:       ${totalSkipped.toLocaleString()}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Ingest failed:", e);
  process.exit(1);
});
