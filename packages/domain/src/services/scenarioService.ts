// M16: Scenario Service
import type { PrismaClient } from '@vojas/db';

export type ScenarioType = 'PROGRESS_RATE' | 'EXPENDITURE_CHANGE' | 'MILESTONE_DELAY' | 'ACCELERATION' | 'COST_ESCALATION';

export interface ScenarioParams {
  scenarioType: ScenarioType;
  baselineValue: number;
  changeRate?: number; // e.g. 0.15 for 15% change
  horizonDays?: number;
}

export interface ScenarioResult {
  name: string;
  description: string;
  scenarioType: ScenarioType;
  baselineValue: number;
  scenarioValue: number;
  difference: number;
  differencePct: number;
  confidence: string;
  assumptions: string[];
  limitations: string;
}

export class ScenarioService {
  constructor(private readonly prisma: PrismaClient) {}

  async runScenario(projectId: string, params: ScenarioParams): Promise<ScenarioResult> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const baseline = params.baselineValue;
    const rate = params.changeRate ?? 0;
    const horizon = params.horizonDays ?? 90;

    let scenarioValue = baseline;
    const assumptions: string[] = [];
    const limitations: string[] = [];

    switch (params.scenarioType) {
      case 'PROGRESS_RATE': {
        // What if progress rate changes by rate?
        const currentProgress = baseline;
        const monthlyRate = currentProgress / Math.max(1, horizon / 30);
        const newMonthlyRate = monthlyRate * (1 + rate);
        scenarioValue = Math.min(100, newMonthlyRate * (horizon / 30));
        assumptions.push('Assumes new progress rate is sustained for ' + horizon + ' days');
        assumptions.push('Does not account for seasonal factors or external events');
        break;
      }
      case 'EXPENDITURE_CHANGE': {
        // What if expenditure changes by rate?
        const currentSpent = project.spentAmount;
        scenarioValue = currentSpent * (1 + rate);
        assumptions.push('Assumes expenditure pattern changes by ' + (rate * 100).toFixed(0) + '%');
        const projectedUtil = project.approvedAmount > 0 ? (scenarioValue / project.approvedAmount) * 100 : 0;
        assumptions.push('Projected utilization: ' + Math.round(projectedUtil) + '%');
        break;
      }
      case 'MILESTONE_DELAY': {
        // What if next milestone is delayed by rate (days)?
        const delayDays = Math.round(rate * horizon);
        scenarioValue = baseline + delayDays;
        assumptions.push('Assumes delay of ' + delayDays + ' days from baseline');
        assumptions.push('Does not account for cascading delays');
        break;
      }
      case 'ACCELERATION': {
        // What if project accelerates by rate?
        const remainingProgress = 100 - baseline;
        const weeksToComplete = remainingProgress / (baseline / Math.max(1, horizon / 7));
        const acceleratedWeeks = weeksToComplete / (1 + rate);
        scenarioValue = 100;
        assumptions.push('Assumes project accelerates by ' + (rate * 100).toFixed(0) + '%');
        break;
      }
      case 'COST_ESCALATION': {
        // What if costs increase by rate?
        scenarioValue = baseline * (1 + rate);
        const overrunPct = project.approvedAmount > 0 ? ((scenarioValue - project.approvedAmount) / project.approvedAmount) * 100 : 0;
        assumptions.push('Assumes ' + (rate * 100).toFixed(0) + '% cost increase from baseline of ' + baseline.toFixed(0));
        if (overrunPct > 0) assumptions.push('Projected overrun: ' + overrunPct.toFixed(1) + '% over sanctioned amount');
        break;
      }
    }

    const difference = scenarioValue - baseline;
    const differencePct = baseline !== 0 ? (difference / baseline) * 100 : 0;

    limitations.push('Simulation only — actual outcomes may differ significantly');
    limitations.push('External factors (weather, funding, labor) not modeled');
    limitations.push('Results should not be treated as predictions');

    return {
      name: params.scenarioType.replace(/_/g, ' '),
      description: 'What-if scenario analysis for ' + project.name,
      scenarioType: params.scenarioType,
      baselineValue: baseline,
      scenarioValue: Math.round(scenarioValue * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      differencePct: Math.round(differencePct * 100) / 100,
      confidence: 'MEDIUM',
      assumptions,
      limitations: limitations.join('; '),
    };
  }

  async runComparativeScenario(
    entityType: string,
    entityId: string,
    scenarioType: ScenarioType,
    changeRate: number
  ): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = [];
    let projects;

    if (entityType === 'DISTRICT') {
      projects = await this.prisma.project.findMany({ where: { districtId: entityId } });
    } else if (entityType === 'STATE') {
      projects = await this.prisma.project.findMany({ where: { state: entityId } });
    } else if (entityType === 'SECTOR') {
      projects = await this.prisma.project.findMany({ where: { sector: entityId as any } });
    } else {
      projects = await this.prisma.project.findMany({});
    }

    for (const project of projects.slice(0, 20)) {
      const baseline = project.spentAmount;
      const scenario = await this.runScenario(project.id, { scenarioType, baselineValue: baseline, changeRate });
      results.push(scenario);
    }

    return results;
  }
}
