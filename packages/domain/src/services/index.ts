// Re-export all domain services
export { ProjectService } from './projectService.js';
export type { PaginatedResult } from './projectService.js';
export { SatelliteService } from './satelliteService.js';
export { FinancialService } from './financialService.js';
export { RiskService } from './riskService.js';

// M9: Financial Intelligence
export { FinancialIntelligenceService } from './financialIntelligence.js';
export type {
  FundLifecycle,
  ReconciliationResult,
  PeerBenchmark,
  CostAnomalySignal,
  CrossSourceCorrelation,
  FinancialRiskSignals,
} from './financialIntelligence.js';
export type { RiskFinding } from './riskService.js';
export { DataSourceService } from './dataSourceService.js';
export { AuditService } from './auditService.js';

// M9: Document Intelligence
export { DocumentIntelligenceService } from './documentIntelligence.js';
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
} from './documentIntelligence.js';

// M8: Risk Engine
export {
  RiskAnalysisOrchestrator,
  SignalGenerator,
  CorrelationEngine,
  RiskScorer,
  DataQualityGate,
  AIExplainer,
  RiskRuleEngine,
} from './riskEngine/index.js';
export type {
  RiskAnalysisResult,
} from './riskEngine/index.js';
export * from './riskEngine/types.js';

// M16: Advanced Analytics
export { AnalyticsEngine } from './analyticsEngine.js';
export type {
  EntityType,
  MetricType,
  Period,
  TrendDirection,
  ConfidenceLevel,
  DataQualityLevel,
  ProjectAnalytics,
  TrendResult,
  AggregatedMetrics,
  BenchmarkComparison,
  CrossSignalCorrelation,
} from './analyticsEngine.js';
export { BenchmarkService } from './benchmarkService.js';
export type {
  BenchmarkDistribution,
  ProjectBenchmark,
} from './benchmarkService.js';
export { ForecastingService } from './forecastingService.js';
export type {
  ForecastResult,
  DelayForecastResult,
  CostForecastResult,
  RiskForecastResult,
  ModelType,
} from './forecastingService.js';
export { ScenarioService } from './scenarioService.js';
export type {
  ScenarioParams,
  ScenarioResult,
  ScenarioType,
} from './scenarioService.js';
