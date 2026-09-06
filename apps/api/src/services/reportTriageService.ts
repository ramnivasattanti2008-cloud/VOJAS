/**
 * Report Triage Service — M10 Citizen Intelligence Report
 *
 * Handles the AI-powered triage pipeline for citizen reports:
 * - Category suggestion via keyword matching
 * - Priority/suggested severity based on keywords
 * - Nearby project matching using Haversine formula
 * - Duplicate detection via text similarity + location proximity
 * - Structured claim extraction from free-text description
 * - Evidence quality assessment
 */

import { prisma } from '@vojas/db';
import type { PrismaClient } from '@prisma/client';
import {
  ReportCategory,
  ReportSeverity,
  ReportEvidenceQuality,
  CitizenClaimType,
} from '@vojas/shared';

// ─── Keyword Maps ────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  CONSTRUCTION_QUALITY: [
    'quality', 'broken', 'damaged', 'poor quality', 'inferior', 'crack', 'cracked',
    'defect', 'faulty', 'substandard', 'corrupt work', 'bad work', 'shoddy',
    'material', 'cement', 'sand', 'mix', 'ratio', ' RCC ', 'concrete', 'pillar',
  ],
  FINANCIAL_IRREGULARITY: [
    'money', 'fund', 'cost', 'price', 'expense', 'budget', 'bribe', 'corruption',
    'overprice', 'overcost', 'overrun', ' embezzl', 'fraud', 'fake', 'bill',
    'invoice', 'payment', 'contractor', 'commission', 'kickback', 'black money',
    'amount', 'lakhs', 'crore', 'rs ', ' INR ', 'bank account',
  ],
  DELAYED_WORK: [
    'delay', 'delayed', 'slow', 'pending', 'stalled', 'behind schedule',
    'deadline', 'time over', 'time limit', 'extended', 'overdue', 'not completed',
    'prolonged', 'postponed', 'waiting', 'stuck',
  ],
  ABANDONED_WORK: [
    'abandon', 'abandoned', 'stopped', 'halted', 'incomplete', 'unfinished',
    'neglected', 'deserted', 'forsaken', 'partial', 'partially done', 'left incomplete',
  ],
  FAKE_DOCUMENTS: [
    'fake', 'forged', 'forgery', 'fabricated', 'false document', 'fake certificate',
    'tamper', 'tampered', 'manipulated', 'altered document', 'counterfeit',
  ],
  VENDOR_MISCONDUCT: [
    'vendor', 'contractor misconduct', 'vendor fraud', 'supplier', 'blacklist',
    'debar', 'unreliable', 'incompetent vendor', 'complaint against vendor',
  ],
  LOCATION_MISMATCH: [
    'wrong location', 'different location', 'location mismatch', 'not at site',
    'different place', 'fake location', 'misplaced', 'coordinates wrong',
    ' GPS ', 'locat', 'site different',
  ],
  PROGRESS_MISMATCH: [
    'progress mismatch', 'less progress', 'no progress', 'slow progress',
    'reported wrong', 'overreported', 'underreported', 'fake progress',
    'progress inflated', 'less work done',
  ],
  ENVIRONMENTAL_VIOLATION: [
    'environmental', 'pollution', 'illegal felling', 'tree cut', 'river',
    'lake', 'wetland', 'forest', 'nallah', 'drain', 'waste', 'sewage', 'effluent',
    'noise', 'air pollution', 'contamination', 'ecology', 'environmental damage',
  ],
  SAFETY_HAZARD: [
    'safety', 'danger', 'hazard', 'unsafe', 'accident', 'electrical', 'fire',
    'risk', 'unstable', 'collapsed', 'cave in', 'flood', 'breach', 'leak',
    'explosion', 'faulty wiring', 'no guard', 'unprotected',
  ],
};

