/**
 * M8: Risk Engine — Public API
 */

// Core types
export * from './types.js';

// Rule engine
export {
  RiskRuleEngine,
  registerCoreRules,
  ProgressSatelliteMismatchRule,
  FinancialPhysicalMismatchRule,
  ProjectDelayRule,
} from './ruleEngine.js';
export type { ProjectDataSnapshot } from './ruleEngine.js';

// Signal generation
export { SignalGenerator } from './signalGenerator.js';

// Correlation
export { CorrelationEngine } from './correlationEngine.js';

// Risk scoring
export { RiskScorer } from './riskScorer.js';
export type { ProjectRiskResult, ScoreContributor } from './riskScorer.js';

// Data quality
export { DataQualityGate } from './dataQualityGate.js';

// AI explainer
export { AIExplainer } from './aiExplainer.js';
export type { AIExplanationInput, AIExplanationOutput } from './aiExplainer.js';

// Orchestrator
export { RiskAnalysisOrchestrator } from './riskAnalysisOrchestrator.js';
export type { RiskAnalysisResult } from './riskAnalysisOrchestrator.js';
