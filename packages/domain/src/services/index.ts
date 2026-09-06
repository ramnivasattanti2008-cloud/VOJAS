// Re-export all domain services
export { ProjectService } from './projectService';
export type { PaginatedResult } from './projectService';
export { SatelliteService } from './satelliteService';
export { FinancialService } from './financialService';
export { RiskService } from './riskService';

// M9: Financial Intelligence
export { FinancialIntelligenceService } from './financialIntelligence';
export type {
  FundLifecycle,
  ReconciliationResult,
  PeerBenchmark,
  CostAnomalySignal,
  CrossSourceCorrelation,
  FinancialRiskSignals,
} from './financialIntelligence';
export type { RiskFinding } from './riskService';
export { DataSourceService } from './dataSourceService';
export { AuditService } from './auditService';

// M9: Document Intelligence
export { DocumentIntelligenceService } from './documentIntelligence';
export {
  DOCUMENT_TYPES,
  type DocumentType,
  type DocumentProcessingStatus,
  type EvidenceLevel,
  type ExtractionConfidence,
  type ExtractedFields,
  type DocumentExtractionResult,
  type DocumentClassification,
  type CrossCheckResult,
  type DocumentSearchResult,
} from './documentIntelligence';

// M8: Risk Engine
export {
  RiskAnalysisOrchestrator,
  SignalGenerator,
  CorrelationEngine,
  RiskScorer,
  DataQualityGate,
  AIExplainer,
  RiskRuleEngine,
} from './riskEngine/index';
export type {
  RiskAnalysisResult,
} from './riskEngine/index';
export * from './riskEngine/types';
