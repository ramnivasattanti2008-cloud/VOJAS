/**
 * M16: Forecasting Service
 *
 * Pluggable forecasting engine supporting multiple methods.
 * All forecasts expose uncertainty, confidence, and data requirements.
 *
 * NEVER fabricate a forecast when insufficient data exists.
 * NEVER present a forecast as proof of wrongdoing.
 */

import { PrismaClient } from '@vojas/db';
import { calculateTrend } from './analyticsEngine.js';

export type ForecastType = 'DELAY' | 'COST' | 'PROGRESS' | 'RISK' | 'COMPLETION';
export type ModelType = 'BASELINE' | 'MOVING_AVERAGE' | 'EXPONENTIAL_SMOOTHING' | 'LINEAR_REGRESSION';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface ForecastResult {
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: ConfidenceLevel;
  probability?: number;
  modelType: ModelType;
  modelVersion: string;
  horizonDays: number;
  predictionDate: Date;
  observationCount: number;
  explanation: string;
  limitations: string;
  dataQuality: string;
  dataFreshness: string;
  validUntil: Date;
  contributingSignals: Array<{ signal: string; weight: number; value: number }>;
}

export interface DelayForecastResult extends ForecastResult {
  forecastType: 'DELAY';
  expectedCompletionDate: Date;
  plannedCompletionDate: Date;
  estimatedDelayDays: number;
  delayRangeDays: [number, number];
  probabilityOfDelay: number;
  probabilityOfPlannedCompletion: number;
}

export interface CostForecastResult extends ForecastResult {
  forecastType: 'COST';
  expectedFinalExpenditure: number;
  sanctionedAmount: number;
  expectedUtilizationPct: number;
  potentialOverrunPct: number;
}

export interface RiskForecastResult extends ForecastResult {
  forecastType: 'RISK';
  currentRiskScore: number;
  expectedRiskScore: number;
  riskTrajectory: 'INCREASING' | 'STABLE' | 'DECREASING' | 'VOLATILE';
  probabilityOfIncrease: number;
}

// ── Forecasting Methods ────────────────────────────────────────────────────

function baselineForecast(values: number[], horizon: number): {
  value: number;
  lowerBound: number;
  upperBound: number;
  volatility: number;
} {
  if (values.length === 0) return { value: 0, lowerBound: 0, upperBound: 0, volatility: 0 };
  const latestValue = values[values.length - 1];
  const trend = calculateTrend(values, []);
  const avgChangePerPeriod = trend.changeAbs ?? 0;
  const projected = latestValue + avgChangePerPeriod * horizon;
  const volatility = trend.volatility ?? 0.5;
  const intervalWidth = Math.abs(avgChangePerPeriod * horizon) * volatility + 10;
  return { value: projected, lowerBound: Math.max(0, projected - intervalWidth), upperBound: projected + intervalWidth, volatility };
}

function movingAverageForecast(values: number[], window: number, horizon: number): {
  value: number;
  lowerBound: number;
  upperBound: number;
  volatility: number;
} {
  if (values.length === 0) return { value: 0, lowerBound: 0, upperBound: 0, volatility: 0 };
  const relevantValues = values.slice(-window);
  const avg = relevantValues.reduce((s, v) => s + v, 0) / relevantValues.length;
  const variance = relevantValues.reduce((s, v) => s + (v - avg) ** 2, 0) / relevantValues.length;
  const stdDev = Math.sqrt(variance);
  const lastValue = values[values.length - 1];
  const changePerPeriod = relevantValues.length > 1
    ? (relevantValues[relevantValues.length - 1] - relevantValues[0]) / (relevantValues.length - 1)
    : 0;
  const projected = lastValue + changePerPeriod * horizon;
  const interval = stdDev * Math.sqrt(1 + horizon / relevantValues.length);
  return {
    value: projected,
    lowerBound: Math.max(0, projected - interval * 1.96),
    upperBound: projected + interval * 1.96,
    volatility: stdDev / Math.max(0.01, avg) * 100,
  };
}

function exponentialSmoothing(values: number[], alpha: number, horizon: number): {
  value: number;
  lowerBound: number;
  upperBound: number;
  volatility: number;
} {
  if (values.length === 0) return { value: 0, lowerBound: 0, upperBound: 0, volatility: 0 };
  if (values.length === 1) return { value: values[0], lowerBound: values[0], upperBound: values[0], volatility: 0 };
  let smoothed = values[0];
  const smoothedValues: number[] = [smoothed];
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }
  const forecast = smoothed;
  const variance = smoothedValues.reduce((s, v) => s + (v - forecast) ** 2, 0) / smoothedValues.length;
  const interval = Math.sqrt(variance) * Math.sqrt(1 + horizon * alpha * (2 - alpha));
  return {
    value: forecast,
    lowerBound: Math.max(0, forecast - interval * 1.96),
    upperBound: forecast + interval * 1.96,
    volatility: 0.5,
  };
}

