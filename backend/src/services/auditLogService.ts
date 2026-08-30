import { prisma } from "../config/database.js";
import { Request } from "express";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "REGISTER"
  | "REPORT_SUBMIT"
  | "REPORT_STATUS_CHANGE"
  | "REPORT_ASSIGN"
  | "PROJECT_CREATE"
  | "PROJECT_UPDATE"
  | "PROJECT_DELETE"
  | "EXPENDITURE_CREATE"
  | "EXPENDITURE_UPDATE"
  | "ANOMALY_SCAN"
  | "ANOMALY_ACKNOWLEDGE"
  | "ANOMALY_RESOLVE"
  | "ANOMALY_ESCALATE"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "UPDATE_ANOMALY_RULE"
  | "LOCATION_VERIFY"
  | "USER_ROLE_CHANGE"
  | "REPORT_ORIGINAL_VIEWED"
  | "REPORT_VIEWED_REDACTED"
  | "DOCUMENT_UPLOAD"
  | "DOCUMENT_UPDATE"
  | "DOCUMENT_VERIFY"
  | "DOCUMENT_DELETE"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REJECT"
  | "DOCUMENT_REJECTED"
  | "DOCUMENT_REQUIRES_INFO"
  | "DOCUMENT_DELETE"
  | "PROJECT_PDF_EXPORTED"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "UPDATE_ANOMALY_RULE";

export interface AuditMeta {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  req?: Request;
}

/**
 * Write an audit log entry asynchronously.
 * Failures are swallowed so audit logging never blocks a request.
 */
export const auditLog = async ({
  userId,
  action,
  resource,
  resourceId,
  details,
  req,
}: AuditMeta): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? null,
      },
    });
  } catch (err) {
    // Swallow — never fail the request because audit logging failed.
    // Import here to avoid circular dep.
    const { logger } = await import("../utils/logger.js");
    logger.error("auditLog write failed", { err, action, resource, resourceId });
  }
};
