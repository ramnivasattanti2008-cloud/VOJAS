/**
 * Unified Evidence Service — VOJAS Phase 1
 *
 * A read-side aggregation over existing evidence-producing tables
 * (Document, SatelliteObservation, SatelliteAnalysis, FieldVerification,
 * ContractorUpdate, ReportMedia, ProjectEvent, RiskFinding). This is
 * deliberately NOT a new storage system — every EvidenceItem is a
 * normalized pointer back to a real row in a real, already-existing table.
 * Creating/uploading evidence still goes through the existing routes
 * (documents.ts, citizenReports.ts, officer.ts, contractor routes); this
 * service only reads and classifies what's already there.
 */
import type { PrismaClient } from '@vojas/db';
import { UserRole } from '@vojas/shared';
import type { EvidenceLevel } from './documentIntelligence.js';

export type EvidenceType =
  | 'DOCUMENT'
  | 'SATELLITE_OBSERVATION'
  | 'SATELLITE_ANALYSIS'
  | 'INSPECTION'
  | 'CITIZEN_MEDIA'
  | 'CONTRACTOR_SUBMISSION'
  | 'AI_FINDING'
  | 'PROJECT_EVENT';

export type EvidenceVerificationStatus =
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'REJECTED'
  | 'REQUIRES_INFO'
  | 'NOT_APPLICABLE';

/**
 * Who may see this item. Not the same as EvidenceLevel (which is about how
 * much to trust the content) — this is purely about visibility.
 *   PUBLIC       — safe for anonymous citizens
 *   CONTRACTOR   — the contractor who submitted it, plus GOVERNMENT+
 *   GOVERNMENT   — officers/analysts operating the platform
 *   INVESTIGATOR — case reviewers (mapped to the REVIEWER role — VOJAS has
 *                  no dedicated Investigator UserRole today)
 *   ADMIN        — system administrators
 */
export type EvidenceAccessLevel = 'PUBLIC' | 'CONTRACTOR' | 'GOVERNMENT' | 'INVESTIGATOR' | 'ADMIN';

export interface EvidenceItem {
  /** Stable composite id: `${sourceTable}:${sourceId}` — never a fabricated id. */
  id: string;
  projectId: string;
  caseId: string | null;
  evidenceType: EvidenceType;
  sourceTable: string;
  sourceId: string;
  title: string;
  description: string | null;
  url: string | null;
  creatorId: string | null;
  capturedAt: Date;
  createdAt: Date;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: EvidenceVerificationStatus;
  /** Free-text confidence where the source provides one (e.g. "HIGH", "78"). Never invented. */
  confidence: string | null;
  evidenceLevel: EvidenceLevel;
  accessLevel: EvidenceAccessLevel;
  metadata: Record<string, unknown> | null;
}

export interface EvidenceViewerContext {
  userId: string | null;
  role: UserRole | null;
  /**
   * Set true only when the caller has already confirmed (e.g. via
   * canAccessProject) that an MP's constituency covers this project. Grants
   * GOVERNMENT-tier oversight visibility in addition to PUBLIC. Ignored for
   * non-MP roles.
   */
  mpHasOversight?: boolean;
}

const GOVERNMENT_ROLES = new Set<UserRole>([UserRole.OFFICER, UserRole.ANALYST, UserRole.FIELD_OFFICER]);
// VOJAS has no dedicated "Investigator" role yet; REVIEWER is the closest
// existing mapping for case-review access.
const INVESTIGATOR_ROLES = new Set<UserRole>([UserRole.REVIEWER]);

function mapDocumentStatus(status: string): EvidenceVerificationStatus {
  switch (status) {
    case 'VERIFIED': return 'VERIFIED';
    case 'REJECTED': return 'REJECTED';
    case 'REQUIRES_INFO': return 'REQUIRES_INFO';
    default: return 'NOT_VERIFIED';
  }
}

function mapFieldVerificationResult(result: string): EvidenceVerificationStatus {
  switch (result) {
    case 'VERIFIED':
    case 'PARTIALLY_VERIFIED':
      return 'VERIFIED';
    case 'MORE_INFO_REQUIRED':
    case 'REQUIRES_INVESTIGATION':
      return 'REQUIRES_INFO';
    default: return 'NOT_VERIFIED';
  }
}

function mapContractorUpdateStatus(status: string): EvidenceVerificationStatus {
  switch (status) {
    case 'ACCEPTED': return 'VERIFIED';
    case 'REJECTED': return 'REJECTED';
    default: return 'NOT_VERIFIED';
  }
}

