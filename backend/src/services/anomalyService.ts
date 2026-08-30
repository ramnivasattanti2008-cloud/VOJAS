import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { AnomalyExplainer } from "./aiService.js";
import { logger } from "../utils/logger.js";
import { notifyAnomalyDetected } from "./notificationService.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AnomalyStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "UNDER_INVESTIGATION"
  | "RESOLVED"
  | "ESCALATED"
  | "DISMISSED";
export type AnomalyCategory =
  | "DUPLICATE"
  | "COST_OUTLIER"
  | "TIMELINE"
  | "BUDGET_OVERRUN"
  | "STALLED"
  | "GEOGRAPHIC"
  | "COMPLIANCE"
  | "FINANCIAL";

export interface FoundAnomaly {
  projectId: string;
  ruleCode: string;
  title: string;
  description: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  riskScore: number; // 0-100
  evidence: Record<string, unknown>;
}

// ─── Default rules registry ────────────────────────────────────────────────────

const DEFAULT_RULES = [
  {
    code: "DUPLICATE_PROJECT",
    name: "Duplicate Project Detection",
    description:
      "Flags projects in the same district and sector with very similar names registered within 6 months of each other.",
    category: "DUPLICATE" as AnomalyCategory,
    severity: "HIGH" as AnomalySeverity,
    priority: 90,
  },
  {
    code: "COST_OUTLIER",
    name: "Cost Outlier Detection",
    description:
      "Flags projects with a sanctioned amount more than 2× the median cost for the same sector in the same state.",
    category: "COST_OUTLIER" as AnomalyCategory,
    severity: "MEDIUM" as AnomalySeverity,
    priority: 80,
  },
  {
    code: "TIMELINE_ANOMALY",
    name: "Timeline Anomaly",
    description:
      "Flags projects where the expected end date is on or before the start date, or before the registration date.",
    category: "TIMELINE" as AnomalyCategory,
    severity: "HIGH" as AnomalySeverity,
    priority: 95,
  },
  {
    code: "BUDGET_OVERRUN",
    name: "Budget Overrun Detection",
    description:
      "Flags projects where the spent amount exceeds the sanctioned approved amount.",
    category: "BUDGET_OVERRUN" as AnomalyCategory,
    severity: "CRITICAL" as AnomalySeverity,
    priority: 100,
  },
  {
    code: "STALLED_PROJECT",
    name: "Stalled Project Detection",
    description:
      "Flags projects that remain in PROGRESS status for more than 3 years without reaching COMPLETED or VERIFIED.",
    category: "STALLED" as AnomalyCategory,
    severity: "MEDIUM" as AnomalySeverity,
    priority: 70,
  },
  {
    code: "UNVERIFIED_LOCATION",
    name: "Unverified Location",
    description:
      "Flags projects with high budgets (≥₹50L) that have no verified geographic location registered.",
    category: "GEOGRAPHIC" as AnomalyCategory,
    severity: "LOW" as AnomalySeverity,
    priority: 60,
  },
] as const;

// ─── Seed default rules ───────────────────────────────────────────────────────

export async function seedRules(): Promise<void> {
  for (const r of DEFAULT_RULES) {
    await prisma.anomalyRule.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        category: r.category,
        severity: r.severity,
        priority: r.priority,
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category,
        severity: r.severity,
        priority: r.priority,
        enabled: true,
        matchCount: 0,
      },
    });
  }
}

// ─── Rules engine ─────────────────────────────────────────────────────────────

async function getAllProjects() {
  return prisma.project.findMany({
    include: {
      locations: { where: { isPrimary: true } },
    },
  });
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

function stringsSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Simple Jaccard on words
  const wa = new Set(na.split(/\s+/).filter(Boolean));
  const wb = new Set(nb.split(/\s+/).filter(Boolean));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = wa.size + wb.size - inter;
  return union > 0 && inter / union >= 0.6;
}

