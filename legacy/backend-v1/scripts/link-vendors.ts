/**
 * VOJAS — Vendor linking + expenditure enrichment
 *
 * Links existing projects to vendors and creates realistic expenditure
 * entries. Builds vendor stats (totalPaid, projectCount, constituencyCount).
 *
 * Run: cd backend && npx tsx scripts/link-vendors.ts
 */

import { prisma, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";

async function main() {
  // Pull all vendors
  const vendors = await prisma.vendor.findMany();
  logger.info(`Found ${vendors.length} vendors`);

  // Group vendors by state for efficient lookup
  const vendorsByState = new Map<string, typeof vendors>();
  for (const v of vendors) {
    if (!v.state) continue;
    if (!vendorsByState.has(v.state)) vendorsByState.set(v.state, []);
    vendorsByState.get(v.state)!.push(v);
  }

  // Find projects that have no expenditures yet
  const projectsWithoutExp = await prisma.project.findMany({
    where: { expenditures: { none: {} } },
    select: {
      id: true,
      state: true,
      district: true,
      approvedAmount: true,
      status: true,
      mpId: true,
    },
    take: 30000,
  });
  logger.info(`Found ${projectsWithoutExp.length} projects without expenditures`);

  // Build expenditure entries — pick a vendor in same state 70% of the time,
  // random from any state 30% of the time
  let linked = 0;
  const projectExpenditureMap = new Map<string, string>(); // projectId → vendorId
  const expenditureData: any[] = [];

  for (const p of projectsWithoutExp) {
    const stateKey = (p.state || "").toUpperCase();
    let vendor: typeof vendors[0] | null = null;

    // Try same-state vendor first
    if (vendorsByState.has(stateKey)) {
      const stateVendors = vendorsByState.get(stateKey)!;
      vendor = stateVendors[Math.floor(Math.random() * stateVendors.length)];
    } else if (vendors.length > 0) {
      vendor = vendors[Math.floor(Math.random() * vendors.length)];
    }

    if (!vendor) continue;

    const baseCost = p.approvedAmount || 5000000;
    // Realistic progress: completed projects have full expenditures, others partial
    const progressFraction =
      p.status === "COMPLETED" ? 0.95 + Math.random() * 0.05 :
      p.status === "IN_PROGRESS" ? 0.3 + Math.random() * 0.5 :
      p.status === "PROPOSED" ? 0 + Math.random() * 0.1 :
      0.5;
    const totalSpent = Math.round(baseCost * progressFraction);

    // Break into 2-4 payment installments
    const installments = 2 + Math.floor(Math.random() * 3);
    const installmentAmt = totalSpent / installments;
    for (let i = 0; i < installments; i++) {
      const dayOffset = Math.floor(Math.random() * 1500);
      const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
      expenditureData.push({
        projectId: p.id,
        vendorId: vendor.id,
        amount: installmentAmt,
        paidOn: date,
        category: ["MATERIAL", "LABOR", "EQUIPMENT", "CONSULTANCY", "ADMINISTRATIVE"][Math.floor(Math.random() * 5)],
        status: i < installments - 1 ? "PAID" : (Math.random() > 0.3 ? "PAID" : "PENDING"),
        invoiceNo: `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        description: `${vendor.name} - installment ${i + 1} of ${installments}`,
      });
    }
    projectExpenditureMap.set(p.id, vendor.id);
    linked++;
  }

  logger.info(`Generated ${expenditureData.length} expenditure entries for ${linked} projects`);

  // Bulk insert
  const batchSize = 500;
  for (let i = 0; i < expenditureData.length; i += batchSize) {
    const batch = expenditureData.slice(i, i + batchSize);
    await prisma.expenditure.createMany({ data: batch });
  }
  logger.info(`✓ Inserted ${expenditureData.length} expenditures`);

  // Recalculate vendor stats from expenditures
  logger.info("Recalculating vendor stats...");
  for (const vendor of vendors) {
    const stats = await prisma.expenditure.aggregate({
      where: { vendorId: vendor.id },
      _sum: { amount: true },
      _count: { projectId: true },
    });
    const constituencyCount = await prisma.expenditure.findMany({
      where: { vendorId: vendor.id },
      include: { project: { include: { mp: true } } },
      distinct: ["projectId"],
    });
    const uniqueConstituencies = new Set(
      constituencyCount.map((e: any) => e.project?.mp?.constituency).filter(Boolean)
    );

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        totalPaid: stats._sum.amount || 0,
        projectCount: stats._count.projectId || 0,
        constituencyCount: uniqueConstituencies.size,
      },
    });
  }
  logger.info("✓ Vendor stats updated");

  // Final count
  const finalExp = await prisma.expenditure.count();
  const finalVendors = await prisma.vendor.count();
  logger.info(`=== Final ===`);
  logger.info(`Total expenditures: ${finalExp}`);
  logger.info(`Total vendors: ${finalVendors}`);

  // Show top 5 vendors by spend
  const topVendors = await prisma.vendor.findMany({
    orderBy: { totalPaid: "desc" },
    take: 5,
    select: { name: true, state: true, totalPaid: true, projectCount: true, constituencyCount: true },
  });
  logger.info("Top 5 vendors by total spend:");
  for (const v of topVendors) {
    logger.info(`  ${v.name} (${v.state}) - ₹${(v.totalPaid / 10000000).toFixed(2)}Cr across ${v.projectCount} projects, ${v.constituencyCount} constituencies`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
