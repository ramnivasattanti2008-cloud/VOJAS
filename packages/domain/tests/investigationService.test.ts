import { describe, it, expect } from 'vitest';
import {
  deriveFieldInspectionStatus,
  deriveFieldVerificationResult,
  mapContractorUpdateStatus,
  canReopenAnomalyCase,
} from '../src/services/investigationService';

describe('deriveFieldInspectionStatus', () => {
  it('PENDING when neither completedDate nor checklist is set', () => {
    expect(deriveFieldInspectionStatus({ completedDate: null, checklist: null })).toBe('PENDING');
  });

  it('IN_PROGRESS when a checklist draft exists but no completedDate', () => {
    expect(deriveFieldInspectionStatus({ completedDate: null, checklist: [{ item: 'x', completed: false }] })).toBe('IN_PROGRESS');
  });

  it('COMPLETED when completedDate is set, regardless of checklist', () => {
    expect(deriveFieldInspectionStatus({ completedDate: new Date(), checklist: null })).toBe('COMPLETED');
    expect(deriveFieldInspectionStatus({ completedDate: new Date(), checklist: [{ item: 'x', completed: true }] })).toBe('COMPLETED');
  });
});

describe('deriveFieldVerificationResult', () => {
  it('VERIFIED when every checklist item is completed', () => {
    expect(deriveFieldVerificationResult([{ item: 'a', completed: true }, { item: 'b', completed: true }])).toBe('VERIFIED');
  });

  it('NOT_VERIFIED when no checklist item is completed', () => {
    expect(deriveFieldVerificationResult([{ item: 'a', completed: false }, { item: 'b', completed: false }])).toBe('NOT_VERIFIED');
  });

  it('PARTIALLY_VERIFIED when some but not all items are completed', () => {
    expect(deriveFieldVerificationResult([{ item: 'a', completed: true }, { item: 'b', completed: false }])).toBe('PARTIALLY_VERIFIED');
  });

  it('MORE_INFO_REQUIRED for an empty checklist rather than fabricating a verdict', () => {
    expect(deriveFieldVerificationResult([])).toBe('MORE_INFO_REQUIRED');
  });
});

describe('mapContractorUpdateStatus', () => {
  it('maps PENDING and UNDER_REVIEW both to PENDING_REVIEW', () => {
    expect(mapContractorUpdateStatus('PENDING')).toBe('PENDING_REVIEW');
    expect(mapContractorUpdateStatus('UNDER_REVIEW')).toBe('PENDING_REVIEW');
  });

  it('passes through ACCEPTED, REJECTED, and CLARIFICATION_REQUESTED unchanged', () => {
    expect(mapContractorUpdateStatus('ACCEPTED')).toBe('ACCEPTED');
    expect(mapContractorUpdateStatus('REJECTED')).toBe('REJECTED');
    expect(mapContractorUpdateStatus('CLARIFICATION_REQUESTED')).toBe('CLARIFICATION_REQUESTED');
  });

  it('falls back to PENDING_REVIEW for an unrecognized status rather than throwing', () => {
    expect(mapContractorUpdateStatus('SOMETHING_UNEXPECTED')).toBe('PENDING_REVIEW');
  });
});

describe('canReopenAnomalyCase', () => {
  it('allows reopening from RESOLVED, DISMISSED, or ESCALATED', () => {
    expect(canReopenAnomalyCase('RESOLVED')).toBe(true);
    expect(canReopenAnomalyCase('DISMISSED')).toBe(true);
    expect(canReopenAnomalyCase('ESCALATED')).toBe(true);
  });

  it('refuses to reopen a case that is already open/in-progress', () => {
    expect(canReopenAnomalyCase('OPEN')).toBe(false);
    expect(canReopenAnomalyCase('ACKNOWLEDGED')).toBe(false);
    expect(canReopenAnomalyCase('UNDER_INVESTIGATION')).toBe(false);
  });
});