const PRIORITY_KEYWORDS: Record<ReportSeverity, string[]> = {
  CRITICAL: [
    'death', 'died', 'killed', 'accident fatal', 'collapse fatal', 'mass fraud',
    'crore', ' lakhs of rupees', 'life threatening', 'fire accident', 'explosion',
    'structural collapse', 'building collapse', 'bridge collapse', 'dam breach',
  ],
  HIGH: [
    'hazard', 'danger', 'safety risk', 'major fraud', 'severe', 'critical',
    'flood', 'breach', 'major delay', 'embezzlement', 'systematic fraud',
    'large scale', 'ongoing', 'persistent', 'widespread',
  ],
  MEDIUM: [
    'concern', 'issue', 'problem', 'not done properly', 'incomplete',
    'visible', 'noticeable', 'persistent', 'repeated', 'ongoing',
  ],
  LOW: [
    'minor', 'small', 'cosmetic', 'slight', 'negligible', 'optional',
  ],
};

const CLAIM_PATTERNS: Array<{
  type: CitizenClaimType;
  patterns: RegExp[];
}> = [
  {
    type: CitizenClaimType.PROJECT_NOT_STARTED,
    patterns: [
      /project\s+(has\s+)?not\s+started/i,
      /work\s+not\s+started/i,
      /no\s+work\s+(has\s+)?(begun|started|initiated)/i,
      /site\s+(is\s+)?empty/i,
      /ground\s+(has\s+)?not\s+been/i,
    ],
  },
  {
    type: CitizenClaimType.PROJECT_INCOMPLETE,
    patterns: [
      /project\s+(is\s+)?incomplete/i,
      /work\s+(is\s+)?(half|partially|partly)\s+(done|completed)/i,
      /incomplete\s+(work|construction|project)/i,
      /unfinished\s+(work|project)/i,
      /partially\s+(completed|built|done)/i,
    ],
  },
  {
    type: CitizenClaimType.QUALITY_CONCERN,
    patterns: [
      /poor\s+(quality|work)/i,
      /bad\s+(quality|work|construction)/i,
      /low\s+quality/i,
      /substandard/i,
      /inferior\s+(material|work)/i,
      /crack(?:ed|s)?\s+(in|on)\s+(wall|floor|roof|structure)/i,
      /quality\s+(concern|issue|problem)/i,
    ],
  },
  {
    type: CitizenClaimType.FINANCIAL_CONCERN,
    patterns: [
      /(money|fund|amount|cost|price|rs\.?|inr)\s+(wasted|misused|missing|stolen)/i,
      /overpricing/i,
      /overcost/i,
      /embezzlement/i,
      /financial\s+(fraud|irregularity|irregular)/i,
      /bribe/i,
      /corruption/i,
    ],
  },
  {
    type: CitizenClaimType.SAFETY_CONCERN,
    patterns: [
      /safety\s+(hazard|issue|concern|risk)/i,
      /unsafe/i,
      /danger(?:ous)?/i,
      /hazard(?:ous)?/i,
      /accident\s+(risk|prone|possible)/i,
      /structural\s+(failure|collapse|danger)/i,
    ],
  },
  {
    type: CitizenClaimType.LOCATION_CONCERN,
    patterns: [
      /wrong\s+(location|place|site)/i,
      /location\s+(mismatch|different|incorrect)/i,
      /not\s+(at|in)\s+(the\s+)?(correct|right)\s+(location|place|site)/i,
      /different\s+(place|location|site)/i,
      /site\s+(is\s+)?different/i,
    ],
  },
  {
    type: CitizenClaimType.DATE_CONCERN,
    patterns: [
      /delay(?:ed|s)?\s+(more\s+than\s+)?(\d+\s+)?(months?|years?|days?)/i,
      /overdue\s+by\s+(\d+\s+)?(months?|years?|days?)/i,
      /deadline\s+(missed|passed|overdue)/i,
      /behind\s+schedule\s+by\s+(\d+\s+)?(months?|years?|days?)/i,
      /long\s+delay/i,
    ],
  },
  {
    type: CitizenClaimType.CONTRACTOR_CONCERN,
    patterns: [
      /contractor\s+(not|absent|irresponsible|negligent)/i,
      /contractor\s+(misconduct|negligence|delay)/i,
      /contractor\s+left/i,
      /no\s+contractor/i,
      /contractor\s+(not\s+)?visiting/i,
    ],
  },
  {
    type: CitizenClaimType.PROGRESS_CONCERN,
    patterns: [
      /no\s+progress/i,
      /less\s+progress/i,
      /slow\s+progress/i,
      /progress\s+mismatch/i,
      /reported\s+(progress|status)\s+(is\s+)?wrong/i,
      /fake\s+progress/i,
    ],
  },
];

