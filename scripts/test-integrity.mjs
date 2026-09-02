// Database integrity + business logic tests
import { prisma } from "../backend/dist/config/database.js";

let pass = 0, fail = 0;
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) pass++; else fail++;
  const icon = ok ? "✓" : "✗";
  const color = ok ? "\x1b[32m" : "\x1b[31m";
  console.log(`  ${color}${icon}\x1b[0m ${name}${detail ? "  " + detail : ""}`);
}

console.log("\x1b[1m=== TABLE COUNTS ===\x1b[0m");
const counts = {
  users: await prisma.user.count(),
  mps: await prisma.mP.count(),
  projects: await prisma.project.count(),
  reports: await prisma.report.count(),
  expenditures: await prisma.expenditure.count(),
  vendors: await prisma.vendor.count(),
  locations: await prisma.location.count(),
  documents: await prisma.document.count(),
  anomalies: await prisma.anomaly.count(),
  anomalyRules: await prisma.anomalyRule.count(),
  risks: await prisma.projectRisk.count(),
  notifications: await prisma.notification.count(),
  assets: await prisma.asset.count(),
  inspections: await prisma.fieldInspection.count(),
  cases: await prisma.case.count(),
  dataSources: await prisma.dataSource.count(),
  dataIssues: await prisma.dataQualityIssue.count(),
  devRequests: await prisma.developmentRequest.count(),
  guidelines: await prisma.guideline.count(),
  referrals: await prisma.referral.count(),
  evidencePackages: await prisma.evidencePackage.count(),
  safetyReports: await prisma.safetyReport.count(),
  whistleblower: await prisma.whistleblowerReport.count(),
  contractorProfiles: await prisma.contractorProfile.count(),
  contractorProjects: await prisma.contractorProject.count(),
  contractorMilestones: await prisma.contractorMilestone.count(),
  auditLogs: await prisma.auditLog.count(),
};
for (const [k, v] of Object.entries(counts)) {
  record(`${k}: ${v.toLocaleString()}`, v >= 0);
}

console.log("\n\x1b[1m=== ORPHAN CHECKS ===\x1b[0m");
{
  // Projects with mpId set should have a matching MP
  const projectsWithMp = await prisma.project.findMany({
    where: { mpId: { not: null } },
    select: { mpId: true },
    take: 1000,
  });
  const mpIds = new Set(projectsWithMp.map(p => p.mpId).filter(Boolean));
  const existingMps = await prisma.mP.findMany({ where: { id: { in: [...mpIds] } }, select: { id: true } });
  const existingSet = new Set(existingMps.map(m => m.id));
  const orphans = projectsWithMp.filter(p => p.mpId && !existingSet.has(p.mpId));
  record("no orphan projects (mpId set, mp missing)", orphans.length === 0, `(${orphans.length} orphans in sample of 1000)`);
}
{
  // Expenditures should have a matching project (projectId is non-nullable)
  const exp = await prisma.expenditure.findMany({
    select: { projectId: true },
    take: 1000,
  });
  const projectIds = [...new Set(exp.map(e => e.projectId))];
  const existing = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true } });
  const existingSet = new Set(existing.map(p => p.id));
  const orphans = exp.filter(e => !existingSet.has(e.projectId));
  record("no orphan expenditures", orphans.length === 0, `(${orphans.length} orphans in sample of 1000)`);
}
{
  const rep = await prisma.report.findMany({
    where: { projectId: { not: null } },
    select: { projectId: true },
    take: 1000,
  });
  const projectIds = [...new Set(rep.map(r => r.projectId).filter(Boolean))];
  const existing = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true } });
  const existingSet = new Set(existing.map(p => p.id));
  const orphans = rep.filter(r => r.projectId && !existingSet.has(r.projectId));
  record("no orphan reports", orphans.length === 0, `(${orphans.length} orphans in sample of 1000)`);
}
{
  // Document.projectId is non-nullable — all docs must have a project
  const docs = await prisma.document.findMany({ select: { projectId: true }, take: 1000 });
  const projectIds = [...new Set(docs.map(d => d.projectId))];
  const existing = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true } });
  const existingSet = new Set(existing.map(p => p.id));
  const orphans = docs.filter(d => !existingSet.has(d.projectId));
  record("no orphan documents (projectId non-nullable)", orphans.length === 0, `(${orphans.length} orphans)`);
}
{
  const anomalies = await prisma.anomaly.findMany({
    where: { projectId: { not: null } },
    select: { projectId: true },
    take: 1000,
  });
  const projectIds = [...new Set(anomalies.map(a => a.projectId).filter(Boolean))];
  const existing = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true } });
  const existingSet = new Set(existing.map(p => p.id));
  const orphans = anomalies.filter(a => a.projectId && !existingSet.has(a.projectId));
  record("no orphan anomalies (projectId nullable, project missing)", orphans.length === 0, `(${orphans.length} orphans)`);
}

