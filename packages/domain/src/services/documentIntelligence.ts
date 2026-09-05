/**
 * Document Intelligence Service — Domain Layer (VOJAS M9)
 *
 * Pure business logic: classification, cross-checking, search.
 * File upload and I/O handled in the API layer.
 */

import type { PrismaClient, Document } from '@vojas/db';
import { NotFoundError } from '../errors/index.js';
import crypto from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocumentProcessingStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'PROCESSING'
  | 'EXTRACTING'
  | 'CLASSIFYING'
  | 'CROSS_CHECKING'
  | 'COMPLETED'
  | 'FAILED';

export type EvidenceLevel =
  | 'AUTHORITATIVE'
  | 'SOURCE_DERIVED'
  | 'SYSTEM_DERIVED'
  | 'AI_INTERPRETED'
  | 'CITIZEN_REPORTED';

export type ExtractionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type ExtractedFields = {
  amount?: number;
  date?: string;
  contractor?: string;
  invoiceNo?: string;
  gstin?: string;
  vendorName?: string;
  projectName?: string;
  milestone?: string;
  scopeOfWork?: string;
  location?: string;
};

export type DocumentExtractionResult = {
  id: string;
  documentId: string;
  extractedText: string;
  confidence: ExtractionConfidence;
  confidenceScore: number;
  fields: ExtractedFields;
  pageEvidence: Array<{ page: number; snippet: string; bbox?: number[] }>;
  processingStatus: DocumentProcessingStatus;
  processingTimeMs: number;
  processingError?: string;
};

export type DocumentClassification = {
  suggestedType: string;
  confidence: ExtractionConfidence;
  confidenceScore: number;
  reasoning: string;
  alternativeTypes: Array<{ type: string; confidence: number }>;
};

export type CrossCheckResult = {
  documentId: string;
  checks: Array<{
    checkType: 'AMOUNT_MATCH' | 'CONTRACTOR_MATCH' | 'DATE_REASONABLENESS' | 'LOCATION_MATCH' | 'DUPLICATE' | 'MILESTONE_SEQUENCE';
    passed: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    finding: string;
    details?: string;
  }>;
  overallPassed: boolean;
  overallScore: number;
  recommendations: string[];
};

export type DocumentSearchResult = {
  documentId: string;
  title: string;
  projectName: string;
  type: string;
  snippet: string;
  score: number;
  highlights: string[];
};

