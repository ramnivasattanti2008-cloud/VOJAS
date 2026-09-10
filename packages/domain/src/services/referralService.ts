/**
 * Enforcement Referral + Investigation Dossier — Phase 4
 *
 * Workflow: INVESTIGATION (VerificationCase) -> OFFICER DECISION ->
 * REVIEW DOSSIER -> HUMAN APPROVAL -> CREATE REFERRAL -> TRACK STATUS -> AUDIT.
 *
 * A Referral is always prepared from an open VerificationCase, never
 * generated automatically from a risk score. Drafting (REFERRAL_CREATE) and
 * approving (REFERRAL_APPROVE) are separate permissions — see
 * packages/shared/src/permissions.ts — so no single officer role can both
 * draft and approve a referral to an external authority unassisted.
 *
 * Reuses rather than duplicates: ProjectIntelligenceService (risk/signals/
 * evidence summary), EvidenceService (full evidence list), AuditService
 * (append-only history). Adapted from legacy/backend-v1's
 * lawEnforcementService.ts — the authority list and reference-number format
 * are ported (real, already-used domain knowledge); the automatic
 * `autoEscalateCritical()` path is deliberately NOT ported — VOJAS never
 * creates or sends a referral without an explicit human approval action.
 */
import type { PrismaClient } from '@vojas/db';
import { NotFoundError, ValidationError, ConflictError } from '../errors/index.js';
import { ProjectIntelligenceService } from './projectIntelligenceService.js';
import type { ProjectIntelligence } from './projectIntelligenceService.js';
import { EvidenceService } from './evidenceService.js';
import type { EvidenceItem, EvidenceViewerContext } from './evidenceService.js';

export type ReferralAuthorityCode = 'ACB_OFFICE' | 'POLICE_OFFICE' | 'CVC' | 'LOKAYUKTA' | 'VIGILANCE' | 'COMPTROLLER';

export const REFERRAL_AUTHORITIES: Array<{ code: ReferralAuthorityCode; label: string; prefix: string }> = [
  { code: 'ACB_OFFICE', label: 'ACB (Anti-Corruption Bureau)', prefix: 'ACB' },
  { code: 'POLICE_OFFICE', label: 'Police Station', prefix: 'POL' },
  { code: 'CVC', label: 'CVC (Central Vigilance Commission)', prefix: 'CVC' },
  { code: 'LOKAYUKTA', label: 'Lokayukta', prefix: 'LKY' },
  { code: 'VIGILANCE', label: 'Departmental Vigilance', prefix: 'VIG' },
  { code: 'COMPTROLLER', label: 'Comptroller & Auditor General', prefix: 'CAG' },
];

export function referralAuthorityLabel(code: string): string {
  return REFERRAL_AUTHORITIES.find((a) => a.code === code)?.label ?? code;
}