// Rule 1: DUPLICATE_PROJECT
async function ruleDuplicateProjects(): Promise<FoundAnomaly[]> {
  const projects = await getAllProjects();
  const anomalies: FoundAnomaly[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i];
      const b = projects[j];
      const key = [a.id, b.id].sort().join("--");
      if (seen.has(key)) continue;
      seen.add(key);

      if (
        a.district === b.district &&
        a.sector === b.sector &&
        stringsSimilar(a.name, b.name)
      ) {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
        if (Math.abs(dateA.getTime() - dateB.getTime()) <= sixMonths) {
          anomalies.push({
            projectId: a.id,
            ruleCode: "DUPLICATE_PROJECT",
            title: `Potential duplicate: ${a.name}`,
            description: `Project "${a.name}" in ${a.district} appears similar to "${b.name}" (registered ${Math.round(Math.abs(dateA.getTime() - dateB.getTime()) / (24 * 60 * 60 * 1000))} days apart).`,
            category: "DUPLICATE",
            severity: "HIGH",
            riskScore: 75,
            evidence: {
              duplicateProjectId: b.id,
              duplicateName: b.name,
              duplicateDistrict: b.district,
              daysBetweenCreation:
                Math.abs(dateA.getTime() - dateB.getTime()) / (24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }
  }

  return anomalies;
}

// Rule 2: COST_OUTLIER
async function ruleCostOutliers(): Promise<FoundAnomaly[]> {
  const projects = await getAllProjects();
  const anomalies: FoundAnomaly[] = [];

  // Group by state + sector
  const groups: Record<string, typeof projects> = {};
  for (const p of projects) {
    const key = `${p.state}::${p.sector}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  for (const [, group] of Object.entries(groups)) {
    if (group.length < 3) continue; // Need at least 3 to compute a meaningful median
    const amounts = group.map((p) => p.approvedAmount).sort((a, b) => a - b);
    const median =
      amounts.length % 2 === 0
        ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
        : amounts[Math.floor(amounts.length / 2)];

    const threshold = median * 2;
    for (const p of group) {
      if (p.approvedAmount > threshold) {
        anomalies.push({
          projectId: p.id,
          ruleCode: "COST_OUTLIER",
          title: `Cost outlier: ${p.name}`,
          description: `Sanctioned amount ₹${p.approvedAmount.toLocaleString("en-IN")} is more than 2× the sector median (₹${median.toLocaleString("en-IN")}) for ${p.sector} in ${p.state}.`,
          category: "COST_OUTLIER",
          severity: "MEDIUM",
          riskScore: Math.min(85, Math.round((p.approvedAmount / (median * 3)) * 100)),
          evidence: {
            sectorMedian: median,
            sectorCount: group.length,
            deviationRatio: Math.round((p.approvedAmount / median) * 100) / 100,
          },
        });
      }
    }
  }

  return anomalies;
}

// Rule 3: TIMELINE_ANOMALY
async function ruleTimelineAnomalies(): Promise<FoundAnomaly[]> {
  const projects = await getAllProjects();
  const anomalies: FoundAnomaly[] = [];

  for (const p of projects) {
    const start = p.startDate ? new Date(p.startDate) : null;
    const end = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
    const created = new Date(p.createdAt);

    if (start && end && end <= start) {
      anomalies.push({
        projectId: p.id,
        ruleCode: "TIMELINE_ANOMALY",
        title: `Timeline anomaly: ${p.name}`,
        description: `Expected end date (${p.expectedEndDate ? p.expectedEndDate.toISOString().slice(0, 10) : "N/A"}) is on or before the start date (${p.startDate ? p.startDate.toISOString().slice(0, 10) : "N/A"}).`,
        category: "TIMELINE",
        severity: "HIGH",
        riskScore: 80,
        evidence: {
          startDate: p.startDate,
          expectedEndDate: p.expectedEndDate,
        },
      });
    }

    if (end && end <= created) {
      anomalies.push({
        projectId: p.id,
        ruleCode: "TIMELINE_ANOMALY",
        title: `Timeline anomaly: ${p.name}`,
        description: `Expected end date (${p.expectedEndDate ? p.expectedEndDate.toISOString().slice(0, 10) : "N/A"}) is on or before project creation date (${p.createdAt.toISOString().slice(0, 10)}).`,
        category: "TIMELINE",
        severity: "HIGH",
        riskScore: 90,
        evidence: {
          createdAt: p.createdAt,
          expectedEndDate: p.expectedEndDate,
        },
      });
    }
  }

  return anomalies;
}

// Rule 4: BUDGET_OVERRUN
async function ruleBudgetOverruns(): Promise<FoundAnomaly[]> {
  const projects = await getAllProjects();
  const anomalies: FoundAnomaly[] = [];

  for (const p of projects) {
    if (p.spentAmount > p.approvedAmount) {
      const overrun = p.spentAmount - p.approvedAmount;
      const overrunPct = Math.round((overrun / p.approvedAmount) * 100);
      anomalies.push({
        projectId: p.id,
        ruleCode: "BUDGET_OVERRUN",
        title: `Budget overrun: ${p.name}`,
        description: `Spent amount ₹${p.spentAmount.toLocaleString("en-IN")} exceeds sanctioned budget ₹${p.approvedAmount.toLocaleString("en-IN")} by ₹${overrun.toLocaleString("en-IN")} (${overrunPct}%).`,
        category: "BUDGET_OVERRUN",
        severity: "CRITICAL",
        riskScore: Math.min(100, 60 + Math.min(overrunPct, 40)),
        evidence: {
          approvedAmount: p.approvedAmount,
          spentAmount: p.spentAmount,
          overrunAmount: overrun,
          overrunPercent: overrunPct,
        },
      });
    }
  }

  return anomalies;
}

// Rule 5: STALLED_PROJECT
async function ruleStalledProjects(): Promise<FoundAnomaly[]> {
  const projects = await getAllProjects();
  const anomalies: FoundAnomaly[] = [];
  const THREE_YEARS = 3 * 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const p of projects) {
    if (p.status !== "IN_PROGRESS") continue;
    const start = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
    if (now - start.getTime() > THREE_YEARS) {
      const yearsStalled = Math.round((now - start.getTime()) / (365 * 24 * 60 * 60 * 1000) * 10) / 10;
      anomalies.push({
        projectId: p.id,
        ruleCode: "STALLED_PROJECT",
        title: `Stalled project: ${p.name}`,
        description: `Project in "${p.status}" status for approximately ${yearsStalled} years without reaching COMPLETED or VERIFIED.`,
        category: "STALLED",
        severity: "MEDIUM",
        riskScore: Math.min(80, 40 + Math.round(yearsStalled * 10)),
        evidence: {
          status: p.status,
          startDate: p.startDate,
          createdAt: p.createdAt,
          yearsStalled,
        },
      });
    }
  }

  return anomalies;
}

// Rule 6: UNVERIFIED_LOCATION
async function ruleUnverifiedLocations(): Promise<FoundAnomaly[]> {
  const projects = await getAllProjects();
  const anomalies: FoundAnomaly[] = [];
  const BUDGET_THRESHOLD = 50_00_000; // ₹50L

  for (const p of projects) {
    if (p.approvedAmount < BUDGET_THRESHOLD) continue;
    const primaryLoc = p.locations.find((l) => l.isPrimary);
    if (!primaryLoc || !primaryLoc.verified) {
      anomalies.push({
        projectId: p.id,
        ruleCode: "UNVERIFIED_LOCATION",
        title: `Unverified location: ${p.name}`,
        description: `High-budget project (₹${p.approvedAmount.toLocaleString("en-IN")}) has no verified primary geographic location registered.`,
        category: "GEOGRAPHIC",
        severity: "LOW",
        riskScore: 30,
        evidence: {
          approvedAmount: p.approvedAmount,
          hasLocation: !!primaryLoc,
          isVerified: primaryLoc?.verified ?? false,
          locationId: primaryLoc?.id ?? null,
        },
      });
    }
  }

  return anomalies;
}

// ─── Main scan function ────────────────────────────────────────────────────────

export async function runAnomalyScan(): Promise<{
  newAnomalies: number;
  totalAnomalies: number;
  ruleCounts: Record<string, number>;
}> {
  await seedRules();

  const enabledRules = await prisma.anomalyRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" },
  });

  const ruleMap: Record<string, () => Promise<FoundAnomaly[]>> = {
    DUPLICATE_PROJECT: ruleDuplicateProjects,
    COST_OUTLIER: ruleCostOutliers,
    TIMELINE_ANOMALY: ruleTimelineAnomalies,
    BUDGET_OVERRUN: ruleBudgetOverruns,
    STALLED_PROJECT: ruleStalledProjects,
    UNVERIFIED_LOCATION: ruleUnverifiedLocations,
  };

  const allFound: FoundAnomaly[] = [];
  for (const rule of enabledRules) {
    const fn = ruleMap[rule.code];
    if (!fn) continue;
    try {
      const results = await fn();
      allFound.push(...results);
    } catch (err) {
      console.error(`Rule ${rule.code} failed:`, err);
    }
  }

  // Upsert anomalies (avoid duplicates on same project+rule)
  let newCount = 0;
  for (const a of allFound) {
    // Check if this anomaly already exists as OPEN
    const existing = await prisma.anomaly.findFirst({
      where: {
        projectId: a.projectId,
        ruleCode: a.ruleCode,
        status: { in: ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION"] },
      },
    });

    if (!existing) {
      const project = a.projectId
        ? await prisma.project.findUnique({
            where: { id: a.projectId },
            include: {
              expenditures: true,
              locations: { where: { isPrimary: true } },
            },
          })
        : null;

      const expenditures = project?.expenditures.map((e) => ({
        amount: e.amount,
        vendor: e.vendor ?? undefined,
        invoiceNo: e.invoiceNo ?? undefined,
        paidOn: e.paidOn?.toISOString() ?? undefined,
        category: e.category,
      })) ?? [];

      const aiResult = await (async () => {
        try {
          return AnomalyExplainer.explain({
            title: a.title,
            description: a.description,
            category: a.category,
            severity: a.severity,
            riskScore: a.riskScore,
            ruleCode: a.ruleCode,
            evidence: JSON.stringify(a.evidence),
            projectName: project?.name,
            expenditures,
          });
        } catch (err) {
          logger.warn("[AI] Anomaly explanation failed:", err);
          return null;
        }
      })();

      await prisma.anomaly.create({
        data: {
          title: a.title,
          description: a.description,
          category: a.category,
          severity: a.severity,
          riskScore: a.riskScore,
          status: "OPEN",
          ruleCode: a.ruleCode,
          evidence: JSON.stringify(a.evidence),
          projectId: a.projectId,
          aiExplanation: aiResult
            ? JSON.stringify({
                explanation: aiResult.explanation,
                contributingFactors: aiResult.contributingFactors,
                recommendation: aiResult.recommendation,
              })
            : null,
          aiConfidence: aiResult?.confidence ?? null,
        },
      });
      newCount++;

      // Fire-and-forget: notify analysts and admins about the new anomaly.
      void notifyAnomalyDetected(
        a.projectId ?? "unknown",
        a.title,
        a.severity,
        project?.name,
      ).catch((err) => {
        logger.warn("[notify] anomaly notification failed:", err);
      });

      // Increment rule match count
      await prisma.anomalyRule.update({
        where: { code: a.ruleCode },
        data: { matchCount: { increment: 1 } },
      });
    }
  }

  const total = await prisma.anomaly.count();

  const ruleCounts: Record<string, number> = {};
  for (const a of allFound) {
    ruleCounts[a.ruleCode] = (ruleCounts[a.ruleCode] ?? 0) + 1;
  }

  // Update lastRun for all rules
  await prisma.anomalyRule.updateMany({
    where: { code: { in: enabledRules.map((r) => r.code) } },
    data: { lastRun: new Date() },
  });

  return { newAnomalies: newCount, totalAnomalies: total, ruleCounts };
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export async function findAnomalies(filters: {
  status?: AnomalyStatus;
  severity?: AnomalySeverity;
  category?: AnomalyCategory;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(500, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;
  if (filters.category) where.category = filters.category;
  if (filters.projectId) where.projectId = filters.projectId;

  const [items, total] = await Promise.all([
    prisma.anomaly.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true, sector: true },
        },
        acknowledgedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.anomaly.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findById(id: string) {
  const anomaly = await prisma.anomaly.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true, district: true, state: true, status: true, sector: true },
      },
      acknowledgedBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  if (!anomaly) {
    throw new AppError(404, "NOT_FOUND", `Anomaly with id '${id}' not found`);
  }

  return anomaly;
}

export async function acknowledge(id: string, userId: string) {
  const anomaly = await findById(id);
  if (!anomaly) throw new AppError(404, "NOT_FOUND", `Anomaly not found`);

  return prisma.anomaly.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedById: userId,
      acknowledgedAt: new Date(),
    },
    include: {
      project: { select: { id: true, name: true } },
      acknowledgedBy: { select: { id: true, name: true } },
    },
  });
}

export async function resolveAnomaly(
  id: string,
  userId: string,
  resolution: string
) {
  const anomaly = await findById(id);
  if (!anomaly) throw new AppError(404, "NOT_FOUND", `Anomaly not found`);

  return prisma.anomaly.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedById: userId,
      resolvedAt: new Date(),
      resolution,
    },
    include: {
      project: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });
}

export async function updateRule(id: string, enabled: boolean) {
  const rule = await prisma.anomalyRule.findUnique({ where: { id } });
  if (!rule) throw new AppError(404, "NOT_FOUND", "Anomaly rule not found");

  return prisma.anomalyRule.update({
    where: { id },
    data: { enabled },
  });
}

export async function getAnomalyStats() {
  const [total, open, critical, high, medium, low, byCategory] = await Promise.all([
    prisma.anomaly.count(),
    prisma.anomaly.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.anomaly.count({ where: { severity: "CRITICAL", status: { not: "RESOLVED" } } }),
    prisma.anomaly.count({ where: { severity: "HIGH", status: { not: "RESOLVED" } } }),
    prisma.anomaly.count({ where: { severity: "MEDIUM", status: { not: "RESOLVED" } } }),
    prisma.anomaly.count({ where: { severity: "LOW", status: { not: "RESOLVED" } } }),
    prisma.anomaly.groupBy({
      by: ["category"],
      where: { status: { not: "RESOLVED" } },
      _count: { id: true },
    }),
  ]);

  return { total, open, critical, high, medium, low, byCategory };
}
