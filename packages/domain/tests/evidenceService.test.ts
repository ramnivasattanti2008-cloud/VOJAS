import { describe, it, expect } from 'vitest';
import { UserRole } from '@vojas/shared';
import { EvidenceService } from '../src/services/evidenceService';
import type { EvidenceItem } from '../src/services/evidenceService';

// filterPublic/filterForViewer are pure functions — exercise them directly
// against a fixture array rather than a live Prisma client.
const service = new EvidenceService({} as any);

function item(overrides: Partial<EvidenceItem>): EvidenceItem {
  return {
    id: 'X:1',
    projectId: 'p1',
    caseId: null,
    evidenceType: 'DOCUMENT',
    sourceTable: 'Document',
    sourceId: '1',
    title: 'Test item',
    description: null,
    url: null,
    creatorId: null,
    capturedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    latitude: null,
    longitude: null,
    verificationStatus: 'NOT_APPLICABLE',
    confidence: null,
    evidenceLevel: 'SOURCE_DERIVED',
    accessLevel: 'GOVERNMENT',
    metadata: null,
    ...overrides,
  };
}

const fixtures: EvidenceItem[] = [
  item({ id: 'e-public', accessLevel: 'PUBLIC', evidenceType: 'SATELLITE_OBSERVATION' }),
  item({ id: 'e-government', accessLevel: 'GOVERNMENT', evidenceType: 'DOCUMENT' }),
  item({
    id: 'e-contractor-own',
    accessLevel: 'CONTRACTOR',
    evidenceType: 'CONTRACTOR_SUBMISSION',
    creatorId: 'user-contractor-1',
  }),
  item({
    id: 'e-contractor-other',
    accessLevel: 'CONTRACTOR',
    evidenceType: 'CONTRACTOR_SUBMISSION',
    creatorId: 'user-contractor-2',
  }),
];

describe('EvidenceService.filterPublic', () => {
  it('returns only PUBLIC-tier items regardless of viewer', () => {
    const result = service.filterPublic(fixtures);
    expect(result.map((i) => i.id)).toEqual(['e-public']);
  });
});

describe('EvidenceService.filterForViewer', () => {
  it('citizen (no role) sees only PUBLIC-tier evidence', () => {
    const result = service.filterForViewer(fixtures, { userId: null, role: null });
    expect(result.map((i) => i.id)).toEqual(['e-public']);
  });

  it('contractor sees PUBLIC plus their own CONTRACTOR-tier submissions, never another contractor\'s', () => {
    const result = service.filterForViewer(fixtures, {
      userId: 'user-contractor-1',
      role: UserRole.CONTRACTOR,
    });
    expect(result.map((i) => i.id).sort()).toEqual(['e-contractor-own', 'e-public']);
  });

  it('MP without oversight sees only PUBLIC evidence', () => {
    const result = service.filterForViewer(fixtures, {
      userId: 'user-mp-1',
      role: UserRole.MP,
      mpHasOversight: false,
    });
    expect(result.map((i) => i.id)).toEqual(['e-public']);
  });

  it('MP with confirmed constituency oversight sees PUBLIC + GOVERNMENT tiers, not contractor submissions from others', () => {
    const result = service.filterForViewer(fixtures, {
      userId: 'user-mp-1',
      role: UserRole.MP,
      mpHasOversight: true,
    });
    expect(result.map((i) => i.id).sort()).toEqual(['e-government', 'e-public']);
  });

  it('officer (GOVERNMENT role) sees PUBLIC, GOVERNMENT, and all CONTRACTOR submissions', () => {
    const result = service.filterForViewer(fixtures, {
      userId: 'user-officer-1',
      role: UserRole.OFFICER,
    });
    expect(result.map((i) => i.id).sort()).toEqual(
      ['e-contractor-other', 'e-contractor-own', 'e-government', 'e-public'].sort()
    );
  });

  it('reviewer (investigator-mapped role) sees everything', () => {
    const result = service.filterForViewer(fixtures, {
      userId: 'user-reviewer-1',
      role: UserRole.REVIEWER,
    });
    expect(result).toHaveLength(fixtures.length);
  });

  it('admin sees everything', () => {
    const result = service.filterForViewer(fixtures, {
      userId: 'user-admin-1',
      role: UserRole.ADMIN,
    });
    expect(result).toHaveLength(fixtures.length);
  });
});