// ─── Service ─────────────────────────────────────────────────────────────────

export class ReportTriageService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Full triage pipeline: runs all analysis steps and returns structured result.
   */
  async analyzeReport(reportId: string): Promise<{
    reportId: string;
    suggestedCategory: string;
    suggestedSeverity: string;
    nearbyProjects: Array<{ id: string; name: string; distanceKm: number }>;
    duplicateReports: Array<{ id: string; reportReference: string; similarity: number }>;
    extractedClaims: Array<{ type: string; text: string; confidence: number }>;
    evidenceQuality: string;
    triageStatus: string;
  }> {
    const report = await this.db.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error(`Report ${reportId} not found`);

    // Step 1: Category suggestion
    const suggestedCategory = this.suggestCategory(report.description);

    // Step 2: Priority suggestion
    const suggestedSeverity = this.suggestPriority(report.description);

    // Step 3: Find nearby projects
    let nearbyProjects: Array<{ id: string; name: string; distanceKm: number }> = [];
    if (report.latitude != null && report.longitude != null) {
      nearbyProjects = await this.findNearbyProjects(report.latitude, report.longitude, 2);
    }

    // Step 4: Detect duplicates
    const duplicateReports = await this.detectDuplicates(
      reportId,
      report.description,
      report.latitude ?? undefined,
      report.longitude ?? undefined,
      report.projectId ?? undefined,
    );

    // Step 5: Extract claims
    const extractedClaims = await this.extractClaims(report.description, suggestedCategory);

    // Step 6: Count media
    const mediaCount = await this.db.reportMedia.count({ where: { reportId } });

    // Step 7: Assess evidence quality
    const evidenceQuality = this.assessEvidenceQuality(report, mediaCount);

    // Step 8: Save triage result
    const triageResult = {
      suggestedCategory,
      suggestedSeverity,
      matchedProjectIds: nearbyProjects.map(p => p.id),
      duplicateReportIds: duplicateReports.map(d => d.id),
      extractedClaims: extractedClaims.map(c => ({ type: c.type, text: c.text, confidence: c.confidence })),
      evidenceQuality,
      triageStatus: 'COMPLETED' as const,
      analyzedAt: new Date().toISOString(),
      nearbyProjects,
      duplicateReports,
    };

    await this.db.report.update({
      where: { id: reportId },
      data: {
        triageStatus: 'COMPLETED',
        aiTriage: triageResult,
        aiAnalyzedAt: new Date(),
        evidenceQuality: evidenceQuality as ReportEvidenceQuality,
      },
    });

    return { reportId, ...triageResult };
  }

  /**
   * Keyword-based category suggestion.
   */
  suggestCategory(description: string): string {
    const text = description.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score++;
        }
      }
      if (score > 0) scores[category] = score;
    }

    if (Object.keys(scores).length === 0) return ReportCategory.OTHER;

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best[0];
  }

  /**
   * Keyword-based severity suggestion.
   */
  suggestPriority(description: string): string {
    const text = description.toLowerCase();
    const scores: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const [severity, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          scores[severity]++;
        }
      }
    }

    const order: ReportSeverity[] = [ReportSeverity.CRITICAL, ReportSeverity.HIGH, ReportSeverity.MEDIUM, ReportSeverity.LOW];
    for (const sev of order) {
      if (scores[sev] > 0) return sev;
    }
    return ReportSeverity.MEDIUM;
  }

  /**
   * Find nearby projects using Haversine formula (raw SQL).
   */
  async findNearbyProjects(
    lat: number,
    lng: number,
    radiusKm: number = 2,
  ): Promise<Array<{ id: string; name: string; distanceKm: number }>> {
    const earthRadiusKm = 6371;

    const results = await this.db.$queryRaw<
      Array<{ id: string; name: string; distance_km: number }>
    >`
      SELECT
        p.id,
        p.name,
        (
          ${earthRadiusKm} *
          acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(p.latitude)) *
              cos(radians(p.longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(p.latitude))
            )
          )
        ) AS distance_km
      FROM projects p
      WHERE p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND (
          ${earthRadiusKm} *
          acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(p.latitude)) *
              cos(radians(p.longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(p.latitude))
            )
          )
        ) <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT 10
    `;

    return results.map(r => ({
      id: r.id,
      name: r.name,
      distanceKm: Number(r.distance_km),
    }));
  }

  /**
   * Detect potential duplicate reports.
   */
  async detectDuplicates(
    reportId: string,
    description: string,
    lat?: number,
    lng?: number,
    projectId?: string,
  ): Promise<Array<{ id: string; reportReference: string; similarity: number }>> {
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const significantWords = [...new Set(words)].slice(0, 20);

    if (significantWords.length === 0) return [];

    // Simple text-based duplicate detection
    const existingReports = await this.db.report.findMany({
      where: {
        id: { not: reportId },
        status: { in: ['RECEIVED', 'SUBMITTED', 'TRIAGED', 'REVIEW_QUEUE'] },
        ...(projectId ? { projectId } : {}),
      },
      select: { id: true, reportReference: true, description: true, latitude: true, longitude: true },
      take: 50,
    });

    const duplicates: Array<{ id: string; reportReference: string; similarity: number }> = [];

    for (const existing of existingReports) {
      const existingWords = existing.description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);

      const existingSet = new Set(existingWords);
      const intersection = significantWords.filter(w => existingSet.has(w)).length;
      const union = new Set([...significantWords, ...existingWords]).size;
      const similarity = union > 0 ? intersection / union : 0;

      // Location proximity check
      let locationBonus = 0;
      if (lat != null && lng != null && existing.latitude != null && existing.longitude != null) {
        const dist = this.haversineKm(lat, lng, existing.latitude, existing.longitude);
        if (dist < 0.1) locationBonus = 0.1; // within 100m
        else if (dist < 0.5) locationBonus = 0.05;
      }

      const totalSimilarity = Math.min(1, similarity + locationBonus);
      if (totalSimilarity > 0.3) {
        duplicates.push({ id: existing.id, reportReference: existing.reportReference, similarity: totalSimilarity });
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Extract structured claims from description text.
   */
  async extractClaims(
    description: string,
    _category: string,
  ): Promise<Array<{ type: string; text: string; confidence: number }>> {
    const claims: Array<{ type: string; text: string; confidence: number }> = [];

    for (const { type, patterns } of CLAIM_PATTERNS) {
      for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match) {
          // Find the sentence containing the match
          const sentences = description.split(/[.!?]+/);
          const matchedSentence = sentences.find(s => pattern.test(s.trim())) ?? match[0];
          claims.push({
            type,
            text: matchedSentence.trim(),
            confidence: 0.7,
          });
          break; // one claim per type
        }
      }
    }

    return claims;
  }

  /**
   * Assess evidence quality score based on multiple factors.
   */
  assessEvidenceQuality(report: any, mediaCount: number): string {
    let score = 0;

    // Location precision
    if (report.latitude != null && report.longitude != null) score += 25;
    if (report.locationAccuracyM != null) {
      if (report.locationAccuracyM <= 100) score += 15;
      else if (report.locationAccuracyM <= 500) score += 10;
      else score += 5;
    }

    // Date specificity
    if (report.incidentDate != null) score += 15;

    // Media presence
    if (mediaCount >= 3) score += 25;
    else if (mediaCount >= 1) score += 15;

    // Description length
    const descLen = (report.description ?? '').length;
    if (descLen >= 200) score += 20;
    else if (descLen >= 100) score += 10;

    if (score >= 70) return ReportEvidenceQuality.HIGH;
    if (score >= 40) return ReportEvidenceQuality.MEDIUM;
    return ReportEvidenceQuality.LOW;
  }

  /**
   * Generate a unique report reference: VOJAS-YYYY-XXXX
   */
  generateReportReference(): string {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VOJAS-${year}-${suffix}`;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
