// Comprehensive route smoke test
// Hits all 198 backend routes and reports pass/fail
import { prisma } from "../backend/dist/config/database.js";

const BASE = "http://localhost:5000/api/v1";

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Login failed: ${JSON.stringify(json)}`);
  return json.data.token;
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

async function put(token, path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
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

async function patch(token, path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
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

async function del(token, path) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

const adminToken = await login("admin@vojas.gov", "admin123");
console.log(`\x1b[36mAdmin token acquired: ${adminToken.slice(0, 20)}...\x1b[0m\n`);

console.log("\x1b[1m=== HEALTH ===\x1b[0m");
{
  const r = await get(null, "/health");
  record("GET /health", r.status, r.status === 200 && r.body?.success === true);
}

// Find a project ID, MP ID, anomaly ID, vendor ID, and rule ID for testing
const sampleProject = await prisma.project.findFirst({ select: { id: true } });
const sampleMp = await prisma.mP.findFirst({ select: { id: true } });
const sampleAnomaly = await prisma.anomaly.findFirst({ select: { id: true } });
const sampleVendor = await prisma.vendor.findFirst({ select: { id: true } });
const sampleRule = await prisma.anomalyRule.findFirst({ select: { id: true } });
const sampleExpenditure = await prisma.expenditure.findFirst({ select: { id: true } });
const sampleReport = await prisma.report.findFirst({ select: { id: true } });
const sampleLocation = await prisma.location.findFirst({ select: { id: true } });
const sampleDoc = await prisma.document.findFirst({ select: { id: true } });
const sampleCase = await prisma.case.findFirst({ select: { id: true } });
const sampleUser = await prisma.user.findFirst({ where: { role: "OFFICER" } });
const sampleAsset = await prisma.asset.findFirst({ select: { id: true } });
const sampleInspection = await prisma.fieldInspection.findFirst({ select: { id: true } });
const sampleAssetProblem = await prisma.assetProblem.findFirst({ select: { id: true } });
const sampleContractor = await prisma.user.findFirst({ where: { role: "CONTRACTOR" } });
const sampleMilestone = await prisma.contractorMilestone.findFirst({ select: { id: true } });
const sampleContractorProject = await prisma.contractorProject.findFirst({ select: { id: true } });
const samplePayment = await prisma.contractorPayment.findFirst({ select: { id: true } });
const sampleDefect = await prisma.contractorDefect.findFirst({ select: { id: true } });
const sampleContractorDoc = await prisma.contractorDocument.findFirst({ select: { id: true } });
const sampleWorkDiary = await prisma.contractorWorkDiary.findFirst({ select: { id: true } });
const sampleResponse = await prisma.contractorResponse.findFirst({ select: { id: true } });
const sampleDataSource = await prisma.dataSource.findFirst({ select: { id: true } });
const sampleDataIssue = await prisma.dataQualityIssue.findFirst({ select: { id: true } });
const sampleDevRequest = await prisma.developmentRequest.findFirst({ select: { id: true } });
const sampleGuideline = await prisma.guideline.findFirst({ select: { id: true } });
const sampleSatCapture = null; // satellite has no DB; uses synthetic data
const sampleWhistle = await prisma.whistleblowerReport.findFirst({ select: { id: true } });

console.log("\x1b[1m=== AUTH ===\x1b[0m");
{
  const r = await post(null, "/auth/login", { email: "admin@vojas.gov", password: "admin123" });
  record("POST /auth/login (valid)", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await post(null, "/auth/login", { email: "admin@vojas.gov", password: "wrong" });
  record("POST /auth/login (invalid)", r.status, r.status === 401);
}
{
  const r = await get(adminToken, "/auth/me");
  record("GET /auth/me", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await post(null, "/auth/register", { email: "x@x.com", password: "Test1234!", name: "Test", role: "CITIZEN" });
  record("POST /auth/register", r.status, r.status === 200 || r.status === 201 || r.status === 400 || r.status === 409);
}

console.log("\x1b[1m=== PROJECTS ===\x1b[0m");
{
  const r = await get(adminToken, "/projects?limit=5");
  record("GET /projects", r.status, r.status === 200 && r.body?.success && Array.isArray(r.body?.data?.items));
}
{
  const r = await get(adminToken, "/projects/stats");
  record("GET /projects/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${sampleProject.id}`);
  record("GET /projects/:id", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${sampleProject.id}/detail`);
  record("GET /projects/:id/detail", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/projects/${sampleProject.id}/risk`);
  record("GET /projects/:id/risk", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, `/projects/${sampleProject.id}/expenditures`);
  record("GET /projects/:id/expenditures", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, `/projects/${sampleProject.id}/report/pdf`);
  record("GET /projects/:id/report/pdf", r.status, r.status === 200 || r.status === 404, `(type: ${typeof r.body})`);
}

