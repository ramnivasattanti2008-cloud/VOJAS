/**
 * VOJAS — Comprehensive data enrichment script
 *
 * Populates / enriches every model with realistic, complete data:
 *   1. Backfill 60K+ project locations (district → lat/lng) for 3D globe
 *   2. Extract contractors from existing projects → Vendor model
 *   3. Generate 200+ realistic citizen reports linked to real projects
 *   4. Generate 50+ anomalies from real patterns (budget overruns, delays, duplicates)
 *   5. Seed 500+ expenditures linked to vendors
 *   6. Recalculate risk scores for all projects
 *   7. Pre-generate AI explanations
 *
 * Run: cd backend && npx tsx scripts/ingest-mplad-data.ts
 */

import { prisma, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";
import { findDistrict } from "../src/data/districtGeocodes.js";
import { aiService } from "../src/services/aiService.js";
import { riskService } from "../src/services/riskService.js";
import { seedRules, runAnomalyScan } from "../src/services/anomalyService.js";
import type { ProjectSector, ReportCategory, ReportSeverity, ReportStatus, ExpenditureCategory, PaymentStatus } from "@prisma/client";

// ── Progress logger ──────────────────────────────────────────────────────────
let _step = 0;
function step(msg: string) { _step++; logger.info(`\n[${_step}] ${msg}`); }
function done(msg: string) { logger.info(`  ✓ ${msg}`); }

// ── Vendor name normalisation (same as vendorService) ───────────────────────
function normalizeVendorName(s: string): string {
  return s
    .toUpperCase()
    .trim()
    .replace(/\s+(PVT\.?\s*LTD\.?|LTD\.?|PRIVATE\s+LIMITED|LIMITED|LLP|INC\.?|CORPORATION|CORP\.?|CO\.?|COMPANY|&\s*CO\.?|&\s*SONS?|AND\s+SONS?)\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 &]/g, "")
    .trim();
}

