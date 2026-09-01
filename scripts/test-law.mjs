// Quick test script for law enforcement API
// Run: node scripts/test-law.mjs

import { prisma } from "../backend/src/config/database.js";

async function main() {
  console.log("=== Law Enforcement API Test ===\n");

  // 1. Check authorities endpoint (from the service)
  const { lawEnforcementService } = await import("../backend/src/services/lawEnforcementService.js");
  const authorities = lawEnforcementService.authorities();
  console.log("1. Authorities:");
  for (const a of authorities) {
    console.log(`   ${a.code} → ${a.label}`);
  }

  // 2. Check escalated anomaly count
  const totalEscalated = await prisma.anomaly.count({ where: { lawEscalation: true } });
  console.log(`\n2. Total escalated anomalies: ${totalEscalated}`);

  // 3. Check by authority
  const byAuth = await prisma.anomaly.groupBy({
    by: ["lawAuthority"],
    where: { lawEscalation: true },
    _count: true,
  });
  console.log("3. By authority:");
  for (const row of byAuth) {
    console.log(`   ${row.lawAuthority ?? "null"}: ${row._count}`);
  }

  // 4. Check referral count
  const referrals = await prisma.referral.count();
  console.log(`\n4. Total referrals: ${referrals}`);

  // 5. Check case count by LAW_ENFORCEMENT
  const lawCases = await prisma.case.count({ where: { type: "LAW_ENFORCEMENT" } });
  console.log(`5. Law enforcement cases: ${lawCases}`);

  // 6. Check notifications (should have ANOMALY_ESCALATED_TO_LAW)
  const escNotifs = await prisma.notification.count({
    where: { type: "ANOMALY_ESCALATED_TO_LAW" }
  });
  console.log(`6. Law escalation notifications: ${escNotifs}`);

  // 7. Check if admin user exists (needed for escalation)
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  console.log(`\n7. Admin user: ${admin ? `${admin.name} (${admin.email})` : "NOT FOUND"}`);

  // 8. List some OPEN/HIGH anomalies for potential escalation
  const candidates = await prisma.anomaly.findMany({
    where: {
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
      lawEscalation: false,
      severity: { in: ["HIGH", "CRITICAL"] },
    },
    take: 5,
    select: { id: true, title: true, severity: true, riskScore: true, category: true },
  });
  console.log(`\n8. High/Critical anomalies ready for escalation (${candidates.length}):`);
  for (const c of candidates) {
    console.log(`   [${c.severity}] risk=${c.riskScore} | ${c.category} | ${c.title.substring(0, 60)}`);
  }

  // 9. Try a real escalation on the first candidate
  if (candidates.length > 0 && admin) {
    const cand = candidates[0];
    console.log(`\n9. Attempting escalation of "${cand.title.substring(0, 50)}" to ACB...`);
    try {
      const result = await lawEnforcementService.escalate({
        anomalyId: cand.id,
        authority: "ACB_OFFICE",
        notes: "Test escalation via API script",
        userId: admin.id,
      });
      console.log("   ✅ SUCCESS!");
      console.log(`   Reference: ${result.lawReferenceNo}`);
      console.log(`   Authority: ${result.authorityLabel}`);
      console.log(`   Admins notified: ${result.notifiedAdmins}`);
      console.log(`   Case ID: ${result.caseId ?? "none"}`);
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}`);
    }
  } else if (candidates.length === 0) {
    console.log("\n9. No candidates for escalation.");
  } else {
    console.log("\n9. No admin user found — skipping escalation test.");
  }

  await prisma.$disconnect();
  console.log("\n=== Done ===");
}

main().catch(console.error);