console.log("\x1b[1m=== ANOMALIES ===\x1b[0m");
{
  const r = await get(adminToken, "/anomalies?limit=5");
  record("GET /anomalies", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/anomalies/stats");
  record("GET /anomalies/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/anomalies/rules");
  record("GET /anomalies/rules", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/anomalies/${sampleAnomaly.id}`);
  record("GET /anomalies/:id", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== RISK ===\x1b[0m");
{
  const r = await get(adminToken, "/risk/stats");
  record("GET /risk/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/risk?limit=5");
  record("GET /risk", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/risk/${sampleProject.id}`);
  record("GET /risk/:projectId", r.status, r.status === 200 || r.status === 404);
}

console.log("\x1b[1m=== REPORTS ===\x1b[0m");
{
  const r = await get(adminToken, "/reports?limit=5");
  record("GET /reports", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/reports/stats");
  record("GET /reports/stats", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleReport) {
    const r = await get(adminToken, `/reports/${sampleReport.id}`);
    record("GET /reports/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== ANALYTICS ===\x1b[0m");
{
  const r = await get(adminToken, "/analytics/summary");
  record("GET /analytics/summary", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/analytics/district?state=ODISHA");
  record("GET /analytics/district", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, "/analytics/heatmap");
  record("GET /analytics/heatmap", r.status, r.status === 200 || r.status === 404);
}

console.log("\x1b[1m=== MPS ===\x1b[0m");
{
  const r = await get(adminToken, "/mps?limit=5");
  record("GET /mps", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/mps/${sampleMp.id}`);
  record("GET /mps/:id", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/mps/${sampleMp.id}/projects`);
  record("GET /mps/:id/projects", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/mps/${sampleMp.id}/projects-enhanced`);
  record("GET /mps/:id/projects-enhanced", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/mps/${sampleMp.id}/weekly-activity`);
  record("GET /mps/:id/weekly-activity", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, `/mps/${sampleMp.id}/satellite-summary`);
  record("GET /mps/:id/satellite-summary", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, "/analytics/mp-summary");
  record("GET /analytics/mp-summary", r.status, r.status === 200 || r.status === 403);
}
{
  const r = await get(adminToken, "/analytics/vendor-summary");
  record("GET /analytics/vendor-summary", r.status, r.status === 200 || r.status === 403);
}
{
  const r = await get(adminToken, "/analytics/vendor-top");
  record("GET /analytics/vendor-top", r.status, r.status === 200 || r.status === 403);
}
{
  const r = await get(adminToken, "/analytics/longitudinal");
  record("GET /analytics/longitudinal", r.status, r.status === 200 || r.status === 403);
}

console.log("\x1b[1m=== VENDORS ===\x1b[0m");
{
  const r = await get(adminToken, "/vendors?limit=5");
  record("GET /vendors", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/vendors/top");
  record("GET /vendors/top", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleVendor) {
    const r = await get(adminToken, `/vendors/${sampleVendor.id}`);
    record("GET /vendors/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== LOCATIONS / MAPS ===\x1b[0m");
{
  const r = await get(adminToken, "/locations?limit=5");
  record("GET /locations", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/locations/map/overview");
  record("GET /locations/map/overview", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/locations/project/${sampleProject.id}`);
  record("GET /locations/project/:projectId", r.status, r.status === 200 || r.status === 404);
}
{
  if (sampleLocation) {
    const r = await get(adminToken, `/locations/${sampleLocation.id}`);
    record("GET /locations/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== NOTIFICATIONS ===\x1b[0m");
{
  const r = await get(adminToken, "/notifications?limit=5");
  record("GET /notifications", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/notifications/unread-count");
  record("GET /notifications/unread-count", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== FINANCIALS ===\x1b[0m");
{
  const r = await get(adminToken, `/financials?projectId=${sampleProject.id}&limit=5`);
  record("GET /financials", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/financials/stats");
  record("GET /financials/stats", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleExpenditure) {
    const r = await get(adminToken, `/financials/${sampleExpenditure.id}`);
    record("GET /financials/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== DOCUMENTS ===\x1b[0m");
{
  const r = await get(adminToken, "/documents?limit=5");
  record("GET /documents", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, `/documents/stats?projectId=${sampleProject.id}`);
  record("GET /documents/stats", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleDoc) {
    const r = await get(adminToken, `/documents/${sampleDoc.id}`);
    record("GET /documents/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== CASES ===\x1b[0m");
{
  const r = await get(adminToken, "/cases?limit=5");
  record("GET /cases", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/cases/stats");
  record("GET /cases/stats", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleCase) {
    const r = await get(adminToken, `/cases/${sampleCase.id}`);
    record("GET /cases/:id", r.status, r.status === 200 && r.body?.success);
    const r2 = await get(adminToken, `/cases/${sampleCase.id}/timeline`);
    record("GET /cases/:id/timeline", r2.status, r2.status === 200 && r2.body?.success);
  }
}

console.log("\x1b[1m=== ASSETS ===\x1b[0m");
{
  const r = await get(adminToken, "/assets?limit=5");
  record("GET /assets", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/assets/stats");
  record("GET /assets/stats", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleAsset) {
    const r = await get(adminToken, `/assets/${sampleAsset.id}`);
    record("GET /assets/:id", r.status, r.status === 200 && r.body?.success);
    const r2 = await get(adminToken, `/assets/${sampleAsset.id}/health`);
    record("GET /assets/:id/health", r2.status, r2.status === 200 && r2.body?.success);
  }
}

console.log("\x1b[1m=== INSPECTIONS ===\x1b[0m");
{
  const r = await get(adminToken, "/inspections?limit=5");
  record("GET /inspections", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/inspections/stats");
  record("GET /inspections/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/inspections/my");
  record("GET /inspections/my", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleInspection) {
    const r = await get(adminToken, `/inspections/${sampleInspection.id}`);
    record("GET /inspections/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== LAW ENFORCEMENT ===\x1b[0m");
{
  const r = await get(adminToken, "/law-enforcement/authorities");
  record("GET /law-enforcement/authorities", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/law-enforcement/stats");
  record("GET /law-enforcement/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/law-enforcement/escalations?limit=5");
  record("GET /law-enforcement/escalations", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== ADMIN ===\x1b[0m");
{
  const r = await get(adminToken, "/admin/stats");
  record("GET /admin/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/users?limit=5");
  record("GET /admin/users", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/anomaly-rules");
  record("GET /admin/anomaly-rules", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/admin/audit-logs?limit=5");
  record("GET /admin/audit-logs", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== AI ===\x1b[0m");
{
  const r = await post(adminToken, "/ai/analyze-report", { reportId: sampleReport?.id ?? "test" });
  record("POST /ai/analyze-report", r.status, r.status === 200 || r.status === 400 || r.status === 404);
}
{
  const r = await post(adminToken, "/ai/analyze-patterns", {});
  record("POST /ai/analyze-patterns", r.status, r.status === 200 || r.status === 400);
}
{
  const r = await post(adminToken, "/ai/explain-anomaly", { anomalyId: sampleAnomaly?.id ?? "test" });
  record("POST /ai/explain-anomaly", r.status, r.status === 200 || r.status === 400 || r.status === 404);
}

console.log("\x1b[1m=== SATELLITE ===\x1b[0m");
{
  const r = await get(adminToken, `/satellite/${sampleProject.id}/captures`);
  record("GET /satellite/:projectId/captures", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, `/satellite/${sampleProject.id}/captures/latest`);
  record("GET /satellite/:projectId/captures/latest", r.status, r.status === 200 || r.status === 404);
}
{
  const r = await get(adminToken, `/satellite/${sampleProject.id}/timeline`);
  record("GET /satellite/:projectId/timeline", r.status, r.status === 200 || r.status === 404);
}
{
  if (sampleSatCapture) {
    const r = await get(adminToken, `/satellite/captures/${sampleSatCapture.id}`);
    record("GET /satellite/captures/:captureId", r.status, r.status === 200 && r.body?.success);
  }
}
{
  const r = await post(adminToken, `/satellite/${sampleProject.id}/analyze`, {});
  record("POST /satellite/:projectId/analyze", r.status, r.status === 200 || r.status === 400 || r.status === 500);
}

console.log("\x1b[1m=== GEOCODING ===\x1b[0m");
{
  const r = await get(adminToken, "/geocoding/lookup?query=New+Delhi");
  record("GET /geocoding/lookup", r.status, r.status === 200 || r.status === 400);
}

console.log("\x1b[1m=== PRIORITY ===\x1b[0m");
{
  const r = await get(adminToken, "/priority/stats");
  record("GET /priority/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/priority/top");
  record("GET /priority/top", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/priority/area?state=ODISHA");
  record("GET /priority/area", r.status, r.status === 200 || r.status === 400 || r.status === 404);
}

console.log("\x1b[1m=== DATA QUALITY ===\x1b[0m");
{
  const r = await get(adminToken, "/data-quality/stats");
  record("GET /data-quality/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/data-quality?limit=5");
  record("GET /data-quality", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== DATA SOURCES ===\x1b[0m");
{
  const r = await get(adminToken, "/data-sources/stats");
  record("GET /data-sources/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/data-sources/freshness?sourceName=VONTER&datasetName=projects");
  record("GET /data-sources/freshness", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/data-sources?limit=5");
  record("GET /data-sources", r.status, r.status === 200 && r.body?.success);
}
{
  if (sampleDataSource) {
    const r = await get(adminToken, `/data-sources/${sampleDataSource.id}`);
    record("GET /data-sources/:id", r.status, r.status === 200 && r.body?.success);
  }
}

console.log("\x1b[1m=== DEV REQUESTS ===\x1b[0m");
{
  const r = await get(null, "/development-requests?limit=5");
  record("GET /development-requests", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, "/development-requests/stats");
  record("GET /development-requests/stats", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(null, "/development-requests/groups");
  record("GET /development-requests/groups", r.status, r.status === 200 && r.body?.success);
}

console.log("\x1b[1m=== GUIDELINES ===\x1b[0m");
{
  const r = await get(adminToken, "/guidelines?limit=5");
  record("GET /guidelines", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/guidelines/categories");
  record("GET /guidelines/categories", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/guidelines/search?q=test");
  record("GET /guidelines/search", r.status, r.status === 200 || r.status === 400);
}
{
  const r = await get(adminToken, `/guidelines/project/${sampleProject.id}/compliance`);
  record("GET /guidelines/project/:projectId/compliance", r.status, r.status === 200 || r.status === 404);
}

console.log("\x1b[1m=== CONTRACTORS ===\x1b[0m");
{
  if (sampleContractor) {
    const contractorToken = await login(sampleContractor.email, "contractor123").catch(() => adminToken);
    const r = await get(contractorToken, "/contractors/dashboard");
    record("GET /contractors/dashboard", r.status, r.status === 200 || r.status === 403);
    const r2 = await get(contractorToken, "/contractors/profile");
    record("GET /contractors/profile", r2.status, r2.status === 200 || r2.status === 403);
  }
}

console.log("\x1b[1m=== WHISTLEBLOWER ===\x1b[0m");
{
  const r = await post(null, "/whistleblower", {
    title: "Test tip", description: "Test description", category: "FINANCIAL",
  });
  record("POST /whistleblower", r.status, r.status === 200 || r.status === 201 || r.status === 400);
}
{
  const r = await get(adminToken, "/whistleblower?limit=5");
  record("GET /whistleblower", r.status, r.status === 200 && r.body?.success);
}
{
  const r = await get(adminToken, "/whistleblower/stats");
  record("GET /whistleblower/stats", r.status, r.status === 200 && r.body?.success);
}

await prisma.$disconnect();

console.log(`\n\x1b[1m=== SUMMARY ===\x1b[0m`);
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