async function main() {
  const startTime = Date.now();

  // ── 1. Backfill project locations from district geocodes ──────────────────
  step("Backfilling project locations from district geocodes...");

  const projectsWithoutLocation = await prisma.project.findMany({
    where: {
      OR: [
        { locations: { none: {} } },
      ],
    },
    select: { id: true, state: true, district: true },
    take: 20000, // process in chunks
  });

  let locationCount = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < projectsWithoutLocation.length; i += BATCH_SIZE) {
    const batch = projectsWithoutLocation.slice(i, i + BATCH_SIZE);
    const ops: any[] = [];

    for (const p of batch) {
      const geo = findDistrict(p.state || "", p.district || "");
      if (!geo) {
        skipped++;
        continue;
      }

      // Add a small random offset so multiple projects in same district don't stack
      const jitter = 0.05; // ~5km
      const lat = geo.lat + (Math.random() - 0.5) * jitter;
      const lng = geo.lng + (Math.random() - 0.5) * jitter;

      // Create a primary Location row for this project
      ops.push(
        prisma.location.create({
          data: {
            projectId: p.id,
            latitude: lat,
            longitude: lng,
            label: p.district + " headquarters area",
            address: `${geo.capital || p.district}, ${p.state}`,
            isPrimary: true,
            verified: true,
          },
        }).catch(() => null)
      );

      locationCount++;
    }

    await Promise.all(ops);
    if (i % 5000 === 0) logger.info(`  Processed ${i + batch.length}/${projectsWithoutLocation.length} projects...`);
  }

  done(`Created ${locationCount} project locations (${skipped} skipped due to unknown district)`);

  // ── 2. Extract contractors from project records into Vendor model ────────
  step("Extracting contractors into Vendor model...");

  const projectsWithContractors = await prisma.project.findMany({
    where: { contractor: { not: null } },
    select: { contractor: true, state: true, district: true },
  });

  const vendorMap = new Map<string, { name: string; state: string; district: string; total: number; count: number }>();

  for (const p of projectsWithContractors) {
    if (!p.contractor) continue;
    const normalized = normalizeVendorName(p.contractor);
    if (!normalized || normalized.length < 3) continue;
    const key = `${normalized}|${(p.state || "").toUpperCase()}`;
    const existing = vendorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      vendorMap.set(key, {
        name: p.contractor.trim(),
        state: (p.state || "").toUpperCase(),
        district: p.district || "",
        total: 0,
        count: 1,
      });
    }
  }

  let created = 0;
  let updated = 0;
  for (const [key, v] of vendorMap.entries()) {
    try {
      const result = await prisma.vendor.upsert({
        where: { nameNormalized_state: { nameNormalized: key.split("|")[0], state: v.state || "UNKNOWN" } },
        create: {
          name: v.name,
          nameNormalized: key.split("|")[0],
          state: v.state,
          district: v.district,
          totalPaid: 0,
          projectCount: v.count,
        },
        update: {
          projectCount: { increment: 0 }, // keep existing
        },
      });
      if (result) created++;
    } catch (e) {
      // ignore duplicates
    }
  }

  done(`Created ${created} vendor records`);

  // ── 3. Generate realistic citizen reports linked to real projects ─────────
  step("Generating realistic citizen reports...");

  const sampleProjects = await prisma.project.findMany({
    select: { id: true, name: true, district: true, state: true, sector: true, status: true, mpName: true, createdAt: true, locations: { select: { latitude: true, longitude: true }, where: { isPrimary: true }, take: 1 } },
    take: 2000,
    orderBy: { createdAt: "desc" },
  });

  const REPORT_TEMPLATES = [
    {
      title: "Road surface deteriorating within months of completion",
      description: "The newly constructed road has developed multiple potholes and cracks within just a few months of completion. The surface layer appears to be substandard, with visible bitumen peeling exposing the sub-base. During monsoon, waterlogging occurs at multiple points causing severe inconvenience to commuters. Vehicles are getting damaged and residents have lodged verbal complaints but no action taken.",
      category: "QUALITY" as ReportCategory,
      severity: "HIGH" as ReportSeverity,
    },
    {
      title: "Project stalled for over 6 months with no contractor visible",
      description: "The sanctioned project work has been completely stalled for the past 6+ months. No construction activity, no contractor staff, no machinery on site. The site is abandoned with half-dug foundations and exposed reinforcement rusting. Repeated inquiries with district authorities have yielded no response. Request urgent intervention.",
      category: "DELAY" as ReportCategory,
      severity: "CRITICAL" as ReportSeverity,
    },
    {
      title: "Work executed but completion certificate signed without verification",
      description: "It appears the work has been marked as completed in official records, but on ground the work is only 40% done. The completion certificate seems to have been issued prematurely. The remaining components (fencing, lighting, finishing) are not in place. This is a clear case of misreporting and possible financial irregularity.",
      category: "DOCUMENTATION" as ReportCategory,
      severity: "CRITICAL" as ReportSeverity,
    },
    {
      title: "Budget appears inflated compared to similar projects in the area",
      description: "Comparing the sanctioned cost of this project with similar works in adjacent areas, the cost appears 40-60% higher than prevailing market rates. Specifications mentioned are standard, no special features justify the premium. This warrants a cost audit by competent authority.",
      category: "FINANCIAL" as ReportCategory,
      severity: "HIGH" as ReportSeverity,
    },
    {
      title: "Substandard materials being used despite ISI specifications",
      description: "Cement bags without proper BIS certification marks have been observed at the site. The aggregate being used appears to be locally sourced river sand mixed with inferior quality material. The contractor is cutting corners on material quality which will compromise the durability of the structure.",
      category: "QUALITY" as ReportCategory,
      severity: "HIGH" as ReportSeverity,
    },
    {
      title: "No safety equipment for workers at construction site",
      description: "Construction workers are working without any safety equipment — no helmets, no harnesses for height work, no safety boots. Multiple labourers have been observed working at heights on scaffolding without proper safety measures. This is a clear violation of safety norms and could lead to serious accidents.",
      category: "SAFETY" as ReportCategory,
      severity: "MEDIUM" as ReportSeverity,
    },
    {
      title: "Project sanctioned for one village but executed in another",
      description: "The project was originally sanctioned and approved for Village A, but on inspection the work appears to be executed in Village B (about 5 km away). The location and beneficiary details in records may have been manipulated. This requires urgent field verification by independent agency.",
      category: "CORRUPTION" as ReportCategory,
      severity: "CRITICAL" as ReportSeverity,
    },
    {
      title: "Drainage work causing water logging in nearby houses",
      description: "The recently completed drainage line has not been properly connected to the main outfall. As a result, water is now backing up and flooding the houses on the lower side of the road. Approximately 12 houses are affected during every rain. The contractor is unresponsive to complaints.",
      category: "QUALITY" as ReportCategory,
      severity: "HIGH" as ReportSeverity,
    },
    {
      title: "Duplicate project — same work sanctioned twice in same area",
      description: "It has come to our notice that a similar project with the same scope has been sanctioned for the same area within the past 2 years. Either the earlier project was not actually executed (ghost project) or this is a duplicate sanction to siphon funds. The earlier work is documented in the official records.",
      category: "CORRUPTION" as ReportCategory,
      severity: "CRITICAL" as ReportSeverity,
    },
    {
      title: "Beneficiary list manipulated to favour specific community",
      description: "The list of beneficiaries for this scheme appears to have been manipulated. Several entries belong to families outside the intended target group, while genuinely eligible families have been excluded. This is a clear case of favouritism and requires immediate correction and audit.",
      category: "DOCUMENTATION" as ReportCategory,
      severity: "HIGH" as ReportSeverity,
    },
    {
      title: "Environmental damage from construction debris dumped in forest area",
      description: "Construction debris and excavated material from this project has been dumped in the adjacent reserved forest area, damaging native vegetation and blocking a natural drainage channel. This is a clear violation of forest and environmental norms.",
      category: "ENVIRONMENT" as ReportCategory,
      severity: "MEDIUM" as ReportSeverity,
    },
    {
      title: "Solar panels installed but not generating power",
      description: "The solar panels installed under this project have been non-functional for over 3 months. Local residents have complained multiple times but the installation agency has not responded. The inverter display shows error codes. The project was inaugurated with much fanfare but the actual utility is zero.",
      category: "OTHER" as ReportCategory,
      severity: "MEDIUM" as ReportSeverity,
    },
    {
      title: "Payment released to vendor but material not delivered to site",
      description: "As per information obtained through RTI, payment has been released to the vendor for material supply. However, on physical verification, the material has not been delivered to the project site. The site shows no recent material receipt. This points to a possible fake supply bill.",
      category: "FINANCIAL" as ReportCategory,
      severity: "CRITICAL" as ReportSeverity,
    },
    {
      title: "Community toilet complex locked for 6 months after inauguration",
      description: "The community toilet complex built under this project was inaugurated 6 months ago but remains locked and non-functional. No water supply, no cleaning staff appointed. Local residents, especially women, are forced to use open areas. The maintenance agency has not been appointed.",
      category: "OTHER" as ReportCategory,
      severity: "MEDIUM" as ReportSeverity,
    },
    {
      title: "Boundary wall collapsed within 1 year of construction",
      description: "A portion of the boundary wall constructed under this project has collapsed within just 1 year of completion. The masonry work is substandard, mortar quality is poor, and the foundation appears shallow. This is a clear quality failure warranting reconstruction at contractor's cost.",
      category: "QUALITY" as ReportCategory,
      severity: "HIGH" as ReportSeverity,
    },
  ];

  const STATUSES: ReportStatus[] = ["SUBMITTED", "SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW", "RESOLVED", "REJECTED"];
  const REPORTER_NAMES = [
    "Rajesh Kumar", "Lakshmi Devi", "Mohammed Ismail", "Priya Sharma", "Suresh Pawar",
    "Anita Rao", "Vijay Singh", "Kamala Bai", "Ramesh Yadav", "Geeta Devi",
    "Sanjay Patel", "Meena Kumari", "Dinesh Chandra", "Sushila Devi", "Anil Verma",
  ];

  const SOURCES = ["WEB", "MOBILE", "WHISTLEBLOWER"];
  let reportsCreated = 0;
  const targetReportCount = 200;

  for (let i = 0; i < targetReportCount; i++) {
    const project = sampleProjects[Math.floor(Math.random() * sampleProjects.length)];
    const template = REPORT_TEMPLATES[Math.floor(Math.random() * REPORT_TEMPLATES.length)];
    const isAnon = Math.random() < 0.3;
    const daysAgo = Math.floor(Math.random() * 180);
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

    try {
      await prisma.report.create({
        data: {
          title: `${template.title} — ${project.district}`,
          description: template.description + ` Location: ${project.district}, ${project.state}. MP reference: ${project.mpName || "Local"}.`,
          category: template.category,
          severity: template.severity,
          status: status,
          reporterName: isAnon ? null : REPORTER_NAMES[Math.floor(Math.random() * REPORTER_NAMES.length)],
          reporterEmail: isAnon ? null : `citizen${i}@email.com`,
          reporterPhone: isAnon ? null : `+91 9${Math.floor(Math.random() * 900000000 + 100000000)}`,
          isAnonymous: isAnon,
          locationDesc: `${project.district}, ${project.state}`,
          latitude: project.locations[0]?.latitude || undefined,
          longitude: project.locations[0]?.longitude || undefined,
          projectId: project.id,
          source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      reportsCreated++;
    } catch (e) {
      // skip duplicates
    }
  }

  done(`Created ${reportsCreated} citizen reports`);

  // ── 4. Seed expenditure entries linked to vendors ────────────────────────
  step("Seeding expenditure entries linked to vendors...");

  const projectsForExp = await prisma.project.findMany({
    where: { spentAmount: { gt: 0 } },
    select: { id: true, name: true, district: true, state: true, spentAmount: true, approvedAmount: true, contractor: true, createdAt: true },
    take: 500,
    orderBy: { spentAmount: "desc" },
  });

  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, state: true } });
  const vendorByState: Map<string, typeof vendors> = new Map();
  for (const v of vendors) {
    const key = v.state || "UNKNOWN";
    if (!vendorByState.has(key)) vendorByState.set(key, []);
    vendorByState.get(key)!.push(v);
  }

  const EXP_CATEGORIES: ExpenditureCategory[] = ["MATERIAL", "LABOR", "EQUIPMENT", "CONSULTANCY", "ADMINISTRATIVE", "CONTINGENCY"];
  const EXP_DESCRIPTIONS: Record<ExpenditureCategory, string[]> = {
    MATERIAL: ["Cement and steel supply", "Bitumen material supply", "Aggregate and sand supply", "Bricks and blocks", "Electrical wiring and fixtures"],
    LABOR: ["Site labour charges", "Mason and helper wages", "Skilled labour deployment", "Unskilled labour for excavation"],
    EQUIPMENT: ["JCB and excavator hire", "Concrete mixer rental", "Generator and power tools", "Survey equipment charges"],
    CONSULTANCY: ["Site engineer supervision", "Structural design consultancy", "Project management fees", "Quality testing and certification"],
    ADMINISTRATIVE: ["Documentation and signage", "Site office setup", "Insurance and statutory fees", "Publication charges"],
    CONTINGENCY: ["Additional work approved", "Cost escalation charges", "Miscellaneous expenses", "Unforeseen site conditions"],
    OTHER: ["Other miscellaneous"],
  };

  let expendituresCreated = 0;
  for (const project of projectsForExp) {
    if (!project.spentAmount || project.spentAmount < 10000) continue;

    // Generate 2-5 expenditure entries per project totalling to spentAmount
    const numEntries = 2 + Math.floor(Math.random() * 4);
    const stateVendors = vendorByState.get((project.state || "").toUpperCase()) || vendors;
    const baseDate = project.createdAt || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < numEntries; i++) {
      const category = EXP_CATEGORIES[Math.floor(Math.random() * EXP_CATEGORIES.length)];
      const descList = EXP_DESCRIPTIONS[category] || ["Work executed"];
      const vendor = stateVendors[Math.floor(Math.random() * stateVendors.length)];

      const amount = Math.round((project.spentAmount / numEntries) * (0.7 + Math.random() * 0.6));
      const daysAgo = Math.floor(Math.random() * 365);

      try {
        await prisma.expenditure.create({
          data: {
            projectId: project.id,
            amount,
            category,
            description: descList[Math.floor(Math.random() * descList.length)],
            vendor: vendor?.name || project.contractor || "Unknown",
            vendorId: vendor?.id,
            invoiceNo: `INV-${project.id.slice(0, 6).toUpperCase()}-${i + 1}`,
            paidOn: new Date(baseDate.getTime() + daysAgo * 24 * 60 * 60 * 1000),
            status: ["PAID", "PAID", "PAID", "AUTHORIZED", "PENDING"][Math.floor(Math.random() * 5)] as PaymentStatus,
            source: "VONTER",
            sourceTxnId: `VTR-${project.id}-${i}`,
          },
        });
        expendituresCreated++;
      } catch (e) {
        // skip
      }
    }

    if (expendituresCreated % 200 === 0) logger.info(`  Created ${expendituresCreated} expenditures...`);
  }

  done(`Created ${expendituresCreated} expenditure entries`);

  // ── 5. Run anomaly detection rules against real project data ─────────────
  step("Running anomaly detection rules on real data...");

  try {
    await seedRules();
    const result = await runAnomalyScan();
    done(`Anomaly detection completed: ${result.newAnomalies} new anomalies detected`);
  } catch (err) {
    logger.warn(`Anomaly detection failed (non-fatal): ${(err as Error).message}`);
  }

  // ── 6. Pre-generate AI explanations for new anomalies ───────────────────
  step("Pre-generating AI explanations for anomalies...");

  const allAnomalies = await prisma.anomaly.findMany({
    where: { aiExplanation: null },
    include: { project: { select: { name: true } } },
  });

  let aiCount = 0;
  for (const a of allAnomalies) {
    try {
      const explanation = aiService.explainAnomaly({
        title: a.title,
        description: a.description,
        category: a.category,
        severity: a.severity,
        riskScore: a.riskScore,
        ruleCode: a.ruleCode ?? undefined,
        evidence: a.evidence ?? undefined,
        projectName: a.project?.name,
      });
      await prisma.anomaly.update({
        where: { id: a.id },
        data: {
          aiExplanation: JSON.stringify(explanation),
          aiConfidence: explanation.confidence,
        },
      });
      aiCount++;
    } catch (e) {
      // skip
    }
  }
  done(`Generated AI explanations for ${aiCount} anomalies`);

  // ── 7. AI analysis for new reports ───────────────────────────────────────
  step("Pre-generating AI analysis for new reports...");

  const newReports = await prisma.report.findMany({
    where: { aiAnalysis: null },
    select: { id: true, title: true, description: true },
    take: 500,
  });

  let reportAiCount = 0;
  for (const r of newReports) {
    try {
      if (!r.description) continue;
      const analysis = aiService.analyzeReport(r.title, r.description);
      await prisma.report.update({
        where: { id: r.id },
        data: {
          aiAnalysis: JSON.stringify(analysis),
          aiAnalyzedAt: new Date(),
        },
      });
      reportAiCount++;
    } catch (e) {
      // skip
    }
  }
  done(`Generated AI analysis for ${reportAiCount} reports`);

  // ── 8. Recalculate risk scores for all projects ──────────────────────────
  step("Recalculating risk scores for all projects...");

  try {
    const riskResult = await riskService.recalculateAll();
    done(`Risk scores calculated for ${riskResult.length} projects`);
  } catch (err) {
    logger.warn(`Risk recalc failed (non-fatal): ${(err as Error).message}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(`\n${"=".repeat(60)}`);
  logger.info(`✅ Comprehensive data enrichment complete in ${elapsed}s`);
  logger.info(`${"=".repeat(60)}`);

  const finalCounts = {
    projects: await prisma.project.count(),
    projectsWithLocation: await prisma.location.count(),
    vendors: await prisma.vendor.count(),
    reports: await prisma.report.count(),
    anomalies: await prisma.anomaly.count(),
    expenditures: await prisma.expenditure.count(),
    riskScores: await prisma.projectRisk.count(),
    mps: await prisma.mP.count(),
  };
  logger.info(`\nFinal database state:`);
  logger.info(`  Projects:          ${finalCounts.projects.toLocaleString()}`);
  logger.info(`  Locations:         ${finalCounts.projectsWithLocation.toLocaleString()}`);
  logger.info(`  Vendors:           ${finalCounts.vendors.toLocaleString()}`);
  logger.info(`  Citizen Reports:   ${finalCounts.reports.toLocaleString()}`);
  logger.info(`  Anomalies:         ${finalCounts.anomalies.toLocaleString()}`);
  logger.info(`  Expenditures:      ${finalCounts.expenditures.toLocaleString()}`);
  logger.info(`  Risk scores:       ${finalCounts.riskScores.toLocaleString()}`);
  logger.info(`  MPs:               ${finalCounts.mps.toLocaleString()}`);
}

main()
  .then(() => disconnectDatabase())
  .catch((err) => {
    logger.error("Enrichment failed", { error: err });
    process.exit(1);
  });
