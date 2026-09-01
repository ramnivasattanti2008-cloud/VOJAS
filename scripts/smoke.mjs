import { prisma } from "../backend/src/config/database.js";
import { lawEnforcementService } from "../backend/src/services/lawEnforcementService.js";

async function smoke() {
  console.log("=== Smoke Test ===");

  const auths = lawEnforcementService.authorities();
  console.log("1. Authorities:", auths.length, "== 6:", auths.length === 6 ? "PASS" : "FAIL");

  const escalated = await prisma.anomaly.count({ where: { lawEscalation: true } });
  console.log("2. Escalated:", escalated, "== 51:", escalated === 51 ? "PASS" : "FAIL");

  const notifs = await prisma.notification.count({ where: { type: "ANOMALY_ESCALATED_TO_LAW" } });
  console.log("3. Notifications:", notifs, "== 204:", notifs === 204 ? "PASS" : "FAIL");

  const refs = await prisma.referral.count();
  console.log("4. Referrals:", refs, "== 51:", refs === 51 ? "PASS" : "FAIL");

  const cases = await prisma.case.count({ where: { type: "LAW_ENFORCEMENT" } });
  console.log("5. Cases:", cases, "== 51:", cases === 51 ? "PASS" : "FAIL");

  const ack = await prisma.anomaly.count({ where: { lawEscalation: true, lawAcknowledged: true } });
  console.log("6. Acknowledged:", ack, "(expected 0, no ack done yet)");

  // Test auto-escalate again
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const count = await lawEnforcementService.autoEscalateCritical(100, admin.id);
  console.log("7. Auto-escalate (risk=100, already done):", count);

  await prisma.$disconnect();
  console.log("\n=== Done ===");
}

smoke().catch(console.error);
