import { prisma } from "../backend/src/config/database.js";
async function t() {
  const total = await prisma.anomaly.count({ where: { lawEscalation: true } });
  const byAuth = await prisma.anomaly.groupBy({ by: ["lawAuthority"], where: { lawEscalation: true }, _count: true });
  const cases = await prisma.case.count({ where: { type: "LAW_ENFORCEMENT" } });
  const refs = await prisma.referral.count();
  const notifs = await prisma.notification.count({ where: { type: "ANOMALY_ESCALATED_TO_LAW" } });
  console.log("Escalated anomalies:", total);
  console.log("By authority:", JSON.stringify(byAuth, null, 2));
  console.log("Law enforcement cases:", cases);
  console.log("Referrals:", refs);
  console.log("Notifications:", notifs);
  await prisma.$disconnect();
}
t();
