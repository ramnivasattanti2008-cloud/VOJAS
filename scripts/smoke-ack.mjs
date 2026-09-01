import { prisma } from "../backend/src/config/database.js";
import { lawEnforcementService } from "../backend/src/services/lawEnforcementService.js";

async function smoke() {
  console.log("=== Ack Test ===");

  const anom = await prisma.anomaly.findFirst({
    where: { lawEscalation: true, lawAcknowledged: false, lawReferenceNo: { not: null } },
    select: { id: true, lawReferenceNo: true, lawAuthority: true },
  });

  if (!anom) {
    console.log("No unacknowledged escalation found");
    return;
  }

  console.log("Acknowledging", anom.lawReferenceNo, "...");
  const result = await lawEnforcementService.acknowledge(anom.lawReferenceNo, "Test ack from smoke");
  console.log("Result:", JSON.stringify(result, null, 2));

  const after = await prisma.anomaly.findUnique({
    where: { id: anom.id },
    select: { lawAcknowledged: true, lawNotes: true },
  });
  console.log("After ack:", after);

  // Test the controller flow
  const { lawEnforcementController } = await import("../backend/src/controllers/lawEnforcementController.js");
  const adminId = (await prisma.user.findFirst({ where: { role: "ADMIN" } })).id;
  const mockReq = {
    params: { referenceNo: anom.lawReferenceNo },
    body: { notes: "From controller test" },
    user: { userId: adminId },
  };
  let controllerResult;
  const mockRes = { json: (d) => { controllerResult = d; } };
  await lawEnforcementController.acknowledgeReferral(mockReq, mockRes);
  console.log("Controller result:", controllerResult);

  const ackNotifs = await prisma.notification.count({
    where: { type: "REFERRAL_ACKNOWLEDGED" },
  });
  console.log("REFERRAL_ACKNOWLEDGED notifications:", ackNotifs);

  await prisma.$disconnect();
  console.log("=== Done ===");
}

smoke().catch(console.error);
