import { describe, it, expect } from 'vitest';
import {
  REFERRAL_AUTHORITIES,
  referralAuthorityLabel,
  generateReferralReferenceNo,
  isValidReferralTransition,
} from '../src/services/referralService';

describe('REFERRAL_AUTHORITIES / referralAuthorityLabel', () => {
  it('lists real, distinct authority codes (not a single hardcoded agency)', () => {
    const codes = REFERRAL_AUTHORITIES.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain('ACB_OFFICE');
    expect(codes).toContain('POLICE_OFFICE');
    expect(codes).toContain('LOKAYUKTA');
    expect(codes.length).toBeGreaterThanOrEqual(4);
  });

  it('resolves a human-readable label for a known code', () => {
    expect(referralAuthorityLabel('ACB_OFFICE')).toBe('ACB (Anti-Corruption Bureau)');
  });

  it('falls back to the raw code for an unknown authority rather than throwing', () => {
    expect(referralAuthorityLabel('UNKNOWN_AGENCY')).toBe('UNKNOWN_AGENCY');
  });
});

describe('generateReferralReferenceNo', () => {
  it('produces a deterministic, prefixed, zero-padded reference number', () => {
    expect(generateReferralReferenceNo('ACB_OFFICE', 1, 2026)).toBe('VOJAS-ACB-2026-000001');
    expect(generateReferralReferenceNo('POLICE_OFFICE', 42, 2026)).toBe('VOJAS-POL-2026-000042');
  });

  it('never collides across different authorities for the same sequence number', () => {
    const acb = generateReferralReferenceNo('ACB_OFFICE', 1, 2026);
    const police = generateReferralReferenceNo('POLICE_OFFICE', 1, 2026);
    expect(acb).not.toBe(police);
  });
});

describe('isValidReferralTransition — the DRAFT -> ... -> CLOSED lifecycle', () => {
  it('allows the normal forward path', () => {
    expect(isValidReferralTransition('DRAFT', 'PENDING_REVIEW')).toBe(true);
    expect(isValidReferralTransition('PENDING_REVIEW', 'APPROVED')).toBe(true);
    expect(isValidReferralTransition('APPROVED', 'REFERRED')).toBe(true);
    expect(isValidReferralTransition('REFERRED', 'ACKNOWLEDGED')).toBe(true);
    expect(isValidReferralTransition('ACKNOWLEDGED', 'UNDER_REVIEW')).toBe(true);
    expect(isValidReferralTransition('UNDER_REVIEW', 'ACTION_TAKEN')).toBe(true);
    expect(isValidReferralTransition('ACTION_TAKEN', 'RESOLVED')).toBe(true);
    expect(isValidReferralTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('rejects skipping stages — a referral cannot jump straight from DRAFT to REFERRED without approval', () => {
    expect(isValidReferralTransition('DRAFT', 'REFERRED')).toBe(false);
    expect(isValidReferralTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(isValidReferralTransition('PENDING_REVIEW', 'REFERRED')).toBe(false);
  });

  it('rejects moving backward', () => {
    expect(isValidReferralTransition('REFERRED', 'APPROVED')).toBe(false);
    expect(isValidReferralTransition('RESOLVED', 'UNDER_REVIEW')).toBe(false);
  });

  it('CLOSED is terminal — nothing transitions out of it', () => {
    expect(isValidReferralTransition('CLOSED', 'DRAFT')).toBe(false);
    expect(isValidReferralTransition('CLOSED', 'REFERRED')).toBe(false);
  });

  it('every non-terminal status can reach CLOSED directly (a referral can be closed at any stage)', () => {
    const nonTerminal = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REFERRED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED'];
    for (const status of nonTerminal) {
      expect(isValidReferralTransition(status, 'CLOSED')).toBe(true);
    }
  });

  it('rejects an unrecognized source status rather than allowing an arbitrary transition', () => {
    expect(isValidReferralTransition('NOT_A_REAL_STATUS', 'CLOSED')).toBe(false);
  });
});
