/**
 * Unit tests for the pure functions in satelliteEOAnalysis.ts, focused on the
 * anti-fabrication contract stated at the top of that file: a missing
 * NDVI/NDBI reading (no pixel-level analysis has run — CDSE credentials
 * absent) must never be reported as "no change" or as any other real finding.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyChange,
  computeConfidence,
  compareProgress,
  computeDevelopmentScore,
} from '../../src/services/satelliteEOAnalysis.js';

describe('classifyChange', () => {
  it('reports INSUFFICIENT_DATA when neither NDVI nor NDBI is available', () => {
    // This used to silently treat a missing pair as zero change, so every
    // catalog-only sync (the default local/dev state, no CDSE credentials)
    // reported every pairwise comparison as NO_OBSERVABLE_CHANGE — a
    // fabricated finding, not an honest "not measured".
    expect(classifyChange(null, null, null, null)).toBe('INSUFFICIENT_DATA');
  });

  it('reports INSUFFICIENT_DATA when only one side of the pair has data', () => {
    expect(classifyChange(0.4, null, 0.1, null)).toBe('INSUFFICIENT_DATA');
    expect(classifyChange(null, 0.4, null, 0.1)).toBe('INSUFFICIENT_DATA');
  });

  it('classifies NO_OBSERVABLE_CHANGE for a genuinely small real delta', () => {
    expect(classifyChange(0.40, 0.41, 0.10, 0.10)).toBe('NO_OBSERVABLE_CHANGE');
  });

  it('classifies HIGH_OBSERVABLE_CHANGE for a large real delta', () => {
    expect(classifyChange(0.70, 0.10, 0.10, 0.60)).toBe('HIGH_OBSERVABLE_CHANGE');
  });

  it('classifies using whichever index has real data if the other is absent-on-both-sides', () => {
    // NDBI present on both sides even though NDVI is missing on both is a
    // real, if partial, measurement — not the same as neither being present.
    expect(classifyChange(null, null, 0.05, 0.55)).not.toBe('INSUFFICIENT_DATA');
  });
});

describe('computeConfidence', () => {
  it('forces LOW confidence for an INSUFFICIENT_DATA classification regardless of cloud cover', () => {
    // Without this, a pristine (0% cloud) pair with no pixel data at all
    // could report MEDIUM/HIGH confidence in a finding that was never
    // actually reached — confidence about a conclusion that does not exist.
    expect(computeConfidence(0, 0, 1, 'INSUFFICIENT_DATA')).toBe('LOW');
  });

  it('derives confidence from cloud cover and coverage for a real classification', () => {
    expect(computeConfidence(5, 10, 0.9, 'LOW_OBSERVABLE_CHANGE')).toBe('HIGH');
    expect(computeConfidence(40, 45, 0.9, 'LOW_OBSERVABLE_CHANGE')).toBe('MEDIUM');
    expect(computeConfidence(80, 90, 0.9, 'LOW_OBSERVABLE_CHANGE')).toBe('LOW');
  });

  it('defaults sensibly when no classification is passed', () => {
    expect(computeConfidence(5, 10, 0.9)).toBe('HIGH');
  });
});

describe('compareProgress', () => {
  it('reports INSUFFICIENT_DATA status for an INSUFFICIENT_DATA classification, not CONSISTENT', () => {
    // observableChange used to be computed as `classification !==
    // 'NO_OBSERVABLE_CHANGE'`, so INSUFFICIENT_DATA fell through into the
    // "no observable change, low reported progress -> CONSISTENT" branch —
    // asserting agreement between reported progress and a comparison that
    // was never actually possible.
    const result = compareProgress(15, 'INSUFFICIENT_DATA', 'LOW');
    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.evidence.toLowerCase()).toContain('no ndvi/ndbi pixel data');
  });

  it('reports INSUFFICIENT_DATA when confidence is LOW even with a real classification', () => {
    const result = compareProgress(50, 'LOW_OBSERVABLE_CHANGE', 'LOW');
    expect(result.status).toBe('INSUFFICIENT_DATA');
  });

  it('reports CONSISTENT for low reported progress with no observable change (real data)', () => {
    const result = compareProgress(10, 'NO_OBSERVABLE_CHANGE', 'HIGH');
    expect(result.status).toBe('CONSISTENT');
  });

  it('reports POSSIBLY_INCONSISTENT for high reported progress with no observable change', () => {
    const result = compareProgress(80, 'NO_OBSERVABLE_CHANGE', 'HIGH');
    expect(result.status).toBe('POSSIBLY_INCONSISTENT');
  });

  it('reports POSSIBLY_INCONSISTENT for observable change with very low reported progress', () => {
    const result = compareProgress(5, 'HIGH_OBSERVABLE_CHANGE', 'HIGH');
    expect(result.status).toBe('POSSIBLY_INCONSISTENT');
  });

  it('reports CONSISTENT for observable change with substantial reported progress', () => {
    const result = compareProgress(70, 'MODERATE_OBSERVABLE_CHANGE', 'MEDIUM');
    expect(result.status).toBe('CONSISTENT');
  });
});

describe('computeDevelopmentScore', () => {
  it('returns null (not a fabricated score) when NDBI is unavailable', () => {
    // Previously: `(ndbii ?? 0 + 1) / 2` parses as `ndbii ?? (0 + 1)`, i.e.
    // `ndbii ?? 1` — NOT `(ndbii ?? 0) + 1`. So a null NDBI (true for every
    // observation while no pixel processing has run) produced b = 1/2 = 0.5,
    // a fabricated "50% built-up" score presented as fact.
    expect(computeDevelopmentScore(null, null)).toBeNull();
    expect(computeDevelopmentScore(0.5, null)).toBeNull();
  });

  it('rescales a real NDBI from [-1, 1] to a 0-100 score', () => {
    expect(computeDevelopmentScore(null, 1)).toBe(100);
    expect(computeDevelopmentScore(null, -1)).toBe(0);
    expect(computeDevelopmentScore(null, 0)).toBe(50);
  });

  it('never returns a negative score for a real negative NDBI', () => {
    // The old precedence bug also skipped the +1 shift for a real value
    // (ndbii ?? 1 short-circuits to ndbii itself when non-null), so
    // `Math.round(x * 50)` could go negative for any NDBI below 0 — a
    // documented "0-100 built-up score" that could read -50.
    const score = computeDevelopmentScore(null, -0.6);
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(0);
  });
});
