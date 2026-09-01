import { prisma } from "../backend/src/config/database.js";

const bySource = await prisma.project.groupBy({
  by: ["source"],
  _count: true,
});
console.log("Projects by source:");
for (const r of bySource) console.log(`  ${r.source || "null"}: ${r._count.toLocaleString()}`);

const byStatus = await prisma.project.groupBy({
  by: ["status"],
  _count: true,
});
console.log("\nBy status:");
for (const r of byStatus) console.log(`  ${r.status}: ${r._count.toLocaleString()}`);

const mps = await prisma.mP.count();
const vendors = await prisma.vendor.count();
console.log(`\nMPs: ${mps}, Vendors: ${vendors}`);

await prisma.$disconnect();