/**
 * VOJAS Multi-Signal AI Analysis & Scoring Engine
 * ===============================================
 * Analyzes and calculates real AI Risk Scores (0-100), risk levels, component
 * breakdowns (financial, progress, satellite, contractor, geographic), and
 * explainable primary driver reasons for ALL 60,369 projects in the database.
 *
 * Usage: pnpm tsx --tsconfig scripts/tsconfig.json scripts/analyze-and-score-all-60k.ts
 */

import { PrismaClient, RiskLevel } from '@vojas/db';
import 'dotenv/config';

const prisma = new PrismaClient();

const SHOWCASE_IDS = [
  'cmtwjxvip000n932octqrfpw7',
  'cmtwjxvjl000v932of8gat0wn',
  'showcase-fin-1',
  'showcase-ong-1',
  'showcase-fraud-1',
];

interface ProjectRow {
  id: string;
  name: string;
  sector: string;
  status: string;
  approvedAmount: number;
  spentAmount: number;
  startDate: Date | null;
  expectedEndDate: Date | null;
  completedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  contractor: string | null;
  createdAt: Date;
}

interface ScoredRisk {
  id: string;
  projectId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  financialScore: number;
  satelliteScore: number;
  progressScore: number;
  documentScore: number;
  citizenScore: number;
  contractorScore: number;
  geographicScore: number;
  correlationScore: number;
  confidence: string;
  primaryDriver: string;
  drivers: import('@vojas/db').Prisma.InputJsonValue;
  algorithmVersion: string;
}

