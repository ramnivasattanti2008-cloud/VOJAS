/**
 * Law Enforcement Escalation Service
 *
 * When an anomaly is detected, the system can flag it for external investigation
 * by ACB (Anti-Corruption Bureau), Police, CVC (Central Vigilance Commission),
 * Lokayukta, or Departmental Vigilance. The system:
 *
 *  1. Marks the Anomaly with `lawEscalation = true`
 *  2. Generates a unique LawReferenceNo (e.g. VOJAS-ACB-2026-000123)
 *  3. Logs the action in AuditLog
 *  4. Fires notifications to all ADMIN/OFFICER users
 *  5. Optionally creates a Case + Referral for tracking
 *
 * Idempotent: re-escalating an already-escalated anomaly updates the reference
 * number rather than creating a duplicate referral.
 */
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { notifyAnomalyEscalatedToLaw } from "./notificationService.js";

export type LawAuthority = "ACB_OFFICE" | "POLICE_OFFICE" | "CVC" | "LOKAYUKTA" | "VIGILANCE" | "COMPTROLLER";

const AUTHORITY_LABELS: Record<LawAuthority, string> = {
  ACB_OFFICE: "ACB (Anti-Corruption Bureau)",
  POLICE_OFFICE: "Police Station",
  CVC: "CVC (Central Vigilance Commission)",
  LOKAYUKTA: "Lokayukta",
  VIGILANCE: "Departmental Vigilance",
  COMPTROLLER: "Comptroller & Auditor General",
};

const AUTHORITY_PREFIX: Record<LawAuthority, string> = {
  ACB_OFFICE: "ACB",
  POLICE_OFFICE: "POL",
  CVC: "CVC",
  LOKAYUKTA: "LKY",
  VIGILANCE: "VIG",
  COMPTROLLER: "CAG",
};

export interface LawEscalationInput {
  anomalyId: string;
  authority: LawAuthority;
  notes?: string;
  userId: string;
  notifyAllAdmins?: boolean;
}

export interface LawEscalationResult {
  success: true;
  anomalyId: string;
  authority: LawAuthority;
  authorityLabel: string;
  lawReferenceNo: string;
  escalatedAt: Date;
  escalatedById: string;
  notifiedAdmins: number;
  caseId?: string;
}

function generateReferenceNo(authority: LawAuthority, count: number): string {
  const year = new Date().getFullYear();
  return `VOJAS-${AUTHORITY_PREFIX[authority]}-${year}-${String(count).padStart(6, "0")}`;
}

