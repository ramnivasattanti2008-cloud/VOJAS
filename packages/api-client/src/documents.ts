import type { ApiClient } from './client.js';
import type { Document, PaginatedResponse } from './types.js';

// Document intelligence types
export type DocumentExtraction = {
  documentId: string;
  extractedText: string | null;
  suggestedType: string | null;
  aiConfidence: number | null;
  status: string;
  processingComplete: boolean;
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

export type UploadDocumentPayload = {
  projectId: string;
  type?: string;
  title?: string;
  description?: string;
  content: string; // base64
  filename: string;
  mimeType: string;
  size: number;
};

export function createDocumentApi(client: ApiClient) {
  return {
    // ─── Core ───────────────────────────────────────────────────────
    list(params?: { projectId?: string; type?: string; status?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Document>>('/documents', params);
    },
    get(id: string) {
      return client.get<Document>(`/documents/${id}`);
    },
    listByProject(projectId: string) {
      return client.get<Document[]>(`/documents/by-project/${projectId}`);
    },

    // ─── Upload & Processing ─────────────────────────────────────────
    upload(payload: UploadDocumentPayload) {
      return client.post<Document>('/documents/upload', payload);
    },
    reprocess(id: string) {
      return client.post<Document>(`/documents/${id}/reprocess`);
    },

    // ─── Intelligence ───────────────────────────────────────────────
    getExtraction(id: string) {
      return client.get<DocumentExtraction>(`/documents/${id}/extraction`);
    },
    crossCheck(id: string) {
      return client.get<CrossCheckResult>(`/documents/${id}/cross-check`);
    },
    search(query: string, projectId?: string) {
      return client.get<DocumentSearchResult[]>(`/documents/search/query?q=${encodeURIComponent(query)}${projectId ? `&projectId=${projectId}` : ''}`);
    },

    // ─── Verification ────────────────────────────────────────────────
    verify(id: string, payload: { status: 'VERIFIED' | 'REJECTED' | 'REQUIRES_INFO'; verificationNote?: string }) {
      return client.patch<Document>(`/documents/${id}/verify`, payload);
    },
  };
}

export type DocumentApi = ReturnType<typeof createDocumentApi>;
