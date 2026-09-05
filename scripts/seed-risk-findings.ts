/**
 * VOJAS Risk Findings Seed Script
 * =============================================================
 * Seeds supporting data (satellite observations, progress reports,
 * financial records) then runs the RiskAnalysisOrchestrator on all
 * IN_PROGRESS projects so the M8 dashboard pages are populated.
 *
 * Idempotent — safe to re-run.  Will skip existing records.
 * Usage: pnpm tsx scripts/seed-risk-findings.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@vojas/db';
import { RiskAnalysisOrchestrator } from '@vojas/domain';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const orchestrator = new RiskAnalysisOrchestrator(prisma);

// ── Risk rules ─────────────────────────────────────────────────────

const RISK_RULES = [
  {
    id: 'rule-progress-sat-mismatch',
    name: 'Progress–Satellite Mismatch',
    category: 'progress_satellite_mismatch',
    conditions: JSON.stringify({
      type: 'composite',
      logic: 'AND',
      conditions: [
        { field: 'reportedProgress', op: 'gt', value: 50 },
        { field: 'satelliteConstructionScore', op: 'lt', value: 30 },
      ],
    }),
    severityModifier: 'HIGH',
    confidenceModifier: 'MEDIUM',
    explanationTemplate:
      'Reported progress of {{reportedProgress}}% exceeds satellite-observed construction score of {{satelliteConstructionScore}}%.',
  },
  {
    id: 'rule-cost-overrun',
    name: 'Cost Overrun Detection',
    category: 'cost_anomaly',
    conditions: JSON.stringify({
      type: 'composite',
      logic: 'AND',
      conditions: [
        { field: 'spentRatio', op: 'gt', value: 1.1 },
        { field: 'reportedProgress', op: 'lt', value: 70 },
      ],
    }),
    severityModifier: 'CRITICAL',
    confidenceModifier: 'HIGH',
    explanationTemplate:
      'Spent {{spentAmount}} exceeds 110% of expected ({{expectedSpend}}). Progress reported at {{reportedProgress}}%.',
  },
  {
    id: 'rule-schedule-delay',
    name: 'Schedule Delay Flag',
    category: 'schedule_delay',
    conditions: JSON.stringify({
      type: 'composite',
      logic: 'OR',
      conditions: [
        { field: 'daysPastExpected', op: 'gt', value: 90 },
        { field: 'reportedProgress', op: 'lt', value: 50 },
      ],
    }),
    severityModifier: 'MEDIUM',
    confidenceModifier: 'LOW',
    explanationTemplate:
      'Project is {{daysPastExpected}} days past expected completion with only {{reportedProgress}}% progress.',
  },
];

// ── Satellite observations ───────────────────────────────────────────

function makeSatelliteObservation(
  projectId: string,
  daysAgo: number,
  score: number,
  classification: string,
  cloudCover = 8
) {
  return {
    projectId,
    observationDate: new Date(Date.now() - daysAgo * 86_400_000),
    centerLat: 12.9716,
    centerLng: 77.5946,
    cloudCover,
    resolution: 10,
    sceneId: `S2A_${projectId.slice(-8)}_${daysAgo}d`,
    constructionScore: score,
    vegetationHealth: 65,
    areaM2: 5000,
    tileUrl: null,
    assetUrls: null,
    bandData: null,
    thumbnailUrl: null,
    processingStatus: 'COMPLETED' as const,
    changeClassification: classification,
  };
}

// ── Progress observations ───────────────────────────────────────────

function makeProgressObservation(projectId: string, date: Date, progress: number, source = 'FIELD_REPORT') {
  return {
    projectId,
    reportDate: date,
    reportedProgress: progress,
    reportSource: source,
    observedChange: progress > 30 ? 'INCREASE' : 'STABLE',
    verificationResult: 'VERIFIED',
    notes: null,
  };
}

// ── Financial observations ──────────────────────────────────────────

function makeFinancialObservation(
  projectId: string,
  date: Date,
  amount: number,
  type: 'EXPENDITURE' | 'SANCTION' | 'REVISION'
) {
  return {
    projectId,
    date,
    type,
    amount,
    category: 'WORK',
    description: `${type} of ${(amount / 1_000_000).toFixed(1)}M`,
  };
}

// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🛡️  VOJAS Risk Findings Seed\n');

  // 1. Seed risk rules
  console.log('📋 Seeding risk rules...');
  for (const rule of RISK_RULES) {
    await prisma.riskRule.upsert({
      where: { id: rule.id },
      update: {},
      create: rule,
    });
  }
  console.log(`  ✅ ${RISK_RULES.length} risk rules ready`);

  // 2. Find IN_PROGRESS projects
  const projects = await prisma.project.findMany({
    where: { status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'asc' },
  });

  if (projects.length === 0) {
    console.log('  ⚠️  No IN_PROGRESS projects found — run the DB seed first.');
    console.log('  ℹ️  Run:  pnpm --filter @vojas/db prisma db seed\n');
    return;
  }
  console.log(`  📦 Found ${projects.length} IN_PROGRESS project(s)\n`);

  // 3. Seed supporting data + run orchestrator per project
  let totalSignals = 0;
  let totalFindings = 0;
  let totalFailed = 0;

  for (const project of projects) {
    console.log(`\n  🔍 ${project.name}`);
    console.log(`     ID: ${project.id}`);

    // 3a. Satellite observation (if none exists)
    const existingSat = await prisma.satelliteObservation.findFirst({
      where: { projectId: project.id },
    });

    if (!existingSat) {
      // Inject a "recent" satellite observation so data quality gate passes
      const satScore = project.name.includes('Road')
        ? 15
        : project.name.includes('School')
        ? 42
        : project.name.includes('Water')
        ? 8
        : project.name.includes('Health')
        ? 55
        : 28;
      const classification =
        satScore < 20
          ? 'NO_CONSTRUCTION'
          : satScore < 45
          ? 'PARTIAL'
          : 'ACTIVE';

      await prisma.satelliteObservation.create({
        data: makeSatelliteObservation(project.id, 14, satScore, classification),
      });
      console.log(`     📡 Satellite obs added (score: ${satScore}, classification: ${classification})`);
    } else {
      console.log(`     📡 Satellite observation already exists — using existing`);
    }

    // 3b. Progress observations (if none exist)
    const existingProgress = await prisma.progressObservation.findFirst({
      where: { projectId: project.id },
    });

    if (!existingProgress) {
      const approved = Number(project.approvedAmount) || 0;
      const spent = Number(project.spentAmount) || 0;
      const spentRatio = approved > 0 ? spent / approved : 0;
      // Reported progress tracks spent ratio — conservative to avoid false positives
      const reportedProgress = Math.min(95, Math.round(spentRatio * 100));

      await prisma.progressObservation.createMany({
        data: [
          makeProgressObservation(project.id, new Date('2026-03-01'), Math.max(10, reportedProgress - 20)),
          makeProgressObservation(project.id, new Date('2026-05-15'), Math.max(20, reportedProgress - 8)),
          makeProgressObservation(project.id, new Date('2026-07-01'), reportedProgress),
        ],
      });
      console.log(`     📊 3 progress observations added (reported: ${reportedProgress}%)`);
    } else {
      console.log(`     📊 Progress observations already exist`);
    }

    // 3c. Financial observations (if none exist)
    const existingFinancial = await prisma.financialObservation.findFirst({
      where: { projectId: project.id },
    });

    if (!existingFinancial) {
      const approved = Number(project.approvedAmount) || 0;
      const spent = Number(project.spentAmount) || 0;
      await prisma.financialObservation.createMany({
        data: [
          makeFinancialObservation(project.id, new Date('2026-01-15'), approved * 0.4, 'EXPENDITURE'),
          makeFinancialObservation(project.id, new Date('2026-04-01'), approved * 0.4, 'EXPENDITURE'),
          makeFinancialObservation(project.id, new Date('2026-06-15'), approved * 0.2, 'EXPENDITURE'),
          makeFinancialObservation(project.id, new Date('2026-07-01'), approved, 'SANCTION'),
        ],
      });
      console.log(`     💰 Financial observations added`);
    } else {
      console.log(`     💰 Financial observations already exist`);
    }

    // 3d. Run orchestrator
    console.log(`     ⚙️  Running RiskAnalysisOrchestrator.analyze()...`);
    try {
      const result = await orchestrator.analyze(project.id, { persist: true, forceNewRun: true });

      if (result.status === 'INSUFFICIENT_DATA') {
        console.log(`     ⚠️  INSUFFICIENT_DATA — data quality gate blocked`);
        console.log(`        Reasons: ${result.dataQuality.reasons.join('; ')}`);
      } else if (result.status === 'FAILED') {
        console.log(`     ❌ FAILED — ${result.error}`);
        totalFailed++;
      } else {
        totalSignals += result.signalsCount;
        totalFindings += result.findingsCount;
        console.log(
          `     ✅ ${result.status} — score: ${result.riskScore}/100 (${result.riskLevel}), ` +
            `signals: ${result.signalsCount}, findings: ${result.findingsCount}`
        );
        if (result.findingsCount > 0) {
          for (const f of result.findings) {
            console.log(`        • [${f.severity}] ${f.title}`);
          }
        }
      }
    } catch (err) {
      console.log(`     ❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
      totalFailed++;
    }
  }

  // 4. Summary
  console.log('\n────────────────────────────────────────');
  console.log(`📊 Risk Analysis Summary`);
  console.log(`   Projects processed : ${projects.length}`);
  console.log(`   Total signals     : ${totalSignals}`);
  console.log(`   Total findings    : ${totalFindings}`);
  console.log(`   Failed            : ${totalFailed}`);
  console.log('────────────────────────────────────────\n');
}

main()
  .catch(e => {
    console.error('\n❌ Fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
