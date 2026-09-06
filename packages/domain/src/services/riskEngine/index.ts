/**
 * M8: Risk Engine — Public API
 */

// Core types
export * from './types';

// Rule engine
export {
  RiskRuleEngine,
  registerCoreRules,
  ProgressSatelliteMismatchRule,
  FinancialPhysicalMismatchRule,
  ProjectDelayRule,
} from './ruleEngine';
export type { ProjectDataSnapshot } from './ruleEngine';

// Signal generation
export { SignalGenerator } from './signalGenerator';

// Correlation
export { CorrelationEngine } from './correlationEngine';

// Risk scoring
export { RiskScorer } from './riskScorer';
export type { ProjectRiskResult, ScoreContributor } from './riskScorer';

// Data quality
export { DataQualityGate } from './dataQualityGate';

// AI explainer
export { AIExplainer } from './aiExplainer';
export type { AIExplanationInput, AIExplanationOutput } from './aiExplainer';

// Orchestrator
export { RiskAnalysisOrchestrator } from './riskAnalysisOrchestrator';
export type { RiskAnalysisResult } from './riskAnalysisOrchestrator';