export function generateReferralReferenceNo(authority: string, sequence: number, year = new Date().getFullYear()): string {
  const prefix = REFERRAL_AUTHORITIES.find((a) => a.code === authority)?.prefix ?? 'REF';
  return `VOJAS-${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

export type ReferralStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REFERRED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'ACTION_TAKEN'
  | 'RESOLVED'
  | 'CLOSED';

const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'CLOSED'],
  PENDING_REVIEW: ['APPROVED', 'DRAFT', 'CLOSED'],
  APPROVED: ['REFERRED', 'CLOSED'],
  REFERRED: ['ACKNOWLEDGED', 'CLOSED'],
  ACKNOWLEDGED: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['ACTION_TAKEN', 'CLOSED'],
  ACTION_TAKEN: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

/** Pure — every status transition must be one of the modeled lifecycle edges. */
export function isValidReferralTransition(from: string, to: string): boolean {
  const allowed = REFERRAL_TRANSITIONS[from as ReferralStatus];
  return !!allowed && allowed.includes(to as ReferralStatus);
}

export interface ReferralDossier {
  caseId: string;
  caseType: string;
  caseStatus: string;
  casePriority: string;
  caseNotes: string | null;
  responsibleOfficer: { id: string; name: string } | null;
  intelligence: ProjectIntelligence;
  fieldVerifications: Array<{
    id: string;
    locationDesc: string | null;
    scheduledDate: string | null;
    completedDate: string | null;
    result: string;
    notes: string | null;
  }>;
  contractorSubmissions: Array<{
    id: string;
    updateType: string;
    title: string;
    description: string;
    status: string;
    submittedAt: string;
  }>;
  citizenReports: Array<{
    id: string;
    reportReference: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    isAnonymous: boolean;
    submittedAt: string;
    // Reporter identity (name/email/phone) is never included in a dossier —
    // this document may be handed to an external authority.
  }>;
  evidence: Array<Pick<EvidenceItem, 'id' | 'evidenceType' | 'title' | 'url' | 'capturedAt' | 'verificationStatus' | 'evidenceLevel'>>;
  generatedAt: string;
}

export class ReferralService {
  private intelligenceService: ProjectIntelligenceService;
  private evidenceService: EvidenceService;

  constructor(private readonly prisma: PrismaClient) {
    this.intelligenceService = new ProjectIntelligenceService(prisma);
    this.evidenceService = new EvidenceService(prisma);
  }

  /**
   * Builds the full investigation dossier for a case. Read-only — does not
   * mutate anything. Never fabricates a field: unavailable data is omitted
   * or shown via the intelligence layer's explicit UNAVAILABLE states.
   */
  async getInvestigationDossier(caseId: string, viewer: EvidenceViewerContext): Promise<ReferralDossier> {
    const verificationCase = await this.prisma.verificationCase.findUnique({
      where: { id: caseId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    if (!verificationCase) throw new NotFoundError('VerificationCase');

    const [intelligence, fieldVerifications, contractorUpdates, citizenReports, allEvidence] = await Promise.all([
      this.intelligenceService.getProjectIntelligence(verificationCase.projectId, viewer),
      this.prisma.fieldVerification.findMany({
        where: { OR: [{ caseId }, { projectId: verificationCase.projectId }] },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.contractorUpdate.findMany({
        where: { projectId: verificationCase.projectId },
        orderBy: { submittedAt: 'desc' },
        take: 20,
      }),
      this.prisma.report.findMany({
        where: { projectId: verificationCase.projectId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          reportReference: true,
          title: true,
          category: true,
          severity: true,
          status: true,
          isAnonymous: true,
          createdAt: true,
        },
      }),
      this.evidenceService.getProjectEvidence(verificationCase.projectId),
    ]);

    if (!intelligence) throw new NotFoundError('Project');

    const visibleEvidence = this.evidenceService.filterForViewer(allEvidence, viewer);

    return {
      caseId: verificationCase.id,
      caseType: verificationCase.type,
      caseStatus: verificationCase.status,
      casePriority: verificationCase.priority,
      caseNotes: verificationCase.notes,
      responsibleOfficer: verificationCase.assignedTo,
      intelligence,
      fieldVerifications: fieldVerifications.map((fv) => ({
        id: fv.id,
        locationDesc: fv.locationDesc,
        scheduledDate: fv.scheduledDate?.toISOString() ?? null,
        completedDate: fv.completedDate?.toISOString() ?? null,
        result: fv.result,
        notes: fv.notes,
      })),
      contractorSubmissions: contractorUpdates.map((c) => ({
        id: c.id,
        updateType: c.updateType,
        title: c.title,
        description: c.description,
        status: c.status,
        submittedAt: c.submittedAt.toISOString(),
      })),
      citizenReports: citizenReports.map((r) => ({
        id: r.id,
        reportReference: r.reportReference,
        title: r.title,
        category: r.category,
        severity: r.severity,
        status: r.status,
        isAnonymous: r.isAnonymous,
        submittedAt: r.createdAt.toISOString(),
      })),
      evidence: visibleEvidence.map((e) => ({
        id: e.id,
        evidenceType: e.evidenceType,
        title: e.title,
        url: e.url,
        capturedAt: e.capturedAt,
        verificationStatus: e.verificationStatus,
        evidenceLevel: e.evidenceLevel,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Draft a referral from an open case. Snapshots the dossier at draft
   * time so the referral remains a stable record even if the underlying
   * project data changes later. Status starts at DRAFT — nothing is sent
   * anywhere and no external authority is notified until a human approves
   * it and moves it to REFERRED.
   */
  async createReferral(input: {
    caseId: string;
    destinationAuthority: ReferralAuthorityCode;
    reason: string;
    preparedById: string;
    viewer: EvidenceViewerContext;
  }) {
    const { caseId, destinationAuthority, reason, preparedById, viewer } = input;
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('reason must be at least 10 characters — describe why this referral is being made');
    }
    if (!REFERRAL_AUTHORITIES.some((a) => a.code === destinationAuthority)) {
      throw new ValidationError(`Unknown destination authority: ${destinationAuthority}`);
    }

    const verificationCase = await this.prisma.verificationCase.findUnique({ where: { id: caseId } });
    if (!verificationCase) throw new NotFoundError('VerificationCase');
    if (verificationCase.status === 'CLOSED') {
      throw new ConflictError('Cannot create a referral from a closed case');
    }

    const dossier = await this.getInvestigationDossier(caseId, viewer);

    const year = new Date().getFullYear();
    const existingCount = await this.prisma.referral.count({
      where: {
        destinationAuthority,
        createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
      },
    });
    const referenceNo = generateReferralReferenceNo(destinationAuthority, existingCount + 1, year);

    return this.prisma.referral.create({
      data: {
        caseId,
        projectId: verificationCase.projectId,
        findingId: verificationCase.findingId,
        destinationAuthority,
        referenceNo,
        reason,
        status: 'DRAFT',
        dossier: dossier as unknown as object,
        preparedById,
      },
    });
  }

  async getReferral(id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        case: { select: { id: true, type: true, status: true } },
        preparedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!referral) throw new NotFoundError('Referral');
    return referral;
  }

  async listReferrals(filters: { status?: string; projectId?: string; destinationAuthority?: string; page?: number; limit?: number }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.destinationAuthority) where.destinationAuthority = filters.destinationAuthority;

    const page = filters.page ?? 1;
    const limit = Math.min(50, filters.limit ?? 20);

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true } },
          preparedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Human approval step. Must be a different action than createReferral —
   * enforced by the caller requiring REFERRAL_APPROVE permission (not just
   * REFERRAL_CREATE). Moves DRAFT/PENDING_REVIEW -> APPROVED.
   */
  async approveReferral(id: string, approvedById: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundError('Referral');
    if (!['DRAFT', 'PENDING_REVIEW'].includes(referral.status)) {
      throw new ConflictError(`Cannot approve a referral in status ${referral.status}`);
    }

    return this.prisma.referral.update({
      where: { id },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });
  }

  async rejectReferral(id: string, notes: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundError('Referral');
    if (!['DRAFT', 'PENDING_REVIEW'].includes(referral.status)) {
      throw new ConflictError(`Cannot reject a referral in status ${referral.status}`);
    }
    return this.prisma.referral.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), notes: referral.notes ? `${referral.notes}\n[REJECTED] ${notes}` : `[REJECTED] ${notes}` },
    });
  }

  async updateReferralStatus(id: string, newStatus: ReferralStatus, notes?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundError('Referral');
    if (!isValidReferralTransition(referral.status, newStatus)) {
      throw new ConflictError(`Cannot transition referral from ${referral.status} to ${newStatus}`);
    }

    const data: Record<string, unknown> = { status: newStatus };
    if (notes) data.notes = referral.notes ? `${referral.notes}\n[${newStatus}] ${notes}` : `[${newStatus}] ${notes}`;
    if (newStatus === 'REFERRED') data.referredAt = new Date();
    if (newStatus === 'ACKNOWLEDGED') data.acknowledgedAt = new Date();
    if (newStatus === 'CLOSED') data.closedAt = new Date();

    return this.prisma.referral.update({ where: { id }, data });
  }
}
