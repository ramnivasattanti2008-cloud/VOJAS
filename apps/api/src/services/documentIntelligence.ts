/**
 * Document Intelligence Service — VOJAS M9
 *
 * Full pipeline: upload → validate → queue → extract → classify → cross-check → index
 *
 * Supports 13+ document categories with evidence hierarchy:
 *   AUTHORITATIVE > SOURCE_DERIVED > SYSTEM_DERIVED > AI_INTERPRETED > CITIZEN-REPORTED
 *
 * For OCR: when a real OCR library (tesseract.js, pdf-parse) is available,
 * replace the simulateExtraction() calls with actual OCR calls.
 */

import type { PrismaClient, Document } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ─── File validation constants ───────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.doc', '.docx', '.xls', '.xlsx']);

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

export type DocumentExtraction = {
  id: string;
  documentId: string;
  extractedText: string;
  confidence: ExtractionConfidence;
  confidenceScore: number; // 0-100
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
  overallScore: number; // 0-100
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
   * Validate an uploaded file before processing.
   */
  validateFile(mimeType: string, size: number, originalName: string): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return { valid: false, error: `File type ${mimeType} not allowed. Allowed: PDF, JPEG, PNG, TIFF, DOC, DOCX, XLS, XLSX.` };
    }
    if (size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 50MB.` };
    }
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { valid: false, error: `File extension ${ext} not allowed.` };
    }
    return { valid: true };
  }

  /**
   * Compute a hash of the file for duplicate detection.
   */
  computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Create a document record from an uploaded file.
   * Sets status to PROCESSING and queues extraction.
   */
  async createDocumentFromUpload(params: {
    projectId: string;
    uploadedById: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    type?: string;
    suggestedType?: string;
    title?: string;
    description?: string;
  }): Promise<Document> {
    const { projectId, uploadedById, filename, originalName, mimeType, size, url, type, suggestedType, title, description } = params;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const document = await this.prisma.document.create({
      data: {
        projectId,
        uploadedById,
        filename,
        originalName,
        mimeType,
        size,
        url,
        type: type ?? 'OTHER',
        title: title ?? originalName,
        description: description ?? null,
        suggestedType: suggestedType ?? null,
        status: 'PENDING',
        // Additional fields stored in a JSON field via metadata or extended schema
        // For now, we use extractedText as a processing status holder
      },
    });

    // Trigger async processing
    this.processDocument(document.id).catch(console.error);

    return document;
  }

  /**
   * Main async processing pipeline: extract → classify → cross-check → update.
   * This is called after document creation and runs in the background.
   */
  async processDocument(documentId: string): Promise<DocumentExtraction> {
    const startTime = Date.now();
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw NotFoundError.notFound('Document', documentId);

    try {
      // Step 1: Extract text and fields
      const extraction = await this.extractText(document);

      // Step 2: Classify document type
      const classification = await this.classifyDocument(document, extraction);

      // Step 3: Cross-check against other documents and financial data
      const crossCheck = await this.crossCheck(document, extraction);

      // Persist extraction/classification results. Status is NEVER set to
      // VERIFIED here — that is exclusively a human decision made through
      // PATCH /documents/:id/verify (verifiedById/verifiedAt).
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          extractedText: extraction.extractedText || null,
          suggestedType: classification.suggestedType,
          aiConfidence: extraction.confidenceScore,
        },
      });

      return extraction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'REJECTED' },
      });
      throw new Error(`Document processing failed: ${errorMessage}`);
    }
  }

  /**
   * No OCR/text-extraction provider is integrated. Real extraction requires:
   *   - PDF: pdf-parse + tesseract.js for scanned PDFs
   *   - Images: tesseract.js OCR
   *   - DOCX: mammoth.js
   * Until one is wired in, this must return an explicit unavailable result —
   * never fabricate extracted text, confidence, or field values (amounts,
   * dates, contractor names, GSTIN, etc. are civic data; see CLAUDE.md).
   */
  private async extractText(document: Document): Promise<DocumentExtraction> {
    const startTime = Date.now();
    const processingTimeMs = Date.now() - startTime;

    return {
      id: `extraction-${document.id}`,
      documentId: document.id,
      extractedText: '',
      confidence: 'LOW',
      confidenceScore: 0,
      fields: {},
      pageEvidence: [],
      processingStatus: 'FAILED',
      processingTimeMs,
      processingError: 'No OCR/text-extraction provider is configured.',
    };
  }

  /**
   * Classify document type based on extracted text and filename.
   */
  private async classifyDocument(
    document: Document,
    extraction: DocumentExtraction
  ): Promise<DocumentClassification> {
    const text = extraction.extractedText.toLowerCase();
    const filename = document.originalName.toLowerCase();

    const classifiers: Array<{ type: string; keywords: string[]; weight: number }> = [
      { type: 'INVOICE', keywords: ['invoice', 'bill', 'amount', 'gstin', 'tax invoice', 'tax', 'payment voucher', 'paid'], weight: 1.0 },
      { type: 'RECEIPT', keywords: ['receipt', 'received with thanks', 'payment received'], weight: 1.0 },
      { type: 'COMPLETION_CERTIFICATE', keywords: ['completion certificate', 'work completed', 'certified completion', 'handover'], weight: 1.0 },
      { type: 'TENDER', keywords: ['tender', 'bid', 'e-procurement', 'notice inviting', 'nit'], weight: 1.0 },
      { type: 'CONTRACT', keywords: ['agreement', 'contract', 'terms and conditions', 'whereas'], weight: 1.0 },
      { type: 'SANCTION_ORDER', keywords: ['sanction order', 'sanctioned', 'administrative approval', 'expenditure sanction'], weight: 1.0 },
      { type: 'INSPECTION_REPORT', keywords: ['inspection', 'site visit', 'inspection report', 'inspection note'], weight: 1.0 },
      { type: 'ENVIRONMENTAL_CLEARANCE', keywords: ['environmental clearance', 'moef', 'environmental impact'], weight: 1.0 },
      { type: 'UTILIZATION_CERTIFICATE', keywords: ['utilization certificate', 'uc', 'funds utilized'], weight: 1.0 },
      { type: 'BILL_OF_QUANTITIES', keywords: ['bill of quantities', 'boq', 'schedule of rates', 'sor'], weight: 1.0 },
      { type: 'WORK_ORDER', keywords: ['work order', 'work order no', 'award of work'], weight: 1.0 },
      { type: 'PHOTOGRAPH', keywords: ['photograph', 'photo', 'site photo', 'progress photo'], weight: 0.5 },
    ];

    let bestType = document.type || 'OTHER';
    let bestScore = 0;

    for (const clf of classifiers) {
      const keywordMatches = clf.keywords.filter(
        (kw) => text.includes(kw) || filename.includes(kw)
      ).length;
      if (keywordMatches > 0) {
        const score = (keywordMatches / clf.keywords.length) * clf.weight * 100;
        if (score > bestScore) {
          bestScore = score;
          bestType = clf.type;
        }
      }
    }

    if (bestScore === 0) {
      return {
        suggestedType: document.type || 'OTHER',
        confidence: 'LOW',
        confidenceScore: 0,
        reasoning: 'No extracted text or filename keywords matched a known document type.',
        alternativeTypes: [],
      };
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
   * Cross-check document against:
   *   - Financial observations (amount, date, contractor match)
   *   - Other documents (duplicate detection, milestone sequence)
   *   - Project data (location, dates)
   */
  async crossCheck(document: Document, extraction: DocumentExtraction): Promise<CrossCheckResult> {
    const checks: CrossCheckResult['checks'] = [];
    let passedCount = 0;

    // Check 1: Amount match with financial observations
    if (extraction.fields.amount) {
      const financialObs = await this.prisma.financialObservation.findMany({
        where: { projectId: document.projectId },
        orderBy: { date: 'desc' },
        take: 20,
      });

      const matchingObs = financialObs.filter(
        (o) => Math.abs(o.amount - extraction.fields.amount!) < o.amount * 0.02
      );

      if (matchingObs.length > 0) {
        checks.push({
          checkType: 'AMOUNT_MATCH',
          passed: true,
          severity: 'LOW',
          finding: `Amount ₹${(extraction.fields.amount / 100000).toFixed(2)}L matches ${matchingObs.length} financial observation(s).`,
        });
        passedCount++;
      } else if (financialObs.length > 0) {
        const avgAmount = financialObs.reduce((s, o) => s + o.amount, 0) / financialObs.length;
        const deviation = Math.abs(extraction.fields.amount - avgAmount) / avgAmount;
        checks.push({
          checkType: 'AMOUNT_MATCH',
          passed: deviation < 0.5,
          severity: deviation > 0.5 ? 'MEDIUM' : 'LOW',
          finding: `Amount ₹${(extraction.fields.amount / 100000).toFixed(2)}L deviates ${(deviation * 100).toFixed(0)}% from average observation (₹${(avgAmount / 100000).toFixed(2)}L).`,
          details: `Found ${financialObs.length} financial observations. No exact match for this amount.`,
        });
        if (deviation < 0.5) passedCount++;
      }
    }

    // Check 2: Duplicate detection
    const duplicateCheck = await this.checkDuplicate(document, extraction);
    checks.push(duplicateCheck);
    if (duplicateCheck.passed) passedCount++;

    // Check 3: Contractor name match
    if (extraction.fields.contractor) {
      const contractorDocs = await this.prisma.document.findMany({
        where: {
          projectId: document.projectId,
          id: { not: document.id },
          type: { in: ['CONTRACT', 'TENDER', 'WORK_ORDER', 'AGREEMENT'] },
        },
        take: 10,
      });

      const hasMatchingContractor = contractorDocs.some(
        (d) => d.extractedText?.toLowerCase().includes(extraction.fields.contractor!.toLowerCase())
      );

      checks.push({
        checkType: 'CONTRACTOR_MATCH',
        passed: hasMatchingContractor || contractorDocs.length === 0,
        severity: hasMatchingContractor ? 'LOW' : 'MEDIUM',
        finding: hasMatchingContractor
          ? `Contractor "${extraction.fields.contractor}" matches other procurement documents.`
          : `Contractor "${extraction.fields.contractor}" not found in other procurement documents. Verify manually.`,
      });
      if (hasMatchingContractor || contractorDocs.length === 0) passedCount++;
    }

    // Check 4: Date reasonableness
    if (extraction.fields.date) {
      const docDate = new Date(extraction.fields.date);
      const project = await this.prisma.project.findUnique({ where: { id: document.projectId } });
      if (project) {
        const projectStart = project.startDate ? new Date(project.startDate) : null;
        const projectEnd = project.expectedEndDate ? new Date(project.expectedEndDate) : null;
        const uploadedAt = new Date(document.uploadedAt);

        let datePassed = true;
        let dateFinding = 'Date is within project timeline.';

        if (projectStart && docDate < projectStart) {
          datePassed = false;
          dateFinding = `Document date (${extraction.fields.date}) is before project start date (${project.startDate?.toISOString().split('T')[0]}).`;
        }
        if (projectEnd && docDate > uploadedAt) {
          datePassed = false;
          dateFinding = `Document date (${extraction.fields.date}) is after upload date. Possible future-dating.`;
        }

        checks.push({
          checkType: 'DATE_REASONABLENESS',
          passed: datePassed,
          severity: datePassed ? 'LOW' : 'HIGH',
          finding: dateFinding,
        });
        if (datePassed) passedCount++;
      }
    }

    // Overall score
    const overallScore = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 50;
    const overallPassed = overallScore >= 60;

    const recommendations: string[] = [];
    for (const check of checks) {
      if (!check.passed) {
        if (check.checkType === 'AMOUNT_MATCH') recommendations.push('Verify invoice amount against financial records.');
        if (check.checkType === 'DUPLICATE') recommendations.push('Review potential duplicate documents — same content detected.');
        if (check.checkType === 'CONTRACTOR_MATCH') recommendations.push('Verify contractor identity against registered vendor records.');
        if (check.checkType === 'DATE_REASONABLENESS') recommendations.push('Investigate document date anomaly — possible backdating.');
      }
    }

    return {
      documentId: document.id,
      checks,
      overallPassed,
      overallScore,
      recommendations,
    };
  }

  /**
   * Check for duplicate documents using content hash and filename similarity.
   */
  private async checkDuplicate(document: Document, extraction: DocumentExtraction): Promise<CrossCheckResult['checks'][0]> {
    const existingDocs = await this.prisma.document.findMany({
      where: {
        projectId: document.projectId,
        id: { not: document.id },
        type: document.type,
      },
      take: 10,
    });

    const contentHash = crypto
      .createHash('md5')
      .update(extraction.extractedText.slice(0, 1000))
      .digest('hex');

    const duplicates = existingDocs.filter((doc) => {
      if (!doc.extractedText) return false;
      const existingHash = crypto
        .createHash('md5')
        .update(doc.extractedText.slice(0, 1000))
        .digest('hex');
      return existingHash === contentHash;
    });

    if (duplicates.length > 0) {
      return {
        checkType: 'DUPLICATE',
        passed: false,
        severity: 'HIGH',
        finding: `Potential duplicate: ${duplicates.length} document(s) with identical content found.`,
        details: `Duplicate IDs: ${duplicates.map((d) => d.id).join(', ')}`,
      };
    }

    return {
      checkType: 'DUPLICATE',
      passed: true,
      severity: 'LOW',
      finding: `No duplicate content detected among ${existingDocs.length} similar documents.`,
    };
  }

  /**
   * Full-text search across document extracted text.
   */
  async search(query: string, projectId?: string): Promise<DocumentSearchResult[]> {
    const where = projectId ? { projectId } : {};
    const documents = await this.prisma.document.findMany({
      where: {
        ...where,
        extractedText: { not: null },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      take: 50,
    });

    const queryLower = query.toLowerCase();
    const results: DocumentSearchResult[] = [];

    for (const doc of documents) {
      const text = (doc.extractedText ?? '').toLowerCase();
      if (!text.includes(queryLower)) continue;

      const index = text.indexOf(queryLower);
      const snippet = text.slice(Math.max(0, index - 50), index + query.length + 150);

      // Compute simple relevance score
      const matches = (text.match(new RegExp(queryLower, 'gi')) ?? []).length;
      const score = Math.min(100, matches * 20 + 30);

      results.push({
        documentId: doc.id,
        title: doc.title,
        projectName: doc.project?.name ?? 'Unknown Project',
        type: doc.type,
        snippet: snippet.length < text.length ? `...${snippet}...` : snippet,
        score,
        highlights: [query],
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

}
