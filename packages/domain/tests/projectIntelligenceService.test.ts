import { describe, it, expect } from 'vitest';
import {
  classifyFreshness,
  buildFinancialSignalCard,
  buildProgressSignalCard,
  buildTimelineSignalCard,
  buildInspectionSignalCard,
  buildCitizenSignalCard,
  buildSatelliteSignalCard,
  buildWhyFlaggedSummary,
  buildRecommendedActions,
  computeOverallStatus,
} from '../src/services/projectIntelligenceService';
import type { SignalCard } from '../src/services/projectIntelligenceService';

const NOW = new Date('2026-09-10T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe('classifyFreshness', () => {
  it('returns UNAVAILABLE for null date rather than fabricating an age', () => {
    expect(classifyFreshness(null, 90, NOW)).toEqual({ status: 'UNAVAILABLE', ageDays: null, referenceDate: null });
  });

  it('classifies FRESH within threshold and STALE beyond it', () => {
    expect(classifyFreshness(daysAgo(10), 90, NOW).status).toBe('FRESH');
    expect(classifyFreshness(daysAgo(120), 90, NOW).status).toBe('STALE');
  });
});

describe('buildFinancialSignalCard — normal vs mismatch', () => {
  it('UNAVAILABLE when no approved amount exists', () => {
    const card = buildFinancialSignalCard({ approvedAmount: 0, spentAmount: 0 });
    expect(card.status).toBe('UNAVAILABLE');
  });

  it('LOW for healthy utilization', () => {
    const card = buildFinancialSignalCard({ approvedAmount: 100000, spentAmount: 40000 });
    expect(card.status).toBe('LOW');
    expect(card.summary).toContain('40.0%');
  });

  it('HIGH when spending exceeds the approved amount', () => {
    const card = buildFinancialSignalCard({ approvedAmount: 100000, spentAmount: 120000 });
    expect(card.status).toBe('HIGH');
  });
});

describe('buildProgressSignalCard — financial/progress mismatch scenario', () => {
  it('UNAVAILABLE when no progress observation exists', () => {
    const card = buildProgressSignalCard(null, { approvedAmount: 100000, spentAmount: 50000 }, NOW);
    expect(card.status).toBe('UNAVAILABLE');
  });

  it('HIGH when financial utilization is high but reported progress is low (the example scenario from the spec)', () => {
    const card = buildProgressSignalCard(
      { reportedProgress: 54, reportDate: daysAgo(5) },
      { approvedAmount: 100000, spentAmount: 82000 }, // 82% utilization
      NOW
    );
    expect(card.status).toBe('HIGH');
    expect(card.summary).toContain('54.0%');
    expect(card.summary).toContain('82.0%');
  });

  it('LOW when progress and financial utilization are aligned', () => {
    const card = buildProgressSignalCard(
      { reportedProgress: 50, reportDate: daysAgo(5) },
      { approvedAmount: 100000, spentAmount: 48000 },
      NOW
    );
    expect(card.status).toBe('LOW');
  });
});

describe('buildTimelineSignalCard', () => {
  it('UNAVAILABLE with no expected end date', () => {
    expect(buildTimelineSignalCard({ status: 'IN_PROGRESS', expectedEndDate: null }, NOW).status).toBe('UNAVAILABLE');
  });

  it('LOW when completed', () => {
    expect(buildTimelineSignalCard({ status: 'COMPLETED', expectedEndDate: daysAgo(10) }, NOW).status).toBe('LOW');
  });

  it('HIGH when severely overdue', () => {
    const card = buildTimelineSignalCard({ status: 'IN_PROGRESS', expectedEndDate: daysAgo(120) }, NOW);
    expect(card.status).toBe('HIGH');
  });
});

describe('buildInspectionSignalCard — satellite/inspection freshness scenario', () => {
  it('UNAVAILABLE (not a negative signal) when no field verification exists', () => {
    const card = buildInspectionSignalCard(null, 'IN_PROGRESS', NOW);
    expect(card.status).toBe('UNAVAILABLE');
    expect(card.summary).toContain('No field verification');
  });

  it('LOW when the last verification is recent', () => {
    const card = buildInspectionSignalCard(
      { completedDate: daysAgo(10), scheduledDate: daysAgo(12), result: 'VERIFIED' },
      'IN_PROGRESS',
      NOW
    );
    expect(card.status).toBe('LOW');
  });

  it('the exact spec example: last field verification is 47 days old stays within interval (LOW), 120 days is MEDIUM/HIGH', () => {
    const within = buildInspectionSignalCard(
      { completedDate: daysAgo(47), scheduledDate: daysAgo(50), result: 'VERIFIED' },
      'IN_PROGRESS',
      NOW
    );
    expect(within.status).toBe('LOW');

    const overdue = buildInspectionSignalCard(
      { completedDate: daysAgo(120), scheduledDate: daysAgo(125), result: 'VERIFIED' },
      'IN_PROGRESS',
      NOW
    );
    expect(overdue.status).toBe('MEDIUM');
    expect(overdue.freshness.status).toBe('STALE');
  });

  it('does not flag staleness for a completed project', () => {
    const card = buildInspectionSignalCard(
      { completedDate: daysAgo(200), scheduledDate: daysAgo(205), result: 'VERIFIED' },
      'COMPLETED',
      NOW
    );
    expect(card.status).toBe('LOW');
  });
});

