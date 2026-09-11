/**
 * Investigation Workflow — VOJAS Phase 1
 *
 * Pure, testable logic backing the officer field-inspection and
 * contractor-response review flows. Reads/writes go through the real
 * FieldVerification, ContractorUpdate, and Anomaly tables — this module
 * holds only the derivation/validation rules, not persistence.
 */

export type FieldInspectionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface FieldVerificationLike {
  completedDate: Date | null;
  checklist: unknown;
}

/**
 * A FieldVerification row has no dedicated status column — status is
 * derived from what's actually been recorded: completedDate set means the
 * officer submitted; a saved checklist with no completion means a draft is
 * in progress; neither means the inspection hasn't been started yet.
 */
export function deriveFieldInspectionStatus(fv: FieldVerificationLike): FieldInspectionStatus {
  if (fv.completedDate) return 'COMPLETED';
  if (fv.checklist != null) return 'IN_PROGRESS';
  return 'PENDING';
}

export interface ChecklistItem {
  item: string;
  completed: boolean;
  notes?: string;
  photoUrl?: string;
}

export type FieldVerificationResult =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'MORE_INFO_REQUIRED'
  | 'NOT_VERIFIED'
  | 'REQUIRES_INVESTIGATION';

/**
 * Derives a verification result from the field officer's own checklist
 * submission — this reflects what the human inspector actually recorded on
 * site, not an inferred judgment about the project. Only used when the
 * submitting officer doesn't supply an explicit result.
 */
export function deriveFieldVerificationResult(checklist: ChecklistItem[]): FieldVerificationResult {
  if (checklist.length === 0) return 'MORE_INFO_REQUIRED';
  const completed = checklist.filter((c) => c.completed).length;
  if (completed === checklist.length) return 'VERIFIED';
  if (completed === 0) return 'NOT_VERIFIED';
  return 'PARTIALLY_VERIFIED';
}

export type ContractorResponseStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';

/**
 * ContractorUpdate.status is a free-text column with real values
 * PENDING | UNDER_REVIEW | ACCEPTED | REJECTED, plus CLARIFICATION_REQUESTED
 * once an officer requests one (a real workflow state this app writes).
 * The officer command-center UI groups PENDING and UNDER_REVIEW together as
 * "awaiting review".
 */
export function mapContractorUpdateStatus(status: string): ContractorResponseStatus {
  switch (status) {
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'REJECTED':
      return 'REJECTED';
    case 'CLARIFICATION_REQUESTED':
      return 'CLARIFICATION_REQUESTED';
    default:
      return 'PENDING_REVIEW';
  }
}

const REOPENABLE_ANOMALY_STATUSES = new Set(['RESOLVED', 'DISMISSED', 'ESCALATED']);

/** An anomaly-based case may only be reopened from a terminal status. */
export function canReopenAnomalyCase(currentStatus: string): boolean {
  return REOPENABLE_ANOMALY_STATUSES.has(currentStatus);
}
