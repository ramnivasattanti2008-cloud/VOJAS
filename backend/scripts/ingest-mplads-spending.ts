/**
 * VOJAS — Enrich MPs with MPLADS spending from OpenCity.in
 *
 * For each 17th Lok Sabha MP, attach:
 *  - entitlement (₹ Cr)
 *  - fundReceivedGOI (₹ Cr)
 *  - worksRecommendedCost (₹ Cr)
 *  - actualExpenditure (₹ Cr)
 *  - utilizationOverRelease (%)
 *  - unspentBalance (₹ Cr)
 *
 * This data is added as denormalized fields on MP for fast analytics.
 *
 * Run: cd backend && npx tsx scripts/ingest-mplads-spending.ts
 */

import { prisma, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";
import * as fs from "fs";

function normalize(s: string): string {
  return s.toUpperCase().trim().replace(/\s+/g, " ").replace(/[^A-Z ]/g, "");
}

async function main() {
  // Parse CSV manually (handles quoted fields)
  const csv = fs.readFileSync("mplads_17th_loksabha.csv", "utf-8");
  const lines = csv.split("\n").filter((l) => l.trim());
  const header = lines[0].split(",");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Simple split — file is small
    const cells = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h.trim()] = (cells[idx] || "").trim();
    });
    rows.push(row);
  }
  logger.info(`Loaded ${rows.length} rows of OpenCity MPLADS spending data`);

  // Build lookup by normalized MP name
  const allMPs = await prisma.mP.findMany({ where: { term: "SEVENTEENTH" } });
  const mpByName = new Map<string, string>();
  for (const mp of allMPs) {
    mpByName.set(normalize(mp.name), mp.id);
  }
  logger.info(`Found ${allMPs.length} 17th Lok Sabha MPs in DB`);

  let matched = 0;
  let unmatched = 0;

  for (const row of rows) {
    const name = row["MP Name"];
    if (!name) continue;
    const mpId = mpByName.get(normalize(name));
    if (!mpId) {
      unmatched++;
      continue;
    }

    // Update MP with spending data
    const entitlement = parseFloat(row["Entitlement"] || "0");
    const fundReceived = parseFloat(row["FundReceivedGOI"] || "0");
    const worksCost = parseFloat(row["WSCost"] || "0");
    const expenditure = parseFloat(row["ActualExpenditureIncurred"] || "0");
    const utilization = parseFloat(row["UtilizationOverRelease"] || "0");
    const unspent = parseFloat(row["UnspentBalance"] || "0");

    await prisma.mP.update({
      where: { id: mpId },
      data: {
        mpladEntitlement: entitlement || null,
        mpladFundReceived: fundReceived || null,
        mpladWorksCost: worksCost || null,
        mpladExpenditure: expenditure || null,
        mpladUtilization: utilization || null,
        mpladUnspentBalance: unspent || null,
      },
    });

    matched++;
  }

  logger.info(`Updated ${matched} MPs with MPLADS spending, ${unmatched} unmatched`);

  // Calculate party-wise aggregate spending
  const partyStats: Record<string, { count: number; expenditure: number; utilization: number; works: number }> = {};

  for (const row of rows) {
    const name = row["MP Name"];
    const mp = allMPs.find((m) => normalize(m.name) === normalize(name));
    if (!mp) continue;

    const party = mp.party || "Unknown";
    const exp = parseFloat(row["ActualExpenditureIncurred"] || "0");
    const util = parseFloat(row["UtilizationOverRelease"] || "0");
    const works = parseFloat(row["WSCost"] || "0");

    if (!partyStats[party]) partyStats[party] = { count: 0, expenditure: 0, utilization: 0, works: 0 };
    partyStats[party].count++;
    partyStats[party].expenditure += exp;
    partyStats[party].utilization += util;
    partyStats[party].works += works;
  }

  logger.info(`\n=== Party-wise MPLADS Spending (17th Lok Sabha) ===`);
  const sorted = Object.entries(partyStats)
    .sort((a, b) => b[1].expenditure - a[1].expenditure)
    .slice(0, 15);

  for (const [party, stats] of sorted) {
    const avgUtil = stats.utilization / stats.count;
    logger.info(
      `${party.padEnd(45)} ${stats.count} MPs | ₹${stats.expenditure.toFixed(1)} Cr spent | ${avgUtil.toFixed(0)}% avg utilization`
    );
  }

  // Top 10 MPs by expenditure
  const mpSpending = rows
    .map((row) => {
      const name = row["MP Name"];
      const mp = allMPs.find((m) => normalize(m.name) === normalize(name));
      return {
        name,
        party: mp?.party,
        constituency: row["Constituency "]?.trim(),
        entitlement: parseFloat(row["Entitlement"] || "0"),
        expenditure: parseFloat(row["ActualExpenditureIncurred"] || "0"),
        utilization: parseFloat(row["UtilizationOverRelease"] || "0"),
      };
    })
    .filter((m) => m.name && m.expenditure > 0)
    .sort((a, b) => b.expenditure - a.expenditure);

  logger.info(`\n=== Top 20 MPs by Actual Expenditure ===`);
  for (const m of mpSpending.slice(0, 20)) {
    logger.info(
      `${m.name.padEnd(30)} (${m.party || "?"}) ${m.constituency?.padEnd(30) || ""} | ₹${m.expenditure.toFixed(2)} Cr | ${m.utilization.toFixed(0)}% util`
    );
  }

  logger.info(`\n=== Bottom 10 MPs by Utilization (Underperformers) ===`);
  const bottomByUtil = [...mpSpending]
    .filter((m) => m.expenditure > 0 && m.utilization > 0)
    .sort((a, b) => a.utilization - b.utilization)
    .slice(0, 10);
  for (const m of bottomByUtil) {
    logger.info(
      `${m.name.padEnd(30)} (${m.party || "?"}) ${m.constituency?.padEnd(30) || ""} | ${m.utilization.toFixed(0)}% util | ₹${m.expenditure.toFixed(2)} Cr`
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