export const DOCUMENT_TYPES = [
  'SANCTION_ORDER',
  'TENDER',
  'CONTRACT',
  'INVOICE',
  'RECEIPT',
  'COMPLETION_CERTIFICATE',
  'INSPECTION_REPORT',
  'PHOTOGRAPH',
  'ENVIRONMENTAL_CLEARANCE',
  'UTILIZATION_CERTIFICATE',
  'PAYMENT_VOUCHER',
  'BILL_OF_QUANTITIES',
  'WORK_ORDER',
  'AGREEMENT',
  'MUSTER_ROLL',
  'LABOUR_REPORT',
  'MATERIAL_PROCUREMENT',
  'FINANCIAL_STATEMENT',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ─── Main Service ────────────────────────────────────────────────────────────

export class DocumentIntelligenceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Classify document type based on extracted text and filename.
   */
  async classifyDocument(
    document: Document,
    extractedText: string
  ): Promise<DocumentClassification> {
    const text = (extractedText || '').toLowerCase();
    const filename = (document.originalName || '').toLowerCase();

    const classifiers: Array<{ type: string; keywords: string[] }> = [
      { type: 'INVOICE', keywords: ['invoice', 'bill', 'amount', 'gstin', 'tax invoice', 'payment voucher', 'paid'] },
      { type: 'RECEIPT', keywords: ['receipt', 'received with thanks', 'payment received'] },
      { type: 'COMPLETION_CERTIFICATE', keywords: ['completion certificate', 'work completed', 'certified completion', 'handover'] },
      { type: 'TENDER', keywords: ['tender', 'bid', 'e-procurement', 'notice inviting', 'nit'] },
      { type: 'CONTRACT', keywords: ['agreement', 'contract', 'terms and conditions', 'whereas'] },
      { type: 'SANCTION_ORDER', keywords: ['sanction order', 'sanctioned', 'administrative approval'] },
      { type: 'INSPECTION_REPORT', keywords: ['inspection', 'site visit', 'inspection report'] },
      { type: 'ENVIRONMENTAL_CLEARANCE', keywords: ['environmental clearance', 'moef', 'environmental impact'] },
      { type: 'UTILIZATION_CERTIFICATE', keywords: ['utilization certificate', 'uc', 'funds utilized'] },
      { type: 'BILL_OF_QUANTITIES', keywords: ['bill of quantities', 'boq', 'schedule of rates'] },
      { type: 'WORK_ORDER', keywords: ['work order', 'work order no', 'award of work'] },
    ];

    let bestType = document.type || 'OTHER';
    let bestScore = 0;

    for (const clf of classifiers) {
      const keywordMatches = clf.keywords.filter(
        (kw) => text.includes(kw) || filename.includes(kw)
      ).length;
      if (keywordMatches > 0) {
        const score = (keywordMatches / clf.keywords.length) * 100;
        if (score > bestScore) {
          bestScore = score;
          bestType = clf.type;
        }
      }
    }

    const confidenceScore = Math.min(100, bestScore + 20);
    return {
      suggestedType: bestType,
      confidence: confidenceScore >= 80 ? 'HIGH' : confidenceScore >= 50 ? 'MEDIUM' : 'LOW',
      confidenceScore,
      reasoning: `Matched ${bestType} based on content analysis.`,
      alternativeTypes: [],
    };
  }

  /**
   * Cross-check document against financial observations and other documents.
   */
  async crossCheck(
    document: Document,
    extractedText: string,
    fields: ExtractedFields
  ): Promise<CrossCheckResult> {
    const checks: CrossCheckResult['checks'] = [];
    let passedCount = 0;

    // Amount match check
    if (fields.amount) {
      const financialObs = await this.prisma.financialObservation.findMany({
        where: { projectId: document.projectId },
        orderBy: { date: 'desc' },
        take: 20,
      });

      const matchingObs = financialObs.filter(
        (o) => Math.abs(o.amount - fields.amount!) < o.amount * 0.02
      );

      if (matchingObs.length > 0) {
        checks.push({
          checkType: 'AMOUNT_MATCH',
          passed: true,
          severity: 'LOW',
          finding: `Amount ₹${(fields.amount / 100000).toFixed(2)}L matches ${matchingObs.length} financial observation(s).`,
        });
        passedCount++;
      } else if (financialObs.length > 0) {
        const avgAmount = financialObs.reduce((s, o) => s + o.amount, 0) / financialObs.length;
        const deviation = Math.abs(fields.amount - avgAmount) / avgAmount;
        checks.push({
          checkType: 'AMOUNT_MATCH',
          passed: deviation < 0.5,
          severity: deviation > 0.5 ? 'MEDIUM' : 'LOW',
          finding: `Amount deviates ${(deviation * 100).toFixed(0)}% from average observation.`,
        });
        if (deviation < 0.5) passedCount++;
      }
    }

    // Duplicate check
    const existingDocs = await this.prisma.document.findMany({
      where: { projectId: document.projectId, id: { not: document.id } },
      take: 10,
    });

    const contentHash = crypto.createHash('md5').update((extractedText || '').slice(0, 1000)).digest('hex');
    const duplicates = existingDocs.filter((d) => {
      if (!d.extractedText) return false;
      const existingHash = crypto.createHash('md5').update(d.extractedText.slice(0, 1000)).digest('hex');
      return existingHash === contentHash;
    });

    checks.push({
      checkType: 'DUPLICATE',
      passed: duplicates.length === 0,
      severity: duplicates.length > 0 ? 'HIGH' : 'LOW',
      finding: duplicates.length > 0
        ? `Potential duplicate: ${duplicates.length} document(s) with identical content.`
        : `No duplicate content detected among ${existingDocs.length} similar documents.`,
    });
    if (duplicates.length === 0) passedCount++;

    // Contractor match
    if (fields.contractor) {
      const contractorDocs = await this.prisma.document.findMany({
        where: { projectId: document.projectId, id: { not: document.id } },
        take: 10,
      });
      const hasMatch = contractorDocs.some(
        (d) => d.extractedText?.toLowerCase().includes(fields.contractor!.toLowerCase())
      );
      checks.push({
        checkType: 'CONTRACTOR_MATCH',
        passed: hasMatch || contractorDocs.length === 0,
        severity: hasMatch ? 'LOW' : 'MEDIUM',
        finding: hasMatch
          ? `Contractor "${fields.contractor}" matches other procurement documents.`
          : `Contractor "${fields.contractor}" not found in other procurement documents.`,
      });
      if (hasMatch || contractorDocs.length === 0) passedCount++;
    }

    // Date reasonableness
    if (fields.date) {
      const docDate = new Date(fields.date);
      const project = await this.prisma.project.findUnique({ where: { id: document.projectId } });
      if (project) {
        const projectStart = project.startDate ? new Date(project.startDate) : null;
        const uploadedAt = new Date(document.uploadedAt);
        let passed = true;
        let finding = 'Date is within project timeline.';

        if (projectStart && docDate < projectStart) {
          passed = false;
          finding = `Document date (${fields.date}) is before project start date.`;
        }
        if (docDate > uploadedAt) {
          passed = false;
          finding = `Document date (${fields.date}) is after upload date. Possible future-dating.`;
        }

        checks.push({
          checkType: 'DATE_REASONABLENESS',
          passed,
          severity: passed ? 'LOW' : 'HIGH',
          finding,
        });
        if (passed) passedCount++;
      }
    }

    const overallScore = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 50;
    const recommendations: string[] = [];
    for (const check of checks) {
      if (!check.passed) {
        if (check.checkType === 'AMOUNT_MATCH') recommendations.push('Verify invoice amount against financial records.');
        if (check.checkType === 'DUPLICATE') recommendations.push('Review potential duplicate documents.');
        if (check.checkType === 'CONTRACTOR_MATCH') recommendations.push('Verify contractor identity against registered vendor records.');
        if (check.checkType === 'DATE_REASONABLENESS') recommendations.push('Investigate document date anomaly — possible backdating.');
      }
    }

    return {
      documentId: document.id,
      checks,
      overallPassed: overallScore >= 60,
      overallScore,
      recommendations,
    };
  }

  /**
   * Full-text search across document extracted text.
   */
  async search(query: string, projectId?: string): Promise<DocumentSearchResult[]> {
    const where: Record<string, unknown> = { extractedText: { not: null } };
    if (projectId) where.projectId = projectId;

    const documents = await this.prisma.document.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      take: 50,
    });

    const queryLower = query.toLowerCase();
    const results: DocumentSearchResult[] = [];

    for (const doc of documents) {
      const text = ((doc.extractedText as string) || '').toLowerCase();
      if (!text.includes(queryLower)) continue;

      const index = text.indexOf(queryLower);
      const snippet = text.slice(Math.max(0, index - 50), index + query.length + 150);
      const matches = (text.match(new RegExp(queryLower, 'gi')) ?? []).length;
      const score = Math.min(100, matches * 20 + 30);

      results.push({
        documentId: doc.id,
        title: doc.title,
        projectName: doc.project?.name ?? 'Unknown Project',
        type: doc.type,
        snippet: `...${snippet}...`,
        score,
        highlights: [query],
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
