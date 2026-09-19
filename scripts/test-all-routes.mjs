// Comprehensive route smoke test for VOJAS 2.0
// Hits all real active backend routes and reports pass/fail
import { prisma } from "@vojas/db";
import jwt from "jsonwebtoken";

const BASE = "http://localhost:5000/api/v1";
const JWT_SECRET = "vojas-dev-secret-change-in-production-32ch";

async function getPersonaToken(role) {
  const user = await prisma.user.findFirst({ where: { role } });
  if (!user) return null;
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: `smoke-test-${role.toLowerCase()}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

async function get(token, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function post(token, path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data ?? {}),
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

const results = [];
let pass = 0, fail = 0;

function record(name, status, ok, detail = "") {
  results.push({ name, status, ok, detail });
  if (ok) pass++; else fail++;
  const icon = ok ? "✓" : "✗";
  const color = ok ? "\x1b[32m" : "\x1b[31m";
  console.log(`  ${color}${icon}\x1b[0m ${name} → ${status}${detail ? "  " + detail : ""}`);
}

// 1. Acquire authenticated tokens for all primary personas directly
const adminToken = await getPersonaToken("ADMIN");
const officerToken = await getPersonaToken("OFFICER") || adminToken;
const citizenToken = await getPersonaToken("CITIZEN") || adminToken;
const mpToken = await getPersonaToken("MP") || adminToken;
const contractorToken = await getPersonaToken("CONTRACTOR") || adminToken;

console.log(`\x1b[36mAdmin token acquired: ${adminToken.slice(0, 25)}...\x1b[0m\n`);

// Lookup real sample records safely
const safeFirst = async (fn) => { try { return await fn(); } catch { return null; } };

const sampleProject = await safeFirst(() => prisma.project.findFirst({ select: { id: true, state: true } }));
const sampleMp = await safeFirst(() => prisma.mP.findFirst({ select: { id: true } }));
const sampleAnomaly = await safeFirst(() => prisma.anomaly.findFirst({ select: { id: true } }));
const sampleVendor = await safeFirst(() => prisma.vendor.findFirst({ select: { id: true } }));
const sampleReport = await safeFirst(() => prisma.report.findFirst({ select: { id: true, reportReference: true } }));
const sampleInvestigation = await safeFirst(() => prisma.verificationCase.findFirst({ select: { id: true } }));
const sampleReferral = await safeFirst(() => prisma.investigationReferral.findFirst({ select: { id: true } }));
const sampleSector = await safeFirst(() => prisma.sector.findFirst({ select: { code: true } }));

const projectId = sampleProject?.id || "showcase-fraud-1";

console.log("\x1b[1m=== 1. HEALTH & SYSTEM ===\x1b[0m");
{
  const r = await get(null, "/health");
  record("GET /health", r.status, r.status === 200 && (r.body?.status === "ok" || r.body?.success === true));
}

console.log("\x1b[1m=== 2. AUTHENTICATION & IDENTITY ===\x1b[0m");
{
  const r = await get(adminToken, "/auth/me");
  record("GET /auth/me (admin)", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(officerToken, "/auth/me");
  record("GET /auth/me (officer)", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(citizenToken, "/auth/me");
  record("GET /auth/me (citizen)", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 3. PUBLIC TRANSPARENCY (M12) ===\x1b[0m");
{
  const r = await get(null, "/projects/public?limit=5");
  record("GET /projects/public", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, "/projects/public/summary");
  record("GET /projects/public/summary", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, "/projects/public/states");
  record("GET /projects/public/states", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, `/projects/public/districts?state=${encodeURIComponent(sampleProject?.state || "Odisha")}`);
  record("GET /projects/public/districts", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, `/projects/public/${projectId}`);
  record("GET /projects/public/:id", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, `/projects/public/${projectId}/ai-audit`);
  record("GET /projects/public/:id/ai-audit", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 4. AUTHENTICATED PROJECTS ===\x1b[0m");
{
  const r = await get(adminToken, "/projects?limit=5");
  record("GET /projects", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}`);
  record("GET /projects/:id", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/risk`);
  record("GET /projects/:id/risk", r.status, r.status === 200);
}

console.log("\x1b[1m=== 5. PROJECT TELEMETRY (TIMELINE, LOCATIONS, FINANCIAL, SATELLITE) ===\x1b[0m");
{
  const r = await get(adminToken, `/projects/${projectId}/timeline`);
  record("GET /projects/:id/timeline", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/locations`);
  record("GET /projects/:id/locations", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/financial`);
  record("GET /projects/:id/financial", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/satellite`);
  record("GET /projects/:id/satellite", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/risk/signals`);
  record("GET /projects/:id/risk/signals", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/risk/findings`);
  record("GET /projects/:id/risk/findings", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${projectId}/risk/events`);
  record("GET /projects/:id/risk/events", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 6. ANOMALIES & AUDIT ===\x1b[0m");
{
  const r = await get(adminToken, "/anomalies?limit=5");
  record("GET /anomalies", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/anomalies/stats");
  record("GET /anomalies/stats", r.status, r.status === 200 && r.body?.success);
}
if (sampleAnomaly) {
  const r = await get(adminToken, `/anomalies/${sampleAnomaly.id}`);
  record("GET /anomalies/:id", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 7. CITIZEN GRIEVANCE REPORTS (M10) ===\x1b[0m");
{
  const r = await get(citizenToken, "/reports?limit=5");
  record("GET /reports", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, "/reports/public?limit=5");
  record("GET /reports/public", r.status, r.status === 200 && r.body?.success);
}
if (sampleReport?.reportReference) {
  const r = await get(null, `/reports/track/${sampleReport.reportReference}`);
  record("GET /reports/track/:ref", r.status, r.status === 200 && r.body?.success);
}
if (sampleReport) {
  const r = await get(adminToken, `/reports/${sampleReport.id}`);
  record("GET /reports/:id", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 8. SECTORS (M13) ===\x1b[0m");
{
  const r = await get(null, "/sectors");
  record("GET /sectors", r.status, r.status === 200 && r.body?.success);
}
if (sampleSector) {
  const r = await get(null, `/sectors/${sampleSector.code}`);
  record("GET /sectors/:code", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 9. MPS & MP COMMAND CENTER ===\x1b[0m");
{
  const r = await get(adminToken, "/mps?limit=5");
  record("GET /mps", r.status, r.status === 200 && r.body?.success);
}
if (sampleMp) {
  const r = await get(adminToken, `/mps/${sampleMp.id}`);
  record("GET /mps/:id", r.status, r.status === 200 && r.body?.success);
  const r2 = await get(adminToken, `/mps/${sampleMp.id}/projects`);
  record("GET /mps/:id/projects", r2.status, r2.status === 200 && r2.body?.success);
}
{
  const r = await get(mpToken, "/mp/me/constituency");
  record("GET /mp/me/constituency", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(mpToken, "/mp/me/financials");
  record("GET /mp/me/financials", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(mpToken, "/mp/me/projects");
  record("GET /mp/me/projects", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 10. VENDORS & CONTRACTORS ===\x1b[0m");
{
  const r = await get(adminToken, "/vendors?limit=5");
  record("GET /vendors", r.status, r.status === 200 && r.body?.success);
}
if (sampleVendor) {
  const r = await get(adminToken, `/vendors/${sampleVendor.id}`);
  record("GET /vendors/:id", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(contractorToken, "/contractor/dashboard");
  record("GET /contractor/dashboard", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(contractorToken, "/contractor/projects");
  record("GET /contractor/projects", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(contractorToken, "/contractor/milestones");
  record("GET /contractor/milestones", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(contractorToken, "/contractor/documents");
  record("GET /contractor/documents", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(contractorToken, "/contractor/payments");
  record("GET /contractor/payments", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(contractorToken, "/contractor/responses");
  record("GET /contractor/responses", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 11. RISK ENGINE & EARLY WARNING (GFR 2017) ===\x1b[0m");
{
  const r = await get(adminToken, "/risk/summary");
  record("GET /risk/summary", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/risk/trends");
  record("GET /risk/trends", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/risk/hotspots");
  record("GET /risk/hotspots", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/risk/rules");
  record("GET /risk/rules", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/risk/early-warning");
  record("GET /risk/early-warning", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 12. OFFICER COMMAND CENTER (M14) ===\x1b[0m");
{
  const r = await get(officerToken, "/officer/dashboard/stats");
  record("GET /officer/dashboard/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(officerToken, "/officer/map/layers");
  record("GET /officer/map/layers", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(officerToken, "/officer/evidence");
  record("GET /officer/evidence", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 13. INVESTIGATIONS & STATUTORY REFERRALS (Phase 4) ===\x1b[0m");
{
  const r = await get(officerToken, "/investigations");
  record("GET /investigations", r.status, r.status === 200 && r.body?.success);
}
if (sampleInvestigation) {
  const r = await get(officerToken, `/investigations/${sampleInvestigation.id}`);
  record("GET /investigations/:id", r.status, r.status === 200 && r.body?.success);
  const rDossier = await get(officerToken, `/investigations/${sampleInvestigation.id}/dossier`);
  record("GET /investigations/:id/dossier", rDossier.status, rDossier.status === 200 && rDossier.body?.success);
}
{
  const r = await get(officerToken, "/referrals");
  record("GET /referrals", r.status, r.status === 200 && r.body?.success);
}
if (sampleReferral) {
  const r = await get(officerToken, `/referrals/${sampleReferral.id}`);
  record("GET /referrals/:id", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 14. ADMIN CENTER & GOVERNANCE ===\x1b[0m");
{
  const r = await get(adminToken, "/admin/stats");
  record("GET /admin/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/users?limit=5");
  record("GET /admin/users", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/rules");
  record("GET /admin/rules", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/roles");
  record("GET /admin/roles", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/data-sources");
  record("GET /admin/data-sources", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/jobs");
  record("GET /admin/jobs", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/ai/providers");
  record("GET /admin/ai/providers", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/ai/stats");
  record("GET /admin/ai/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/satellites/providers");
  record("GET /admin/satellites/providers", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 15. AI ASSISTANT & CIVIC INTELLIGENCE ===\x1b[0m");
{
  const r = await get(null, "/ai/tools");
  record("GET /ai/tools", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await post(null, "/ai/assistant", {
    message: "What is the status of public works?",
    history: []
  });
  record("POST /ai/assistant", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 16. ADVANCED ANALYTICS (M16) ===\x1b[0m");
{
  const r = await get(adminToken, "/analytics/cross-project-patterns");
  record("GET /analytics/cross-project-patterns", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/analytics/hotspot?locationType=STATE&locationId=${encodeURIComponent(sampleProject?.state || "Odisha")}`);
  record("GET /analytics/hotspot", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/analytics/insights");
  record("GET /analytics/insights", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/analytics/models");
  record("GET /analytics/models", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== 17. SEARCH & NOTIFICATIONS & EXPORT ===\x1b[0m");
{
  const r = await get(adminToken, "/search?q=road");
  record("GET /search", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/notifications?limit=5");
  record("GET /notifications", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/export/projects");
  record("GET /export/projects", r.status, r.status === 200);
}

// Cleanup generated smoke test sessions
await prisma.session.deleteMany({
  where: { refreshTokenHash: { startsWith: "smoke-test-" } }
});

await prisma.$disconnect();

console.log(`\n\x1b[1m=== SMOKE TEST SUMMARY ===\x1b[0m`);
console.log(`\x1b[32mPassed:\x1b[0m ${pass}`);
console.log(`\x1b[31mFailed:\x1b[0m ${fail}`);
console.log(`Total:  ${pass + fail}`);

if (fail > 0) {
  console.log(`\n\x1b[1m\x1b[31m=== FAILURES ===\x1b[0m`);
  for (const r of results.filter(x => !x.ok)) {
    console.log(`\x1b[31m✗\x1b[0m ${r.name} → ${r.status}`);
    if (r.detail) console.log(`  ${r.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
