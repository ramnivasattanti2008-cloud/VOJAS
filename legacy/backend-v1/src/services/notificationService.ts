import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import type { NotificationType } from "@prisma/client";

/**
 * Notification service — fans out events to in-app notifications.
 *
 * Design notes:
 * - Fire-and-forget. A failure to create a notification MUST NOT fail the
 *   triggering business operation.
 * - Broadcasts to a *role* (e.g. "all ANALYSTS") or to a *single user*
 *   (e.g. an officer whose report just got a new reply).
 * - Notifications are read at /api/v1/notifications and marked read with PATCH.
 */

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  resource?: string;
  resourceId?: string;
  /** A single user */
  userId?: string;
  /** A list of users (e.g. all assigned officers) */
  userIds?: string[];
  /** Broadcast to every user with one of these roles */
  role?: "ADMIN" | "OFFICER" | "REVIEWER" | "ANALYST" | "VIEWER";
  /** Optional extra: only include users with this role AND in this list */
  roleIntersectUserIds?: string[];
}

export async function notify(input: NotifyInput): Promise<number> {
  try {
    let recipientIds: string[] = [];

    if (input.userId) {
      recipientIds = [input.userId];
    } else if (input.userIds) {
      recipientIds = input.userIds;
    } else if (input.role) {
      const users = await prisma.user.findMany({
        where: { role: input.role },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
    } else {
      logger.warn("[notify] No recipient specified; skipping");
      return 0;
    }

    if (input.roleIntersectUserIds) {
      const set = new Set(input.roleIntersectUserIds);
      recipientIds = recipientIds.filter((id) => set.has(id));
    }

    if (recipientIds.length === 0) {
      return 0;
    }

    // Deduplicate (in case of role+userIds overlap)
    recipientIds = Array.from(new Set(recipientIds));

    const result = await prisma.notification.createMany({
      data: recipientIds.map((uid) => ({
        userId: uid,
        type: input.type,
        title: input.title,
        message: input.message,
        resource: input.resource,
        resourceId: input.resourceId,
      })),
    });

    return result.count;
  } catch (err) {
    logger.error("[notify] Failed to create notification:", err);
    return 0;
  }
}

// ── Convenience helpers for common events ──────────────────────────────────

export async function notifyAnomalyDetected(
  anomalyId: string,
  title: string,
  severity: string,
  projectName?: string,
): Promise<void> {
  // Broadcast to all analysts and admins.
  await notify({
    type: "ANOMALY_DETECTED",
    title: `New ${severity} anomaly detected`,
    message: projectName
      ? `${title} — project: ${projectName}`
      : title,
    resource: "Anomaly",
    resourceId: anomalyId,
    role: "ANALYST",
  });
  // Admins also see it.
  await notify({
    type: "ANOMALY_DETECTED",
    title: `New ${severity} anomaly detected`,
    message: projectName
      ? `${title} — project: ${projectName}`
      : title,
    resource: "Anomaly",
    resourceId: anomalyId,
    role: "ADMIN",
  });
}

export async function notifyReportSubmitted(
  reportId: string,
  title: string,
  category: string,
): Promise<void> {
  await notify({
    type: "REPORT_SUBMITTED",
    title: "New citizen report",
    message: `${category.toUpperCase()}: ${title}`,
    resource: "Report",
    resourceId: reportId,
    role: "REVIEWER",
  });
  await notify({
    type: "REPORT_SUBMITTED",
    title: "New citizen report",
    message: `${category.toUpperCase()}: ${title}`,
    resource: "Report",
    resourceId: reportId,
    role: "OFFICER",
  });
}

/**
 * Alert admins and analysts when a project crosses into HIGH or CRITICAL risk.
 */
export async function notifyRiskThreshold({
  projectId,
  projectName,
  newLevel,
  score,
}: {
  projectId: string;
  projectName: string;
  newLevel: string;
  score: number;
}): Promise<void> {
  await notify({
    type: "RISK_THRESHOLD",
    title: `${newLevel} risk threshold crossed`,
    message: `${projectName} — score ${score}/100`,
    resource: "Project",
    resourceId: projectId,
    role: "ADMIN",
  });
  await notify({
    type: "RISK_THRESHOLD",
    title: `${newLevel} risk threshold crossed`,
    message: `${projectName} — score ${score}/100`,
    resource: "Project",
    resourceId: projectId,
    role: "ANALYST",
  });
}

/**
 * Notify the escalator that an anomaly was successfully escalated to a
 * law-enforcement authority. The escalator gets a confirmation receipt.
 */
export async function notifyAnomalyEscalatedToLaw(
  userId: string,
  anomalyId: string,
  authority: string,
  referenceNo: string,
): Promise<void> {
  await notify({
    type: "ANOMALY_ESCALATED_TO_LAW",
    title: `Anomaly escalated to ${authority}`,
    message: `Reference: ${referenceNo}. The authority has been notified and a case has been opened.`,
    resource: "Anomaly",
    resourceId: anomalyId,
    userId,
  });
}

/**
 * Broadcast to admins and officers that a referral was acknowledged by the
 * external authority.
 */
export async function notifyReferralAcknowledged(
  referenceNo: string,
  anomalyId: string,
  authority: string,
): Promise<void> {
  await notify({
    type: "REFERRAL_ACKNOWLEDGED",
    title: `Referral acknowledged by ${authority}`,
    message: `Reference ${referenceNo} acknowledged. Investigation is now in progress.`,
    resource: "Anomaly",
    resourceId: anomalyId,
    role: "ADMIN",
  });
  await notify({
    type: "REFERRAL_ACKNOWLEDGED",
    title: `Referral acknowledged by ${authority}`,
    message: `Reference ${referenceNo} acknowledged. Investigation is now in progress.`,
    resource: "Anomaly",
    resourceId: anomalyId,
    role: "OFFICER",
  });
}
