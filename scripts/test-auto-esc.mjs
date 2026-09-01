// Test auto-escalation
import { prisma } from "../backend/src/config/database.js";
import { lawEnforcementService } from "../backend/src/services/lawEnforcementService.js";

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) { console.error("No admin"); return; }

  const count = await lawEnforcementService.autoEscalateCritical(80, admin.id);
  console.log("Auto-escalated:", count, "anomalies");

  // Check the escalated count
  const total = await prisma.anomaly.count({ where: { lawEscalation: true } });
  console.log("Total escalated now:", total);

  await prisma.$disconnect();
}

main().catch(console.error);