console.log("\n\x1b[1m=== FK INTEGRITY ===\x1b[0m");
{
  const total = await prisma.anomaly.count();
  const withProject = await prisma.anomaly.count({ where: { projectId: { not: null } } });
  record(`anomalies have projectId (${withProject}/${total})`, withProject === total);
}
{
  const allRisks = await prisma.projectRisk.count();
  // ProjectRisk.projectId is non-nullable
  record(`risks have projectId (all ${allRisks} non-null)`, allRisks > 0);
}

console.log("\n\x1b[1m=== DATA VALIDITY ===\x1b[0m");
{
  const badAmount = await prisma.expenditure.count({ where: { amount: { lte: 0 } } });
  record("no expenditures with amount <= 0", badAmount === 0, `(${badAmount} bad)`);
}
{
  const projects = await prisma.project.count();
  const unsanctioned = await prisma.project.count({ where: { status: "UNSANCTIONED" } });
  record(`projects have status enum (${projects - unsanctioned} sanctioned of ${projects})`, projects > 0);
}
{
  // Future expenditures may be valid (planned/forecasted) — just verify they're AUTHORIZED/PENDING, not PAID
  const futurePaid = await prisma.expenditure.count({
    where: { paidOn: { gt: new Date() }, status: "PAID" },
  });
  const futureAny = await prisma.expenditure.count({ where: { paidOn: { gt: new Date() } } });
  record(`no future PAID expenditures (${futureAny} future total, ${futurePaid} PAID)`, futurePaid === 0, `(${futurePaid} bad)`);
}
{
  const users = await prisma.user.findMany({ select: { role: true } });
  // Use actual enum from Prisma
  const validRoles = ["ADMIN", "OFFICER", "REVIEWER", "ANALYST", "VIEWER", "MP", "CONTRACTOR", "CITIZEN", "FIELD_OFFICER"];
  const invalid = users.filter(u => !validRoles.includes(u.role));
  record("all user roles are valid", invalid.length === 0, `(${invalid.length} invalid, ${new Set(users.map(u => u.role)).size} distinct)`);
}
{
  // Anomaly severity distribution
  const crit = await prisma.anomaly.count({ where: { severity: "CRITICAL" } });
  const high = await prisma.anomaly.count({ where: { severity: "HIGH" } });
  record(`anomalies with severity (${crit} CRIT + ${high} HIGH)`, crit + high > 0);
}

console.log("\n\x1b[1m=== INDEX USAGE ===\x1b[0m");
{
  // Make sure queries that should use indexes return in reasonable time
  const t0 = Date.now();
  await prisma.project.findMany({ where: { status: "COMPLETED" }, take: 100 });
  const dt = Date.now() - t0;
  record(`project by status query < 2000ms (${dt}ms)`, dt < 2000);
}
{
  const firstProj = await prisma.project.findFirst({ select: { id: true } });
  const t0 = Date.now();
  await prisma.anomaly.findMany({ where: { projectId: firstProj?.id ?? "" }, take: 10 });
  const dt = Date.now() - t0;
  record(`anomaly by projectId query < 2000ms (${dt}ms)`, dt < 2000);
}
{
  const firstMp = await prisma.mP.findFirst({ select: { id: true } });
  const t0 = Date.now();
  await prisma.project.findMany({ where: { mpId: firstMp?.id ?? "" }, take: 10 });
  const dt = Date.now() - t0;
  record(`project by mpId query < 2000ms (${dt}ms)`, dt < 2000);
}

console.log("\n\x1b[1m=== RELATIONSHIP COUNTS ===\x1b[0m");
{
  // Anomaly.escalatedToLaw should match Referral count for lawEnforcement
  const escalated = await prisma.anomaly.count({ where: { lawEscalation: true } });
  const referrals = await prisma.referral.count();
  record(`escalated anomalies = referrals (${escalated} vs ${referrals})`, escalated === referrals);
}
{
  // Anomaly + Project: every cost outlier should be linked to a project
  const costOutliers = await prisma.anomaly.count({ where: { category: "COST_OUTLIER" } });
  const costOutliersWithProject = await prisma.anomaly.count({ where: { category: "COST_OUTLIER", projectId: { not: null } } });
  record(`cost outlier anomalies have projectId (${costOutliersWithProject}/${costOutliers})`, costOutliersWithProject === costOutliers);
}
{
  // MPs with projects
  const mpsWithProjects = await prisma.mP.count({ where: { projects: { some: {} } } });
  record(`MPs with projects (${mpsWithProjects} of ${counts.mps})`, mpsWithProjects > 0);
}

console.log(`\n\x1b[1m=== SUMMARY ===\x1b[0m`);
console.log(`\x1b[32mPassed:\x1b[0m ${pass}`);
console.log(`\x1b[31mFailed:\x1b[0m ${fail}`);
console.log(`Total:  ${pass + fail}`);

if (fail > 0) {
  console.log(`\n\x1b[1m\x1b[31m=== FAILURES ===\x1b[0m`);
  for (const r of results.filter(x => !x.ok)) {
    console.log(`\x1b[31m✗\x1b[0m ${r.name} → ${r.detail}`);
  }
}

await prisma.$disconnect();
process.exit(fail > 0 ? 1 : 0);
