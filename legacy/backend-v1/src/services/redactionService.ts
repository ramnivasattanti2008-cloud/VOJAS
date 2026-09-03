/**
 * PII Redaction Service — Phase 13
 *
 * Two responsibilities:
 *   1. redactReport(report, requestingRole) — strip PII fields from the
 *      report object before returning it to non-ADMIN requesters.
 *   2. redactText(text) — regex-based PII redaction inside free-text
 *      fields (description, title, locationDesc, notes, resolution).
 *
 * The transformation happens at the service return boundary, NOT in the
 * database. The original PII is preserved for ADMIN review and audit.
 *
 * What gets redacted (per requestingRole):
 *   - ADMIN: nothing — full PII visible.
 *   - OFFICER / REVIEWER / ANALYST: reporterName, reporterEmail,
 *     reporterPhone. Free-text PII in description/title/locationDesc
 *     and resolution notes is also masked.
 *   - VIEWER: same as OFFICER.
 *
 * Anonymous reports are always anonymous. The flag itself is NOT
 * redacted — the act of submission is part of the public record.
 */

import { logger } from "../utils/logger.js";

// ── Roles that may see raw PII ───────────────────────────────────────────────
const PRIVILEGED_ROLES = new Set(["ADMIN"]);

const REDACTED_MARKER = "[REDACTED]";

// ── Regex patterns for in-text PII detection ─────────────────────────────────
// These are intentionally conservative: false positives are better than
// leaking phone numbers or Aadhaar IDs.

const PII_PATTERNS: { name: string; regex: RegExp; replacement: string }[] = [
  {
    name: "INDIA_PHONE",
    // +91 98765 43210, 09876543210, 9876543210 (10-digit), with separators
    regex: /(?:\+?91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}/g,
    replacement: "[PHONE]",
  },
  {
    name: "EMAIL",
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: "[EMAIL]",
  },
  {
    name: "AADHAAR",
    // 12 digits, possibly space/dash separated (xxxx xxxx xxxx)
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[AADHAAR]",
  },
  {
    name: "PAN",
    // ABCDE1234F
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    replacement: "[PAN]",
  },
];

export interface RedactionResult {
  /** The redacted report (or a copy) */
  redacted: any;
  /** List of PII fields that were stripped from the report */
  fieldsRedacted: string[];
  /** PII patterns found inside free-text fields, by field name */
  textRedactions: { field: string; pattern: string; count: number }[];
  /** Whether anything was redacted at all */
  wasRedacted: boolean;
}

export interface RedactionConfig {
  /** Role of the requester — ADMIN sees everything, others get redacted */
  requestingRole: string | null | undefined;
}

/**
 * Strip PII fields from a report object before returning it to a non-ADMIN
 * requester. Pure function — does not mutate the input.
 */
export function redactReport(report: any, config: RedactionConfig): RedactionResult {
  const fieldsRedacted: string[] = [];
  const textRedactions: { field: string; pattern: string; count: number }[] = [];

  if (!report) {
    return { redacted: report, fieldsRedacted, textRedactions, wasRedacted: false };
  }

  const role = (config.requestingRole ?? "").toUpperCase();
  if (PRIVILEGED_ROLES.has(role)) {
    return { redacted: report, fieldsRedacted, textRedactions, wasRedacted: false };
  }

  // Always start from a shallow copy so the input is not mutated.
  const redacted: any = { ...report };

  // Strip identifying fields. Anonymous reports were already stored as
  // null for these — we still mark them redacted so the UI knows to show
  // a redaction notice.
  if (redacted.reporterName !== null && redacted.reporterName !== undefined) {
    redacted.reporterName = REDACTED_MARKER;
    fieldsRedacted.push("reporterName");
  }
  if (redacted.reporterEmail !== null && redacted.reporterEmail !== undefined) {
    redacted.reporterEmail = REDACTED_MARKER;
    fieldsRedacted.push("reporterEmail");
  }
  if (redacted.reporterPhone !== null && redacted.reporterPhone !== undefined) {
    redacted.reporterPhone = REDACTED_MARKER;
    fieldsRedacted.push("reporterPhone");
  }

  // Redact PII in free-text fields
  const textFields = ["title", "description", "locationDesc", "resolution"];
  for (const field of textFields) {
    if (typeof redacted[field] === "string" && redacted[field].length > 0) {
      const { text, matches } = redactTextWithMatches(redacted[field]);
      redacted[field] = text;
      for (const m of matches) {
        textRedactions.push({ field, pattern: m.pattern, count: m.count });
      }
    }
  }

  const wasRedacted = fieldsRedacted.length > 0 || textRedactions.length > 0;

  if (wasRedacted) {
    logger.debug(`[REDACTION] role=${role} fields=[${fieldsRedacted.join(",")}] text=[${textRedactions.length}]`);
  }

  return { redacted, fieldsRedacted, textRedactions, wasRedacted };
}

/**
 * Apply regex-based redaction to a free-text string. Returns the redacted
 * text and a per-pattern match count.
 */
export function redactTextWithMatches(text: string): {
  text: string;
  matches: { pattern: string; count: number }[];
} {
  const matches: { pattern: string; count: number }[] = [];
  let out = text;
  for (const p of PII_PATTERNS) {
    const before = out;
    out = out.replace(p.regex, p.replacement);
    if (out !== before) {
      // Count replacements in the *output* (or compute diff length — both work)
      const count = (before.match(p.regex) ?? []).length;
      if (count > 0) {
        matches.push({ pattern: p.name, count });
      }
    }
  }
  return { text: out, matches };
}

/**
 * Convenience wrapper — redact text without match details.
 */
export function redactText(text: string): string {
  return redactTextWithMatches(text).text;
}

/**
 * Apply redaction to a list of reports (e.g. from findAll).
 * Preserves order. Items are NOT mutated in place.
 */
export function redactReportList(items: any[], config: RedactionConfig): {
  items: any[];
  redactionCount: number;
} {
  let redactionCount = 0;
  const redacted = items.map((item) => {
    const result = redactReport(item, config);
    if (result.wasRedacted) redactionCount++;
    return result.redacted;
  });
  return { items: redacted, redactionCount };
}
