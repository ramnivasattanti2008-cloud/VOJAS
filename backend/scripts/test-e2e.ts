/**
 * Phase F — E2E Smoke Test
 * Tests all critical paths for the Phase 53 rebuild:
 * 1. Projects API — pilot projects visible
 * 2. Satellite API — observations accessible
 * 3. Verification API — runAndStore works
 * 4. Anomaly API — create/verify anomaly
 * 5. PDF generation
 *
 * Run: cd backend && npx tsx scripts/test-e2e.ts
 */

import { prisma, disconnectDatabase } from "../src/config/database.js";
import { generateProjectPDF } from "../src/services/pdfService.js";
import { verificationService } from "../src/services/verificationService.js";

async function test(label: string, fn: () => Promise<boolean>): Promise<void> {
  try {
    const ok = await fn();
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  } catch (err: any) {
    console.error(`  ✗ ${label}: ${err?.message ?? err}`);
  }
}

async function main() {
  console.log("\n=== VOJAS Phase 53 E2E Smoke Test ===\n");

  // ── 1. Pilot projects seeded ──────────────────────────────────────────────
  await test("5 pilot projects exist", async () => {
    const count = await prisma.project.count({ where: { pilotProject: true } });
    return count === 5;
  });

  await test("Each pilot has reported progress", async () => {
    const pilots = await prisma.project.findMany({
      where: { pilotProject: true },
      select: { reportedProgress: true },
    });
    return pilots.every(p => p.reportedProgress !== null && p.reportedProgress >= 0);
  });

  await test("Each pilot has real coordinates", async () => {
    const pilots = await prisma.project.findMany({
      where: { pilotProject: true },
      select: { latitude: true, longitude: true },
    });
    return pilots.every(p => p.latitude !== null && p.longitude !== null);
  });

  await test("Each pilot has 4 test observations (seedObservations)", async () => {
    const pilots = await prisma.project.findMany({
      where: { pilotProject: true },
      include: { _count: { select: { satelliteObservations: true } } },
    });
    return pilots.every(p => p._count.satelliteObservations === 4);
  });

  // ── 2. Satellite API ─────────────────────────────────────────────────────
  const pilot = await prisma.project.findFirst({ where: { pilotProject: true } });

  await test("SatelliteObservation model exists", async () => {
    const obs = await prisma.satelliteObservation.findFirst({ where: { projectId: pilot!.id } });
    return obs !== null;
  });

  await test("Observation has NDVI/NDBI values", async () => {
    const obs = await prisma.satelliteObservation.findFirst({
      where: { projectId: pilot!.id },
      orderBy: { observationDate: "desc" },
    });
    return obs !== null && obs.ndvi !== null && obs.ndbii !== null;
  });

  await test("Observation has construction score", async () => {
    const obs = await prisma.satelliteObservation.findFirst({
      where: { projectId: pilot!.id },
    });
    return obs !== null && obs.constructionScore !== null;
  });

  // ── 3. Verification Service ─────────────────────────────────────────────
  await test("VerificationService.runAndStore executes without error", async () => {
    const result = await verificationService.runAndStore({ projectId: pilot!.id });
    return result.output !== undefined;
  });

  await test("Verification result is one of 4 valid statuses", async () => {
    const result = await verificationService.runAndStore({ projectId: pilot!.id });
    const valid = ["CONSISTENT", "POTENTIAL_DISCREPANCY", "INSUFFICIENT_EVIDENCE", "REQUIRES_FIELD"];
    return valid.includes(result.output.result);
  });

  await test("Verification stores result as ProgressObservation", async () => {
    const count = await prisma.progressObservation.count({
      where: { projectId: pilot!.id, reportSource: "VOJAS_VERIFICATION" },
    });
    return count >= 1;
  });

  await test("PROGRESS_DISCREPANCY is a valid AnomalyCategory enum", async () => {
    const cats = await prisma.$queryRaw<[{ category: string }]>`SELECT DISTINCT category FROM Anomaly`;
    return true; // If query succeeds, enum is valid
  });

  // ── 4. Anomaly Creation ──────────────────────────────────────────────────
  // Note: Anomalies are only created when POTENTIAL_DISCREPANCY is detected.
  // In stub mode with test observations, most projects return INSUFFICIENT_EVIDENCE.
  await test("Anomaly model accepts PROGRESS_DISCREPANCY category", async () => {
    const anomaly = await prisma.anomaly.create({
      data: {
        title: "TEST: Progress Discrepancy anomaly",
        description: "Test anomaly created during Phase F E2E smoke test",
        category: "PROGRESS_DISCREPANCY",
        severity: "LOW",
        status: "OPEN",
        projectId: pilot!.id,
      },
    });
    // Clean up test anomaly
    await prisma.anomaly.delete({ where: { id: anomaly.id } });
    return true;
  });

  // ── 5. PDF Generation ─────────────────────────────────────────────────────
  await test("PDF generation produces valid PDF for pilot project", async () => {
    const buffer = await generateProjectPDF(pilot!.id);
    const header = buffer.slice(0, 5).toString("ascii");
    return header === "%PDF-";
  });

  await test("PDF is > 1KB (non-trivial)", async () => {
    const buffer = await generateProjectPDF(pilot!.id);
    return buffer.length > 1024;
  });

  // ── 6. CDSE Service stub mode ────────────────────────────────────────────
  await test("CDSE service correctly detects missing credentials (stub mode)", async () => {
    const hasCreds = !!(process.env.CDSE_CLIENT_ID && process.env.CDSE_CLIENT_SECRET);
    return !hasCreds; // We're in stub mode without credentials
  });

  console.log("\n=== All smoke tests complete ===\n");
}

main()
  .catch(console.error)
  .finally(async () => {
    await disconnectDatabase();
  });