function mapRiskFindingStatus(status: string): EvidenceVerificationStatus {
  switch (status) {
    case 'RESOLVED': return 'VERIFIED';
    case 'DISMISSED': return 'REJECTED';
    default: return 'REQUIRES_INFO';
  }
}

export class EvidenceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Aggregate every real evidence item recorded for a project. Pure read —
   * no writes, no synthesized records. Empty source tables simply
   * contribute nothing (never padded with placeholders).
   */
  async getProjectEvidence(projectId: string): Promise<EvidenceItem[]> {
    const [documents, observations, analyses, verifications, contractorUpdates, reportMedia, events, findings] =
      await Promise.all([
        this.prisma.document.findMany({ where: { projectId } }),
        this.prisma.satelliteObservation.findMany({ where: { projectId } }),
        this.prisma.satelliteAnalysis.findMany({ where: { projectId } }),
        this.prisma.fieldVerification.findMany({ where: { projectId } }),
        this.prisma.contractorUpdate.findMany({ where: { projectId } }),
        this.prisma.reportMedia.findMany({ where: { report: { projectId } }, include: { report: true } }),
        this.prisma.projectEvent.findMany({ where: { projectId } }),
        this.prisma.riskFinding.findMany({ where: { projectId } }),
      ]);

    const items: EvidenceItem[] = [];

    for (const d of documents) {
      items.push({
        id: `Document:${d.id}`,
        projectId,
        caseId: null,
        evidenceType: 'DOCUMENT',
        sourceTable: 'Document',
        sourceId: d.id,
        title: d.title,
        description: d.description,
        url: d.url,
        creatorId: d.uploadedById,
        capturedAt: d.uploadedAt,
        createdAt: d.createdAt,
        latitude: null,
        longitude: null,
        verificationStatus: mapDocumentStatus(d.status),
        confidence: d.aiConfidence != null ? String(d.aiConfidence) : null,
        evidenceLevel: d.status === 'VERIFIED' ? 'AUTHORITATIVE' : 'SOURCE_DERIVED',
        accessLevel: 'GOVERNMENT',
        metadata: { documentType: d.type, mimeType: d.mimeType },
      });
    }

    for (const o of observations) {
      items.push({
        id: `SatelliteObservation:${o.id}`,
        projectId,
        caseId: null,
        evidenceType: 'SATELLITE_OBSERVATION',
        sourceTable: 'SatelliteObservation',
        sourceId: o.id,
        title: `${o.satellite} observation — ${o.observationDate.toISOString().slice(0, 10)}`,
        description: null,
        url: o.thumbnailUrl ?? o.tileUrl,
        creatorId: null,
        capturedAt: o.observationDate,
        createdAt: o.observationDate,
        latitude: o.centerLat,
        longitude: o.centerLng,
        verificationStatus: 'NOT_APPLICABLE',
        confidence: null,
        evidenceLevel: 'SYSTEM_DERIVED',
        accessLevel: 'PUBLIC',
        metadata: { provider: o.provider, cloudCover: o.cloudCover, quality: o.quality },
      });
    }

    for (const a of analyses) {
      items.push({
        id: `SatelliteAnalysis:${a.id}`,
        projectId,
        caseId: null,
        evidenceType: 'SATELLITE_ANALYSIS',
        sourceTable: 'SatelliteAnalysis',
        sourceId: a.id,
        title: `Change analysis — ${a.changeClassification.replace(/_/g, ' ')}`,
        description: a.limitations,
        url: null,
        creatorId: null,
        capturedAt: a.analysisDate,
        createdAt: a.createdAt,
        latitude: null,
        longitude: null,
        verificationStatus: 'NOT_APPLICABLE',
        confidence: a.confidence,
        evidenceLevel: 'AI_INTERPRETED',
        accessLevel: 'PUBLIC',
        metadata: { changePercent: a.changePercent, methodology: a.methodology },
      });
    }

    for (const v of verifications) {
      items.push({
        id: `FieldVerification:${v.id}`,
        projectId,
        caseId: v.caseId,
        evidenceType: 'INSPECTION',
        sourceTable: 'FieldVerification',
        sourceId: v.id,
        title: `Field inspection — ${v.result.replace(/_/g, ' ')}`,
        description: v.notes,
        url: null,
        creatorId: v.assignedToId,
        capturedAt: v.completedDate ?? v.scheduledDate ?? v.createdAt,
        createdAt: v.createdAt,
        latitude: v.latitude,
        longitude: v.longitude,
        verificationStatus: mapFieldVerificationResult(v.result),
        confidence: null,
        evidenceLevel: 'AUTHORITATIVE',
        accessLevel: 'GOVERNMENT',
        metadata: null,
      });
    }

    for (const c of contractorUpdates) {
      items.push({
        id: `ContractorUpdate:${c.id}`,
        projectId,
        caseId: null,
        evidenceType: 'CONTRACTOR_SUBMISSION',
        sourceTable: 'ContractorUpdate',
        sourceId: c.id,
        title: c.title,
        description: c.description,
        url: null,
        creatorId: c.submittedById,
        capturedAt: c.submittedAt,
        createdAt: c.createdAt,
        latitude: null,
        longitude: null,
        verificationStatus: mapContractorUpdateStatus(c.status),
        confidence: null,
        evidenceLevel: c.status === 'ACCEPTED' ? 'AUTHORITATIVE' : 'SOURCE_DERIVED',
        accessLevel: 'CONTRACTOR',
        metadata: { updateType: c.updateType, amount: c.amount },
      });
    }

    for (const m of reportMedia) {
      items.push({
        id: `ReportMedia:${m.id}`,
        projectId,
        caseId: null,
        evidenceType: 'CITIZEN_MEDIA',
        sourceTable: 'ReportMedia',
        sourceId: m.id,
        title: `Citizen-submitted ${m.mediaType.toLowerCase()}`,
        description: null,
        url: m.url,
        // Never attribute citizen media to an identifiable reporter here —
        // this feeds both authenticated and public evidence views.
        creatorId: null,
        capturedAt: m.captureDate ?? m.createdAt,
        createdAt: m.createdAt,
        latitude: m.stripLocation ? null : m.captureLat,
        longitude: m.stripLocation ? null : m.captureLng,
        verificationStatus: m.verifiedById ? 'VERIFIED' : 'NOT_VERIFIED',
        confidence: null,
        evidenceLevel: 'CITIZEN_REPORTED',
        accessLevel: 'GOVERNMENT',
        metadata: { forensicStatus: m.forensicStatus },
      });
    }

    for (const e of events) {
      items.push({
        id: `ProjectEvent:${e.id}`,
        projectId,
        caseId: null,
        evidenceType: 'PROJECT_EVENT',
        sourceTable: 'ProjectEvent',
        sourceId: e.id,
        title: e.description,
        description: null,
        url: e.sourceUrl,
        creatorId: null,
        capturedAt: e.eventDate,
        createdAt: e.createdAt,
        latitude: null,
        longitude: null,
        verificationStatus: 'NOT_APPLICABLE',
        confidence: e.confidence,
        evidenceLevel: 'SOURCE_DERIVED',
        accessLevel: 'PUBLIC',
        metadata: { eventType: e.eventType, source: e.source },
      });
    }

    for (const f of findings) {
      items.push({
        id: `RiskFinding:${f.id}`,
        projectId,
        caseId: null,
        evidenceType: 'AI_FINDING',
        sourceTable: 'RiskFinding',
        sourceId: f.id,
        title: f.title,
        description: f.description,
        url: null,
        creatorId: null,
        capturedAt: f.detectedAt,
        createdAt: f.createdAt,
        latitude: null,
        longitude: null,
        verificationStatus: mapRiskFindingStatus(f.status),
        confidence: f.confidence,
        evidenceLevel: 'AI_INTERPRETED',
        accessLevel: 'GOVERNMENT',
        metadata: { severity: f.severity, riskScore: f.riskScore, type: f.type },
      });
    }

    return items.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
  }

  /** Public-safe subset — no viewer context needed, never returns anything above PUBLIC tier. */
  filterPublic(items: EvidenceItem[]): EvidenceItem[] {
    return items.filter((i) => i.accessLevel === 'PUBLIC');
  }

  /** Role-aware visibility for an authenticated viewer. */
  filterForViewer(items: EvidenceItem[], viewer: EvidenceViewerContext): EvidenceItem[] {
    const { userId, role, mpHasOversight } = viewer;

    if (role === UserRole.ADMIN) return items;

    const isInvestigator = role != null && INVESTIGATOR_ROLES.has(role);
    if (isInvestigator) return items; // case reviewers see the full picture

    const isGovernment = role != null && GOVERNMENT_ROLES.has(role);
    const isOversightMP = role === UserRole.MP && !!mpHasOversight;

    return items.filter((item) => {
      switch (item.accessLevel) {
        case 'PUBLIC':
          return true;
        case 'CONTRACTOR':
          return isGovernment || (role === UserRole.CONTRACTOR && item.creatorId != null && item.creatorId === userId);
        case 'GOVERNMENT':
          return isGovernment || isOversightMP;
        case 'INVESTIGATOR':
        case 'ADMIN':
          return false; // already handled above; unreachable for other roles
        default:
          return false;
      }
    });
  }
}