function linearRegressionForecast(values: number[], horizon: number): {
  value: number;
  lowerBound: number;
  upperBound: number;
  slope: number;
} {
  if (values.length < 2) {
    const last = values[values.length - 1] ?? 0;
    return { value: last, lowerBound: last, upperBound: last, slope: 0 };
  }
  const n = values.length;
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = values.reduce((s, y) => s + y, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (values[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  const projected = intercept + slope * (n - 1 + horizon);
  const residuals = values.map((v, i) => v - (intercept + slope * i));
  const rss = residuals.reduce((s, r) => s + r ** 2, 0);
  const rse = Math.sqrt(rss / Math.max(1, n - 2));
  const interval = rse * Math.sqrt(1 + 1 / n + (horizon ** 2) / Math.max(1, denominator));
  return {
    value: projected,
    lowerBound: Math.max(0, projected - interval * 1.96),
    upperBound: projected + interval * 1.96,
    slope,
  };
}

function assessForecastConfidence(observationCount: number, volatility: number, dataFreshness: 'RECENT' | 'STALE' | 'UNKNOWN'): ConfidenceLevel {
  if (observationCount < 3) return 'INSUFFICIENT';
  if (dataFreshness === 'STALE') return 'LOW';
  if (observationCount >= 10 && volatility < 0.3) return 'HIGH';
  if (observationCount >= 5 && volatility < 0.7) return 'MEDIUM';
  return 'LOW';
}

// ── Forecasting Service ────────────────────────────────────────────────────

export class ForecastingService {
  constructor(private readonly prisma: PrismaClient) {}

  async forecastDelay(projectId: string, horizonDays = 90): Promise<DelayForecastResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectRisk: true,
        progressObservations: { orderBy: { reportDate: 'asc' } },
        changeAnalyses: { orderBy: { analysisDate: 'asc' } },
      },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);

    const plannedEnd = project.expectedEndDate ?? null;
    const today = new Date();

    const delayHistory: number[] = [];
    for (const obs of project.progressObservations) {
      if (plannedEnd) {
        const delay = Math.max(0, Math.floor((obs.reportDate.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)));
        delayHistory.push(delay);
      }
    }

    const methods = [
      { name: 'BASELINE', result: baselineForecast(delayHistory, horizonDays) },
      { name: 'MOVING_AVERAGE', result: movingAverageForecast(delayHistory, Math.min(6, delayHistory.length), horizonDays) },
      { name: 'EXPONENTIAL_SMOOTHING', result: exponentialSmoothing(delayHistory, 0.3, horizonDays) },
    ];

    const primaryMethod = methods[1];
    const forecast = primaryMethod.result;

    const currentDelay = plannedEnd
      ? Math.max(0, Math.floor((today.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const estimatedDelay = Math.max(0, Math.round(forecast.value));
    const plannedDate = plannedEnd ?? new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expectedCompletion = new Date(plannedDate.getTime() + estimatedDelay * 24 * 60 * 60 * 1000);

    const obsCount = Math.max(delayHistory.length, project.changeAnalyses.length);
    let probDelay = 0.5;
    if (obsCount >= 5 && estimatedDelay > 0) {
      probDelay = Math.min(0.95, 0.3 + (estimatedDelay / 90) * 0.5 + 0.1);
    }

    const limitations = obsCount < 3
      ? 'Insufficient historical observations. Forecast based on limited data and may not be reliable.'
      : obsCount < 7
        ? 'Limited observation history. Forecast confidence is reduced.'
        : 'Forecast assumes current trend continues. External factors may cause deviation.';

    return {
      forecastType: 'DELAY',
      value: estimatedDelay,
      lowerBound: Math.max(0, Math.round(forecast.lowerBound)),
      upperBound: Math.round(forecast.upperBound),
      confidence: assessForecastConfidence(obsCount, forecast.volatility ?? 0.5, 'RECENT'),
      modelType: primaryMethod.name as ModelType,
      modelVersion: 'analytics-v1.0',
      horizonDays,
      predictionDate: new Date(),
      observationCount: obsCount,
      explanation: this.generateDelayExplanation(project.name, estimatedDelay, forecast, obsCount, plannedEnd),
      limitations,
      dataQuality: obsCount >= 5 ? 'HIGH' : obsCount >= 3 ? 'MEDIUM' : 'LOW',
      dataFreshness: 'RECENT',
      validUntil: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      contributingSignals: [
        { signal: 'current_delay', weight: 0.4, value: currentDelay },
        { signal: 'historical_avg', weight: 0.3, value: delayHistory.length > 0 ? delayHistory.reduce((s, d) => s + d, 0) / delayHistory.length : 0 },
        { signal: 'observation_count', weight: 0.3, value: obsCount },
      ],
      expectedCompletionDate: expectedCompletion,
      plannedCompletionDate: plannedDate,
      estimatedDelayDays: estimatedDelay,
      delayRangeDays: [Math.max(0, Math.round(forecast.lowerBound)), Math.round(forecast.upperBound)],
      probabilityOfDelay: probDelay,
      probabilityOfPlannedCompletion: Math.max(0, 1 - probDelay),
    };
  }

  async forecastCost(projectId: string): Promise<CostForecastResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { financialObservations: { orderBy: { date: 'asc' } } },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);

    const sanctioned = project.approvedAmount;
    const spent = project.spentAmount;
    const utilizationPct = sanctioned > 0 ? (spent / sanctioned) * 100 : 0;

    const observations = project.financialObservations;
    if (observations.length < 2) {
      return {
        forecastType: 'COST',
        value: spent,
        lowerBound: spent,
        upperBound: sanctioned,
        confidence: 'INSUFFICIENT',
        modelType: 'BASELINE',
        modelVersion: 'analytics-v1.0',
        horizonDays: 0,
        predictionDate: new Date(),
        observationCount: observations.length,
        explanation: 'Insufficient financial observation history for cost forecasting.',
        limitations: 'At least 2 financial observations are needed to estimate expenditure trajectory.',
        dataQuality: 'LOW',
        dataFreshness: 'UNKNOWN',
        validUntil: new Date(),
        contributingSignals: [],
        expectedFinalExpenditure: spent,
        sanctionedAmount: sanctioned,
        expectedUtilizationPct: utilizationPct,
        potentialOverrunPct: sanctioned > 0 ? Math.max(0, (spent / sanctioned) * 100 - 100) : 0,
      };
    }

    const expenditureValues = observations.map(o => o.amount);
    const forecast = linearRegressionForecast(expenditureValues, 3);
    const expectedFinal = Math.min(sanctioned * 1.5, spent + forecast.value * 3);
    const expectedUtilization = sanctioned > 0 ? Math.round((expectedFinal / sanctioned) * 100) : utilizationPct;
    const potentialOverrun = sanctioned > 0 ? Math.max(0, expectedUtilization - 100) : 0;

    return {
      forecastType: 'COST',
      value: expectedFinal,
      lowerBound: Math.max(0, expectedFinal * 0.85),
      upperBound: expectedFinal * 1.15,
      confidence: observations.length >= 5 ? 'MEDIUM' : 'LOW',
      modelType: 'LINEAR_REGRESSION',
      modelVersion: 'analytics-v1.0',
      horizonDays: 90,
      predictionDate: new Date(),
      observationCount: observations.length,
      explanation: `Based on ${observations.length} financial observations, VOJAS estimates final expenditure at approximately ₹${Math.round(expectedFinal).toLocaleString('en-IN')}. At current trajectory, expected utilization is ${expectedUtilization}% of sanctioned amount.`,
      limitations: 'Cost forecast assumes expenditure pattern continues at current rate. Unexpected events may alter trajectory.',
      dataQuality: observations.length >= 5 ? 'MEDIUM' : 'LOW',
      dataFreshness: 'RECENT',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      contributingSignals: [
        { signal: 'current_utilization', weight: 0.5, value: utilizationPct },
        { signal: 'expenditure_velocity', weight: 0.3, value: forecast.slope },
        { signal: 'observation_count', weight: 0.2, value: observations.length },
      ],
      expectedFinalExpenditure: expectedFinal,
      sanctionedAmount: sanctioned,
      expectedUtilizationPct: expectedUtilization,
      potentialOverrunPct: potentialOverrun,
    };
  }

  async forecastRisk(projectId: string, horizonDays = 30): Promise<RiskForecastResult> {
    const projectRisk = await this.prisma.projectRisk.findUnique({ where: { projectId } });
    const riskEvents = await this.prisma.riskEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const currentScore = projectRisk?.riskScore ?? 0;
    const scoreHistory = riskEvents.filter(e => e.riskScore !== null).map(e => e.riskScore as number);

    if (scoreHistory.length < 3) {
      return {
        forecastType: 'RISK',
        value: currentScore,
        lowerBound: currentScore,
        upperBound: currentScore,
        confidence: 'INSUFFICIENT',
        modelType: 'BASELINE',
        modelVersion: 'analytics-v1.0',
        horizonDays,
        predictionDate: new Date(),
        observationCount: scoreHistory.length,
        explanation: 'Insufficient risk history for forecasting.',
        limitations: 'At least 3 risk score observations are needed.',
        dataQuality: 'LOW',
        dataFreshness: 'UNKNOWN',
        validUntil: new Date(),
        contributingSignals: [],
        currentRiskScore: currentScore,
        expectedRiskScore: currentScore,
        riskTrajectory: 'STABLE',
        probabilityOfIncrease: 0.5,
      };
    }

    const forecast = baselineForecast(scoreHistory, horizonDays / 7);
    const trend = calculateTrend(scoreHistory, []);

    let trajectory: RiskForecastResult['riskTrajectory'] = 'STABLE';
    if (trend.trend === 'RISING') trajectory = 'INCREASING';
    else if (trend.trend === 'DECLINING') trajectory = 'DECREASING';
    else if (trend.trend === 'VOLATILE') trajectory = 'VOLATILE';

    let probIncrease = 0.5;
    if (trajectory === 'INCREASING') probIncrease = Math.min(0.9, 0.5 + Math.abs((trend.changePct ?? 0)) / 100 * 0.3);
    if (trajectory === 'DECREASING') probIncrease = Math.max(0.1, 0.5 - Math.abs((trend.changePct ?? 0)) / 100 * 0.3);

    return {
      forecastType: 'RISK',
      value: Math.round(Math.max(0, Math.min(100, forecast.value))),
      lowerBound: Math.round(Math.max(0, forecast.lowerBound)),
      upperBound: Math.round(Math.min(100, forecast.upperBound)),
      confidence: assessForecastConfidence(scoreHistory.length, forecast.volatility, 'RECENT'),
      modelType: 'BASELINE',
      modelVersion: 'analytics-v1.0',
      horizonDays,
      predictionDate: new Date(),
      observationCount: scoreHistory.length,
      explanation: `Risk score trajectory analysis based on ${scoreHistory.length} historical observations. ${this.generateRiskExplanation(trajectory, trend)}`,
      limitations: 'Risk forecast is based on historical patterns. New findings may cause deviations.',
      dataQuality: scoreHistory.length >= 5 ? 'MEDIUM' : 'LOW',
      dataFreshness: 'RECENT',
      validUntil: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000),
      contributingSignals: [
        { signal: 'current_risk', weight: 0.5, value: currentScore },
        { signal: 'trend', weight: 0.3, value: trend.changeAbs ?? 0 },
        { signal: 'open_findings', weight: 0.2, value: projectRisk?.findingsCount ?? 0 },
      ],
      currentRiskScore: currentScore,
      expectedRiskScore: Math.round(Math.max(0, Math.min(100, forecast.value))),
      riskTrajectory: trajectory,
      probabilityOfIncrease: probIncrease,
    };
  }

  private generateDelayExplanation(
    projectName: string,
    delayDays: number,
    forecast: { value: number; lowerBound: number; upperBound: number },
    obsCount: number,
    plannedEnd: Date | null
  ): string {
    if (plannedEnd && delayDays > 0) {
      return `Based on ${obsCount} observation(s), VOJAS estimates a delay of approximately ${delayDays} days for ${projectName}. The 95% prediction interval is ${Math.round(forecast.lowerBound)}–${Math.round(forecast.upperBound)} days. This is a probabilistic estimate, not a certainty.`;
    }
    return `VOJAS analyzed ${obsCount} observation(s) for ${projectName}. Current data does not show a clear delay pattern.`;
  }

  private generateRiskExplanation(trajectory: RiskForecastResult['riskTrajectory'], trend: ReturnType<typeof calculateTrend>): string {
    switch (trajectory) {
      case 'INCREASING':
        return `Risk score has been trending upward. Contributing signals include: increasing trend (${Math.round(trend.changePct ?? 0)}% change), ${trend.dataPoints} historical observations.`;
      case 'DECREASING':
        return `Risk score has been trending downward. The project shows improving risk indicators with ${trend.dataPoints} historical observations.`;
      case 'VOLATILE':
        return `Risk score shows high volatility. This may indicate an unstable project situation or insufficient data.`;
      default:
        return `Risk score appears stable based on ${trend.dataPoints} historical observations.`;
    }
  }
}