describe('buildCitizenSignalCard', () => {
  it('LOW (not UNAVAILABLE) with zero reports — absence of reports is not itself a concern', () => {
    expect(buildCitizenSignalCard(0, null, NOW).status).toBe('LOW');
  });

  it('HIGH with multiple reports', () => {
    expect(buildCitizenSignalCard(3, daysAgo(5), NOW).status).toBe('HIGH');
  });
});

describe('buildSatelliteSignalCard', () => {
  it('UNAVAILABLE (satellite signal unavailable) when no observation exists', () => {
    const card = buildSatelliteSignalCard(null, null, NOW);
    expect(card.status).toBe('UNAVAILABLE');
    expect(card.summary).toContain('unavailable');
  });

  it('MEDIUM when observable change is low', () => {
    const card = buildSatelliteSignalCard({ observationDate: daysAgo(5), cloudCover: 10 }, 'LOW_OBSERVABLE_CHANGE', NOW);
    expect(card.status).toBe('MEDIUM');
  });
});

describe('computeOverallStatus', () => {
  const card = (status: SignalCard['status']): SignalCard => ({
    key: 'FINANCIAL',
    label: 'x',
    status,
    summary: '',
    freshness: { status: 'UNAVAILABLE', ageDays: null, referenceDate: null },
  });

  it('no signals / all unavailable -> UNAVAILABLE', () => {
    expect(computeOverallStatus([card('UNAVAILABLE'), card('UNAVAILABLE')])).toBe('UNAVAILABLE');
  });

  it('normal project, no concerning cards -> LOW', () => {
    expect(computeOverallStatus([card('LOW'), card('UNAVAILABLE')])).toBe('LOW');
  });

  it('multiple simultaneous signals: any HIGH dominates', () => {
    expect(computeOverallStatus([card('MEDIUM'), card('HIGH'), card('LOW')])).toBe('HIGH');
  });

  it('MEDIUM when no HIGH but at least one MEDIUM', () => {
    expect(computeOverallStatus([card('LOW'), card('MEDIUM')])).toBe('MEDIUM');
  });
});

describe('buildWhyFlaggedSummary — explainability', () => {
  it('states no concerns when every card is healthy', () => {
    const cards: SignalCard[] = [
      { key: 'FINANCIAL', label: 'Financial', status: 'LOW', summary: 'ok', freshness: { status: 'FRESH', ageDays: 0, referenceDate: null } },
    ];
    const lines = buildWhyFlaggedSummary(cards);
    expect(lines[0]).toContain('No cross-signal concerns');
  });

  it('lists each concerning signal with its real summary and ends with the non-accusatory disclaimer', () => {
    const cards: SignalCard[] = [
      { key: 'FINANCIAL', label: 'Financial', status: 'HIGH', summary: 'Financial utilization: 82.0%', freshness: { status: 'FRESH', ageDays: 0, referenceDate: null } },
      { key: 'SATELLITE', label: 'Satellite', status: 'MEDIUM', summary: 'Latest observable change: low', freshness: { status: 'FRESH', ageDays: 5, referenceDate: null } },
    ];
    const lines = buildWhyFlaggedSummary(cards);
    const joined = lines.join(' ');
    expect(joined).toContain('82.0%');
    expect(joined).toContain('low');
    expect(joined).toContain('do not prove wrongdoing');
    expect(joined.toLowerCase()).not.toContain('fraud');
  });
});

describe('buildRecommendedActions', () => {
  it('recommends field verification when inspection is stale', () => {
    const cards: SignalCard[] = [
      { key: 'INSPECTION', label: 'Inspection', status: 'HIGH', summary: '', freshness: { status: 'STALE', ageDays: 200, referenceDate: null } },
    ];
    expect(buildRecommendedActions(cards).join(' ')).toContain('field verification');
  });

  it('falls back to routine monitoring when nothing is concerning', () => {
    const cards: SignalCard[] = [
      { key: 'FINANCIAL', label: 'Financial', status: 'LOW', summary: '', freshness: { status: 'FRESH', ageDays: 0, referenceDate: null } },
    ];
    expect(buildRecommendedActions(cards).join(' ')).toContain('routine monitoring');
  });
});