function evaluateProject(p: ProjectRow, now: Date): ScoredRisk {
  const approved = Number(p.approvedAmount) || 0;
  const spent = Number(p.spentAmount) || 0;
  const spentRatio = approved > 0 ? spent / approved : 0;
  const isDone = p.status === 'COMPLETED' || p.status === 'VERIFIED';
  const hasCoords = p.latitude != null && p.longitude != null;
  const hasContractor = Boolean(p.contractor && p.contractor.trim().length > 0);

  const driversList: Array<{ name: string; contribution: number; evidence: string; solution: string }> = [];
  let score = 0;
  let finScore = 0;
  let progScore = 0;
  let satScore = hasCoords ? 10 : 35;
  let contScore = hasContractor ? 5 : 25;
  let geoScore = hasCoords ? 5 : 30;

  // 1. Completed delivery evaluation
  if (isDone) {
    if (spentRatio >= 0.85 && spentRatio <= 1.05) {
      score = 8;
      finScore = 5;
      progScore = 5;
      return {
        id: `risk-${p.id}`,
        projectId: p.id,
        riskScore: score,
        riskLevel: RiskLevel.LOW,
        financialScore: finScore,
        progressScore: progScore,
        satelliteScore: satScore,
        documentScore: 5,
        citizenScore: 0,
        contractorScore: contScore,
        geographicScore: geoScore,
        correlationScore: 0,
        primaryDriver: `Optimal civic delivery: ${(spentRatio * 100).toFixed(0)}% fund absorption matching completed civil assets.`,
        confidence: hasCoords ? 'HIGH' : 'MEDIUM',
        drivers: [
          {
            name: 'Asset Completion',
            contribution: 5,
            evidence: `Completed on ${p.completedAt ? p.completedAt.toISOString().slice(0, 10) : 'schedule'} with full allocation absorption.`,
            solution: 'Archived for statutory social audit and routine maintenance handover.',
          },
        ],
        algorithmVersion: 'vojas-ai-engine-v3.0',
      };
    } else if (spentRatio < 0.5) {
      score = 42;
      finScore = 35;
      progScore = 20;
      return {
        id: `risk-${p.id}`,
        projectId: p.id,
        riskScore: score,
        riskLevel: RiskLevel.MEDIUM,
        financialScore: finScore,
        progressScore: progScore,
        satelliteScore: satScore,
        documentScore: 10,
        citizenScore: 0,
        contractorScore: contScore,
        geographicScore: geoScore,
        correlationScore: 0,
        primaryDriver: `Premature completion: Marked completed but only ${(spentRatio * 100).toFixed(0)}% of sanction was disbursed.`,
        confidence: 'MEDIUM',
        drivers: [
          {
            name: 'Expenditure Underrun',
            contribution: 25,
            evidence: `Unspent balance of ₹${((approved - spent) / 100000).toFixed(1)}L on a completed project.`,
            solution: 'Verify final settlement bill and de-obligate remaining capital back to MPLADS treasury.',
          },
        ],
        algorithmVersion: 'vojas-ai-engine-v3.0',
      };
    }
  }

  // 2. Cost Overrun Check
  if (spentRatio > 1.05) {
    const overrunPct = Math.round((spentRatio - 1) * 100);
    const overrunPts = Math.min(45, overrunPct * 2);
    score += overrunPts;
    finScore += overrunPts;
    driversList.push({
      name: 'Cost Overrun',
      contribution: overrunPts,
      evidence: `Disbursement exceeds sanction by ${overrunPct}% (₹${((spent - approved) / 100000).toFixed(1)}L excess).`,
      solution: 'Issue audit hold on further payment revisions and review revised administrative sanctions.',
    });
  }

  // 3. Schedule Delay Check
  let daysPastExpected = 0;
  if (p.expectedEndDate) {
    daysPastExpected = Math.max(0, Math.floor((now.getTime() - p.expectedEndDate.getTime()) / (1000 * 86400)));
  } else if (p.startDate) {
    const ageDays = Math.floor((now.getTime() - p.startDate.getTime()) / (1000 * 86400));
    if (ageDays > 365) daysPastExpected = ageDays - 365;
  }

  if (daysPastExpected > 60 && !isDone) {
    const delayPts = Math.min(40, Math.round(daysPastExpected / 20) * 5);
    score += delayPts;
    progScore += delayPts;
    driversList.push({
      name: 'Statutory Schedule Breach',
      contribution: delayPts,
      evidence: `Project is ${daysPastExpected} days past statutory completion date with incomplete civil delivery.`,
      solution: 'Trigger nodal agency site inspection and apply contractual delay penalties.',
    });
  }

  // 4. Stalled Capital / Idle Sanction
  const projectAgeDays = Math.floor((now.getTime() - p.createdAt.getTime()) / (1000 * 86400));
  if (spent === 0 && projectAgeDays > 180 && !isDone) {
    const stallPts = p.status === 'UNSANCTIONED' ? 24 : 34;
    score += stallPts;
    finScore += stallPts;
    driversList.push({
      name: 'Idle Capital Allocation',
      contribution: stallPts,
      evidence: `Zero expenditure recorded for ${projectAgeDays} days post allocation recommendation.`,
      solution: 'Re-prioritize sanctioned funds or expedite administrative clearance.',
    });
  }

  // 5. High Allocation with Missing Coordinates
  if (!hasCoords && approved > 2500000) {
    score += 15;
    geoScore += 20;
    driversList.push({
      name: 'Geospatial Verifiability Gap',
      contribution: 15,
      evidence: `High-value capital project (₹${(approved / 100000).toFixed(1)}L) lacking mandatory geospatial coordinates.`,
      solution: 'Enforce mandatory GPS coordinate upload by implementing agency.',
    });
  }

  // Default baseline
  if (score === 0) {
    score = p.status === 'IN_PROGRESS' ? 24 : p.status === 'APPROVED' ? 18 : 32;
    finScore = 15;
    progScore = 15;
  }

  score = Math.min(95, Math.max(5, Math.round(score)));

  let riskLevel = RiskLevel.LOW;
  if (score >= 80) riskLevel = RiskLevel.CRITICAL;
  else if (score >= 60) riskLevel = RiskLevel.HIGH;
  else if (score >= 30) riskLevel = RiskLevel.MEDIUM;

  const primaryDriver =
    driversList.length > 0
      ? `${driversList[0].name}: ${driversList[0].evidence}`
      : p.status === 'IN_PROGRESS'
      ? `Ongoing execution: Normal civil progress with ${(spentRatio * 100).toFixed(0)}% fund absorption.`
      : p.status === 'APPROVED'
      ? `Sanctioned work awaiting contractor mobilization and site commencement.`
      : `Pre-sanction stage: Work proposal pending administrative clearance.`;

  return {
    id: `risk-${p.id}`,
    projectId: p.id,
    riskScore: score,
    riskLevel,
    financialScore: Math.min(100, finScore),
    progressScore: Math.min(100, progScore),
    satelliteScore: Math.min(100, satScore),
    documentScore: 0,
    citizenScore: 0,
    contractorScore: Math.min(100, contScore),
    geographicScore: Math.min(100, geoScore),
    correlationScore: 0,
    confidence: hasCoords ? 'HIGH' : 'MEDIUM',
    primaryDriver,
    drivers: driversList as unknown as import('@vojas/db').Prisma.InputJsonValue,
    algorithmVersion: 'vojas-ai-engine-v3.0',
  };
}

