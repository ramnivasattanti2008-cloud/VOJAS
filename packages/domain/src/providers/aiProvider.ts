import { ProviderStatus } from './types.js';

export type DocumentType =
  | 'INVOICE'
  | 'TENDER'
  | 'CONTRACT'
  | 'PROGRESS_REPORT'
  | 'COMPLETION_CERTIFICATE'
  | 'INSPECTION_REPORT'
  | 'OTHER';

export interface AIDocumentAnalysis {
  documentType: DocumentType;
  summary: string;
  keywords: string[];
  corruptionIndicators: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-100
  extractedFields?: Record<string, unknown>;
}

export interface AIAnomalyExplanation {
  explanation: string;
  recommendedAction: string;
  confidence: number;
}

export interface AIProvider {
  analyzeDocument(text: string, type: DocumentType): Promise<AIDocumentAnalysis>;
  explainAnomaly(anomaly: {
    title: string;
    description: string;
    ruleCode?: string;
  }): Promise<AIAnomalyExplanation>;
  classifyProjectSector(description: string): Promise<string>;
  getStatus(): ProviderStatus;
}