export const lawEnforcementService = {
  authorityLabel(a: LawAuthority): string {
    return AUTHORITY_LABELS[a];
  },

  authorities(): Array<{ code: LawAuthority; label: string }> {
    return Object.entries(AUTHORITY_LABELS).map(([code, label]) => ({
      code: code as LawAuthority,
      label,
    }));
  },

  /**
   * Escalate an anomaly to a law-enforcement authority.
   * Generates a unique reference number, logs the action, fires notifications.
   */
  async escalate(input: LawEscalationInput): Promise<LawEscalationResult> {
    const { anomalyId, authority, notes, userId, notifyAllAdmins = true } = input;

    // 1. Verify anomaly exists
    const anomaly = await prisma.anomaly.findUnique({
      where: { id: anomalyId },
      include: { project: true },
    });
    if (!anomaly) {
      throw new Error(`Anomaly ${anomalyId} not found`);
    }

    // 2. Get next reference number for this authority+year
    const year = new Date().getFullYear();
    const existing = await prisma.anomaly.count({
      where: {
        lawAuthority: authority,
        lawEscalation: true,
        lawEscalatedAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
      },
    });
    const referenceNo = generateReferenceNo(authority, existing + 1);

    // 3. Update the anomaly
    const now = new Date();
    const updated = await prisma.anomaly.update({
      where: { id: anomalyId },
      data: {
        lawEscalation: true,
        lawAuthority: authority,
        lawReferenceNo: referenceNo,
        lawEscalatedAt: now,
        lawEscalatedById: userId,
        lawAcknowledged: false,
        lawNotes: notes ?? null,
        status: "ESCALATED",
      },
      include: {
        project: { select: { id: true, name: true, state: true, district: true, mpName: true, approvedAmount: true } },
        lawEscalatedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 4. Create a Case if not already linked
    let caseId: string | undefined;
    if (anomaly.projectId) {
      const existingCase = await prisma.case.findFirst({
        where: { anomalyId, type: "LAW_ENFORCEMENT" },
      });
      if (existingCase) {
        caseId = existingCase.id;
        await prisma.caseStatusLog.create({
          data: {
            caseId: existingCase.id,
            fromStatus: existingCase.status,
            toStatus: "ESCALATED",
            changedById: userId,
            notes: `Escalated to ${AUTHORITY_LABELS[authority]} (${referenceNo}): ${notes ?? "—"}`,
          },
        });
      } else {
        const newCase = await prisma.case.create({
          data: {
            title: `Law enforcement referral: ${anomaly.title}`,
            description: `Anomaly escalated to ${AUTHORITY_LABELS[authority]}. Reference: ${referenceNo}. ${notes ?? ""}`,
            type: "LAW_ENFORCEMENT",
            priority: anomaly.severity === "CRITICAL" ? "CRITICAL" : anomaly.severity === "HIGH" ? "HIGH" : "MEDIUM",
            status: "ESCALATED",
            projectId: anomaly.projectId,
            anomalyId,
          },
        });
        caseId = newCase.id;
      }

      // 5. Create a Referral record
      await prisma.referral.create({
        data: {
          caseId,
          projectId: anomaly.projectId,
          authority: authority === "ACB_OFFICE" ? "ANTI_CORRUPTION" : authority === "POLICE_OFFICE" ? "POLICE" : authority === "VIGILANCE" ? "VIGILANCE" : authority === "LOKAYUKTA" ? "LOKAYUKTA" : "OTHER",
          referenceNo,
          status: "SUBMITTED",
          summary: `Anomaly: ${anomaly.title} | Project: ${updated.project?.name ?? "—"} | MP: ${updated.project?.mpName ?? "—"} | Severity: ${anomaly.severity} | Risk Score: ${anomaly.riskScore}/100`,
          evidenceSummary: notes ?? anomaly.description,
          submittedById: userId,
        },
      });
    }

    // 6. Log to AuditLog
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ANOMALY_ESCALATE",
        resource: "Anomaly",
        resourceId: anomalyId,
        details: JSON.stringify({
          authority,
          referenceNo,
          caseId,
          notes,
          anomalySeverity: anomaly.severity,
          anomalyCategory: anomaly.category,
          projectId: anomaly.projectId,
        }),
      },
    });

    // 7. Fire notifications
    let notifiedAdmins = 0;
    if (notifyAllAdmins) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "OFFICER"] }, isActive: true },
          select: { id: true },
        });
        for (const a of admins) {
          await prisma.notification.create({
            data: {
              userId: a.id,
              type: "ANOMALY_ESCALATED_TO_LAW",
              title: `🚨 Anomaly escalated to ${AUTHORITY_LABELS[authority]}`,
              message: `Anomaly "${anomaly.title}" escalated. Reference: ${referenceNo}. Severity: ${anomaly.severity}.`,
              resource: "Anomaly",
              resourceId: anomalyId,
            },
          });
        }
        notifiedAdmins = admins.length;

        // Also notify the escalator
        await notifyAnomalyEscalatedToLaw(userId, anomalyId, authority, referenceNo).catch((err) => {
          logger.warn("[notify] law escalation notify failed:", err);
        });
      } catch (err) {
        logger.warn("[notify] could not notify admins about law escalation:", err);
      }
    }

    return {
      success: true,
      anomalyId,
      authority,
      authorityLabel: AUTHORITY_LABELS[authority],
      lawReferenceNo: referenceNo,
      escalatedAt: now,
      escalatedById: userId,
      notifiedAdmins,
      caseId,
    };
  },

  /**
   * Mark an escalation as acknowledged by the law authority (e.g. they confirmed receipt).
   */
  async acknowledge(referenceNo: string, notes?: string): Promise<{ success: true; referenceNo: string; acknowledgedAt: Date }> {
    const anomaly = await prisma.anomaly.findFirst({ where: { lawReferenceNo: referenceNo } });
    if (!anomaly) throw new Error(`No anomaly with reference ${referenceNo}`);

    const now = new Date();
    await prisma.anomaly.update({
      where: { id: anomaly.id },
      data: { lawAcknowledged: true, lawNotes: notes ? `${anomaly.lawNotes ?? ""}\n[ACKNOWLEDGED] ${notes}` : anomaly.lawNotes },
    });
    await prisma.referral.updateMany({
      where: { referenceNo },
      data: { status: "ACKNOWLEDGED" },
    });
    return { success: true, referenceNo, acknowledgedAt: now };
  },

  /**
   * Auto-escalate anomalies above a risk threshold to ACB.
   * Used in scheduled job.
   */
  async autoEscalateCritical(minRiskScore = 85, adminUserId: string): Promise<number> {
    const candidates = await prisma.anomaly.findMany({
      where: {
        lawEscalation: false,
        severity: { in: ["CRITICAL", "HIGH"] },
        riskScore: { gte: minRiskScore },
        status: { in: ["OPEN", "UNDER_INVESTIGATION"] },
      },
      take: 50,
    });
    let count = 0;
    for (const a of candidates) {
      try {
        // Choose authority: ACB for FINANCIAL/COST_OUTLIER, POLICE for compliance/criminal indicators
        const isFinancial = ["COST_OUTLIER", "BUDGET_OVERRUN", "FINANCIAL", "DUPLICATE"].includes(a.category);
        const authority: LawAuthority = isFinancial ? "ACB_OFFICE" : "POLICE_OFFICE";
        await this.escalate({
          anomalyId: a.id,
          authority,
          notes: `AUTO-ESCALATION: Risk score ${a.riskScore}/100 in ${a.category}.`,
          userId: adminUserId,
          notifyAllAdmins: true,
        });
        count++;
      } catch (err) {
        logger.warn(`[auto-escalate] failed for ${a.id}:`, err);
      }
    }
    return count;
  },
};