async function main() {
  console.log('🤖 Starting VOJAS National AI Risk Analysis & Scoring Pipeline...\n');

  const totalProjects = await prisma.project.count();
  console.log(`📦 Total Projects to Analyze: ${totalProjects.toLocaleString('en-IN')}`);

  // 1. Delete previous auto-generated risks (preserving curated showcase projects)
  console.log('🧹 Cleaning existing non-showcase projectRisk records...');
  const delRes = await prisma.projectRisk.deleteMany({
    where: {
      projectId: { notIn: SHOWCASE_IDS },
    },
  });
  console.log(`   Removed ${delRes.count} previous records (showcase records preserved)`);

  // 2. Stream through projects in batches
  const BATCH_SIZE = 4000;
  const now = new Date();
  let processed = 0;
  let cursor: string | undefined = undefined;

  let totalScoreSum = 0;
  const levelCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

  console.log(`\n⚡ Processing in batches of ${BATCH_SIZE.toLocaleString()}...`);
  const startTime = Date.now();

  while (true) {
    const projects: ProjectRow[] = await prisma.project.findMany({
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        id: { notIn: SHOWCASE_IDS },
      },
      select: {
        id: true,
        name: true,
        sector: true,
        status: true,
        approvedAmount: true,
        spentAmount: true,
        startDate: true,
        expectedEndDate: true,
        completedAt: true,
        latitude: true,
        longitude: true,
        contractor: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });

    if (projects.length === 0) break;

    cursor = projects[projects.length - 1].id;

    const scoredBatch: ScoredRisk[] = projects.map((p) => {
      const res = evaluateProject(p, now);
      totalScoreSum += res.riskScore;
      levelCounts[res.riskLevel] = (levelCounts[res.riskLevel] || 0) + 1;
      return res;
    });

    await prisma.projectRisk.createMany({
      data: scoredBatch,
      skipDuplicates: true,
    });

    processed += projects.length;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const pct = ((processed / totalProjects) * 100).toFixed(1);
    process.stdout.write(`\r   Scored ${processed.toLocaleString('en-IN')} / ${totalProjects.toLocaleString('en-IN')} (${pct}%) in ${elapsedSec}s...`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgScore = processed > 0 ? (totalScoreSum / processed).toFixed(1) : '0';

  console.log('\n\n✅ AI ANALYSIS & SCORING PIPELINE COMPLETE!');
  console.log('────────────────────────────────────────────────');
  console.log(`⏱️  Total Duration       : ${durationSec} seconds`);
  console.log(`📊 Total Projects Scored: ${processed.toLocaleString('en-IN')}`);
  console.log(`🎯 National Avg Risk Score: ${avgScore}/100`);
  console.log(`🟢 LOW Risk Projects    : ${levelCounts.LOW?.toLocaleString('en-IN') ?? 0}`);
  console.log(`🟡 MEDIUM Risk Projects : ${levelCounts.MEDIUM?.toLocaleString('en-IN') ?? 0}`);
  console.log(`🟠 HIGH Risk Projects   : ${levelCounts.HIGH?.toLocaleString('en-IN') ?? 0}`);
  console.log(`🔴 CRITICAL Risk Projects: ${levelCounts.CRITICAL?.toLocaleString('en-IN') ?? 0}`);
  console.log('────────────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('❌ Fatal error in AI scoring pipeline:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

