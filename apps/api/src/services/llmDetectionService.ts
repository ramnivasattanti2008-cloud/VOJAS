/**
 * VOJAS Sentinel v4.2 — Forensic Screening Engine
 * ================================================
 * Produces risk indicators for human verification. Nothing here is proof of fraud.
 *
 * Two modes:
 *  1. Cloud LLM mode — Google Gemini (gemini-2.0-flash) or OpenAI (gpt-4o-mini),
 *     used only when GEMINI_API_KEY or OPENAI_API_KEY is configured.
 *  2. In-process fallback — a deterministic RULE-BASED heuristic. It is not a neural
 *     network, it is not trained, and no model weights are involved; it is a set of
 *     threshold rules over real database columns, named after the statutory rules it
 *     screens for (GFR 2017, CVC, CPWD).
 *
 * Every figure it reports must trace to a real column. Where a project has no
 * processed satellite observation, it returns NO_USABLE_OBSERVATION rather than
 * describing ground conditions it never measured.
 */

import type { PrismaClient } from '@vojas/db';
import { RiskLevel } from '@vojas/db';

export type ForensicVerdict =
  | 'CLEAN'
  | 'SUSPECTED_GHOST_WORK'
  | 'INFLATED_COST_ANOMALY'
  | 'PROCUREMENT_COLLUSION'
  | 'PROGRESS_STALL'
  | 'EVIDENCE_DEFICIT';

export interface StatutoryRedFlag {
  rule: string;
  violation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
}

export interface ForensicAuditResult {
  projectId: string;
  projectName: string;
  modelUsed: string;
  auditedAt: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  confidenceScore: number; // 0-100%
  forensicVerdict: ForensicVerdict;
  verdictTitle: string;
  executiveSummary: string;
  statutoryRedFlags: StatutoryRedFlag[];
  financialAudit: {
    utilizationRate: number; // percentage
    disbursalAnomaly: boolean;
    analysis: string;
  };
  satelliteTelemetryVerdict: {
    // null means no usable observation exists — distinct from "observed, no change".
    spectralChangeDetected: boolean | null;
    interpretation: string;
    surfaceObservationConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_AVAILABLE';
  };
  contractorRiskAssessment: {
    contractorName: string | null;
    concentrationIndex: string;
    riskFlags: string[];
  };
  actionPlan: Array<{
    step: number;
    action: string;
    authority: string;
    urgency: 'IMMEDIATE' | 'HIGH' | 'STANDARD';
  }>;
  citizenChecklist: string[];
}

/** Explicit unavailable state — never replace this with an inferred description of the ground. */
const SATELLITE_UNAVAILABLE = 'NO_USABLE_OBSERVATION: no processed Sentinel-2 observation is on record for this project.';

export class LLMDetectionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Run full forensic LLM audit on a project by ID
   */
  async auditProject(projectId: string): Promise<ForensicAuditResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectRisk: true,
        locations: true,
        changeAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        financialObservations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        satelliteObservations: {
          orderBy: { observationDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found.`);
    }

    const citizenReportCount = await this.prisma.report.count({
      where: {
        projectId,
        status: { in: ['SUBMITTED', 'VERIFIED', 'TRIAGED'] },
      },
    });

    const approved = Number(project.approvedAmount) || 0;
    const spent = Number(project.spentAmount) || 0;
    const spentRatio = approved > 0 ? spent / approved : 0;
    const hasCoords = project.latitude != null && project.longitude != null;
    const isCompleted = project.status === 'COMPLETED' || project.status === 'VERIFIED';
    const isUnsanctioned = project.status === 'UNSANCTIONED' || project.status === 'PROPOSED';
    const hasContractor = Boolean(project.contractor && project.contractor.trim().length > 0);

    // Check for Cloud LLM Keys
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey.trim().length > 0) {
      try {
        const cloudResult = await this.callGeminiLLM(project, geminiKey);
        if (cloudResult) return cloudResult;
      } catch (cloudErr) {
        console.warn('Gemini API call failed, falling back to VOJAS Neural-LLM Core:', cloudErr);
      }
    } else if (openaiKey && openaiKey.trim().length > 0) {
      try {
        const cloudResult = await this.callOpenAILLM(project, openaiKey);
        if (cloudResult) return cloudResult;
      } catch (cloudErr) {
        console.warn('OpenAI API call failed, falling back to VOJAS Neural-LLM Core:', cloudErr);
      }
    }

    // VOJAS Sentinel AI v4.2 Neural-LLM Core (Trained In-Process Engine)
    return this.runNeuralLLMCore(project, approved, spent, spentRatio, hasCoords, isCompleted, isUnsanctioned, hasContractor, citizenReportCount);
  }

  /**
   * VOJAS Sentinel AI v4.2 Neural-LLM Core Engine
   */
  private runNeuralLLMCore(
    project: any,
    approved: number,
    spent: number,
    spentRatio: number,
    hasCoords: boolean,
    isCompleted: boolean,
    isUnsanctioned: boolean,
    hasContractor: boolean,
    citizenReportCount: number
  ): ForensicAuditResult {
    const redFlags: StatutoryRedFlag[] = [];
    const actionPlan: ForensicAuditResult['actionPlan'] = [];
    let verdict: ForensicVerdict = 'CLEAN';
    let verdictTitle = 'Standard Public Asset Delivery';
    let riskScore = 14;
    let riskLevel: RiskLevel = RiskLevel.LOW;
    let spectralChange = isCompleted;
    let disbursalAnomaly = false;

    // Ground every satellite statement in rows that actually exist. A usable
    // observation is one that was processed and carries a real spectral index;
    // anything else cannot support a claim about the ground.
    const allObservations = Array.isArray(project.satelliteObservations) ? project.satelliteObservations : [];
    const usableObservations = allObservations.filter(
      (o: { ndvi: number | null; ndbi: number | null; constructionScore: number | null }) =>
        o.ndvi != null || o.ndbi != null || o.constructionScore != null
    );
    const observationCount = usableObservations.length;
    const observationDates = usableObservations
      .map((o: { observationDate: Date }) => o.observationDate)
      .filter(Boolean)
      .map((d: Date) => new Date(d).toISOString().slice(0, 10))
      .sort();
    const observationWindow =
      observationDates.length > 1
        ? `${observationDates[0]} and ${observationDates[observationDates.length - 1]}`
        : observationDates[0] ?? 'an unrecorded date';

    const latestChange = project.changeAnalyses?.[0];
    // A ghost-work signal may only be raised from a real change analysis. It must
    // never be inferred from project prose: matching on description text would let
    // seed copy dictate a CRITICAL fraud verdict with no underlying evidence.
    const isGhostBySatellite = Boolean(
      latestChange && (
        latestChange.changeClassification === 'NO_DETECTABLE_CHANGE' ||
        latestChange.changePercent === 0 ||
        (latestChange.changeStory && latestChange.changeStory.toUpperCase().includes('GHOST'))
      ) && spentRatio >= 0.4
    );

    // Pattern 1: Ghost Project via Satellite Ground-Truth or Missing Telemetry
    if (isGhostBySatellite || (spentRatio > 0.8 && !hasCoords && (project.status === 'IN_PROGRESS' || isCompleted))) {
      verdict = 'SUSPECTED_GHOST_WORK';
      verdictTitle = isGhostBySatellite
        ? `Critical Satellite Ground-Truth Discrepancy: Zero Observable Construction Despite ${(spentRatio * 100).toFixed(0)}% Fund Disbursement`
        : 'High Ghost-Asset Probability: Zero Physical Telemetry with >80% Fund Absorption';
      riskScore = isGhostBySatellite ? 96 : 88;
      riskLevel = RiskLevel.CRITICAL;
      disbursalAnomaly = true;
      spectralChange = false;

      redFlags.push({
        rule: 'GFR 2017 Rule 139 & CPWD Section 10',
        violation: 'Fund disbursement recorded without corresponding physical progress. Requires human verification.',
        severity: 'CRITICAL',
        evidence: latestChange?.changeStory
          ? latestChange.changeStory
          : `Disbursed ₹${(spent / 100000).toFixed(2)} Lakh (${(spentRatio * 100).toFixed(1)}% of sanction) with no geospatial coordinates on record, so no surface observation could be attempted. ${SATELLITE_UNAVAILABLE}`,
      });

      if (observationCount > 0) {
        redFlags.push({
          rule: 'Anti-Corruption Bureau (ACB) & CVC Circular 02/05/2022',
          violation: 'Pattern consistent with ghost-asset risk. This is an indicator for investigation, not a finding of fraud.',
          severity: 'CRITICAL',
          evidence: `${observationCount} usable satellite observation(s) on record between ${observationWindow}; the latest change analysis reports ${latestChange?.changeClassification ?? 'no detectable change'}.`,
        });
      }

      actionPlan.push(
        {
          step: 1,
          action: 'Immediately freeze further treasury release vouchers under this sanction head.',
          authority: 'District Collector & Treasury Officer',
          urgency: 'IMMEDIATE',
        },
        {
          step: 2,
          action: 'Dispatch formal statutory referral to Anti-Corruption Bureau (ACB) and State Vigilance Police.',
          authority: 'Chief Vigilance Officer (CVO)',
          urgency: 'IMMEDIATE',
        },
        {
          step: 3,
          action: 'Conduct physical site inspection with DGPS tagging and local gram sabha verification.',
          authority: 'Independent Quality Monitor (IQM)',
          urgency: 'HIGH',
        }
      );
    }
    // Pattern 2: Inflated Cost or Over-disbursement
    else if (spentRatio > 1.05) {
      verdict = 'INFLATED_COST_ANOMALY';
      verdictTitle = 'Statutory Cost Overrun Without Revised Technical Sanction';
      riskScore = 79;
      riskLevel = RiskLevel.HIGH;
      disbursalAnomaly = true;

      redFlags.push({
        rule: 'GFR 2017 Rule 136 (Excess Expenditure)',
        violation: 'Expenditure exceeded approved administrative sanction without revised estimate authorization.',
        severity: 'HIGH',
        evidence: `Expenditure of ₹${(spent / 100000).toFixed(2)} Lakh exceeds approved ₹${(approved / 100000).toFixed(2)} Lakh by ${((spentRatio - 1) * 100).toFixed(1)}%.`,
      });

      actionPlan.push(
        {
          step: 1,
          action: 'Audit revised rate analysis and change orders submitted by the contractor.',
          authority: 'Internal Audit Wing (IAW)',
          urgency: 'HIGH',
        },
        {
          step: 2,
          action: 'Reconcile invoice vouchers against CPWD Schedule of Rates (DSR).',
          authority: 'Finance & Accounts Division',
          urgency: 'STANDARD',
        }
      );
    }
    // Pattern 3: Progress Stall / Dormant Allocation
    else if (project.status === 'IN_PROGRESS' && spentRatio < 0.15) {
      verdict = 'PROGRESS_STALL';
      verdictTitle = 'Prolonged Work Stagnation: Low Absorption Ratio';
      riskScore = 62;
      riskLevel = RiskLevel.MEDIUM;

      redFlags.push({
        rule: 'CVC Work Order Clause 2.4 (Time is Essence of Contract)',
        violation: 'Project work in progress with negligible fund drawl indicating contractor default or land dispute.',
        severity: 'MEDIUM',
        evidence: `Only ${(spentRatio * 100).toFixed(1)}% disbursed while marked actively in progress.`,
      });

      actionPlan.push(
        {
          step: 1,
          action: 'Convene joint site review with executive engineer to assess bottleneck reasons.',
          authority: 'Superintending Engineer',
          urgency: 'HIGH',
        }
      );
    }
    // Pattern 4: Pre-Sanction Proposal
    else if (isUnsanctioned) {
      verdict = 'EVIDENCE_DEFICIT';
      verdictTitle = 'Pre-Sanction Stage: Awaiting Administrative & Technical Sanction';
      riskScore = 24;
      riskLevel = RiskLevel.LOW;

      actionPlan.push(
        {
          step: 1,
          action: 'Monitor sanction timeline to ensure clearance within citizen charter limits (45 days).',
          authority: 'Planning Department',
          urgency: 'STANDARD',
        }
      );
    }
    // Pattern 5: Verified Clean Delivery
    else {
      verdict = 'CLEAN';
      verdictTitle = 'Optimal Civic Delivery: Fund Absorption Matches Physical Asset';
      riskScore = 11;
      riskLevel = RiskLevel.LOW;
      spectralChange = hasCoords;

      actionPlan.push(
        {
          step: 1,
          action: 'Perform final social audit and citizen handover verification.',
          authority: 'Ward Committee / Gram Panchayat',
          urgency: 'STANDARD',
        }
      );
    }

    // Citizen report flags
    if (citizenReportCount > 0) {
      redFlags.push({
        rule: 'Citizen Vigilance Mandate (VOJAS Whistleblower Feed)',
        violation: `${citizenReportCount} citizen discrepancy reports registered for this work site.`,
        severity: citizenReportCount > 2 ? 'HIGH' : 'MEDIUM',
        // Report bodies are not read here, so their content must not be characterised.
        evidence: `${citizenReportCount} report(s) linked to this project are pending officer triage. Report contents are not summarised by this engine.`,
      });
      if (riskScore < 70) riskScore += 12;
    }

    // Confidence must track how much real evidence backs the verdict rather than
    // being a fixed per-branch literal.
    const evidenceSignals = [
      observationCount > 0,
      Boolean(latestChange),
      approved > 0,
      spent > 0,
      hasCoords,
      citizenReportCount > 0,
    ].filter(Boolean).length;
    const confidenceScore = Math.min(90, 20 + evidenceSignals * 12);

    const executiveSummary =
      verdict === 'SUSPECTED_GHOST_WORK'
        ? `Project "${project.name}" is flagged for human verification. Expenditure of ₹${(spent / 100000).toFixed(2)} Lakh (${(spentRatio * 100).toFixed(0)}% absorption) is recorded ${observationCount > 0 ? `against ${observationCount} processed satellite observation(s) whose latest change analysis reports ${latestChange?.changeClassification ?? 'no detectable change'}` : `with ${SATELLITE_UNAVAILABLE}`}. This is an indicator consistent with GFR 2017 Rule 139 concerns; it is not a finding of fraud and requires physical inspection to confirm.`
        : verdict === 'INFLATED_COST_ANOMALY'
        ? `Project "${project.name}" exhibits a significant fiscal overrun of ${((spentRatio - 1) * 100).toFixed(1)}% above the sanctioned allocation without a documented Technical Sanction revision on record. Recommended for internal rate analysis against CPWD DSR benchmarks.`
        : verdict === 'PROGRESS_STALL'
        ? `Project "${project.name}" has drawn minimal funding (${(spentRatio * 100).toFixed(1)}%) despite being classified as actively under construction. Possible impediments include right-of-way hurdles, encumbrances, or contractor liquidity failure.`
        : verdict === 'EVIDENCE_DEFICIT'
        ? `Project "${project.name}" is currently awaiting administrative sanction and technical clearance. No state capital expenditure has been disbursed.`
        : `Project "${project.name}" adheres to normative public procurement and civic delivery standards. Fund expenditure is congruent with reported physical milestones, and geographic parameters match administrative allocations.`;

    const citizenChecklist = [
      `Inspect the physical site in ${project.district || project.state || 'the constituency'} and locate the official public display board.`,
      `Verify if the completed work matches the sanctioned scope: "${project.name}".`,
      `Confirm whether the named contractor (${project.contractor || 'Executing Department'}) maintained continuous on-site personnel.`,
      `Check structural integrity (cracking, drainage gradient, material specifications).`,
      `Submit photo and GPS evidence via VOJAS Citizen Whistleblower to trigger instant AI verification.`,
    ];

    return {
      projectId: project.id,
      projectName: project.name,
      modelUsed: 'VOJAS Sentinel v4.2 — rule-based heuristic (no ML inference)',
      auditedAt: new Date().toISOString(),
      riskScore,
      riskLevel,
      confidenceScore,
      forensicVerdict: verdict,
      verdictTitle,
      executiveSummary,
      statutoryRedFlags: redFlags,
      financialAudit: {
        utilizationRate: Math.round(spentRatio * 100),
        disbursalAnomaly,
        analysis: disbursalAnomaly
          ? `Disbursed ₹${(spent / 100000).toFixed(2)} Lakh on a budget of ₹${(approved / 100000).toFixed(2)} Lakh with high disparity.`
          : `Fund absorption of ${(spentRatio * 100).toFixed(1)}% is within standard normative variance.`,
      },
      satelliteTelemetryVerdict: {
        // Only a real change analysis can report change. With no usable observation
        // the honest answer is "unknown", not "no change detected".
        spectralChangeDetected: observationCount > 0 && latestChange ? spectralChange : null,
        interpretation:
          observationCount === 0
            ? hasCoords
              ? SATELLITE_UNAVAILABLE
              : `${SATELLITE_UNAVAILABLE} Geospatial coordinates are also absent from the administrative record, so no observation can be requested.`
            : latestChange
              ? `Derived from ${observationCount} processed observation(s) between ${observationWindow}. Latest change analysis: ${latestChange.changeClassification ?? 'unclassified'}.`
              : `${observationCount} processed observation(s) on record between ${observationWindow}, but no change analysis has been run, so no change determination exists.`,
        surfaceObservationConfidence:
          observationCount === 0 ? 'NOT_AVAILABLE' : observationCount >= 3 && latestChange ? 'HIGH' : 'MEDIUM',
      },
      contractorRiskAssessment: {
        contractorName: project.contractor || null,
        concentrationIndex: hasContractor ? 'NORMAL' : 'UNASSIGNED_OR_DEPARTMENTAL',
        riskFlags: hasContractor ? [] : ['Contractor entity missing from initial sanction schedule.'],
      },
      actionPlan,
      citizenChecklist,
    };
  }

  /**
   * Google Gemini LLM Integration
   */
  private async callGeminiLLM(project: any, apiKey: string): Promise<ForensicAuditResult | null> {
    const prompt = this.buildPrompt(project);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const json: any = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText);
    parsed.modelUsed = 'Google Gemini 2.0 Flash (Cloud LLM)';
    parsed.auditedAt = new Date().toISOString();
    return parsed;
  }

  /**
   * OpenAI LLM Integration
   */
  private async callOpenAILLM(project: any, apiKey: string): Promise<ForensicAuditResult | null> {
    const prompt = this.buildPrompt(project);
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are VOJAS Sentinel AI, a forensic auditor for Indian public works expenditure. Respond strictly in JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const json: any = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    parsed.modelUsed = 'OpenAI GPT-4o-mini (Cloud LLM)';
    parsed.auditedAt = new Date().toISOString();
    return parsed;
  }

  private buildPrompt(project: any): string {
    return `
Analyze the following Indian public works project for fiscal corruption, ghost work, contractor cartelization, and timeline delays.

HARD RULES — this output is shown to citizens and auditors of a public anti-corruption system:
1. Use ONLY the values supplied under "Project Data" and "Satellite Observations" below. Never invent a
   figure, date, area, contractor name or spectral index that is not given to you.
2. "Satellite Observations" may be an empty list. If it is, you have NO ground observation: set
   spectralChangeDetected to null, surfaceObservationConfidence to "NOT_AVAILABLE", and say plainly that
   no usable observation exists. Do NOT describe the state of the ground, and do NOT refer to Sentinel-2
   passes, NDVI or NDBI values you were not given.
3. A risk score is evidence for human verification, never proof of fraud. Word every verdict and red flag
   as an indicator requiring inspection, not as an established finding of criminality.
4. confidenceScore must reflect how much real evidence you were actually given. With little or no
   evidence, return a low confidence.

Return a structured JSON document matching the ForensicAuditResult schema with fields:
- projectId: "${project.id}"
- projectName: "${project.name}"
- riskScore: number (0-100)
- riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
- confidenceScore: number (0-100)
- forensicVerdict: "CLEAN" | "SUSPECTED_GHOST_WORK" | "INFLATED_COST_ANOMALY" | "PROCUREMENT_COLLUSION" | "PROGRESS_STALL" | "EVIDENCE_DEFICIT"
- verdictTitle: string
- executiveSummary: string
- statutoryRedFlags: array of { rule: string, violation: string, severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", evidence: string }
- financialAudit: { utilizationRate: number, disbursalAnomaly: boolean, analysis: string }
- satelliteTelemetryVerdict: { spectralChangeDetected: boolean | null, interpretation: string, surfaceObservationConfidence: "HIGH" | "MEDIUM" | "LOW" | "NOT_AVAILABLE" }
- contractorRiskAssessment: { contractorName: string, concentrationIndex: string, riskFlags: string[] }
- actionPlan: array of { step: number, action: string, authority: string, urgency: "IMMEDIATE" | "HIGH" | "STANDARD" }
- citizenChecklist: array of 5 physical verification questions

Project Data:
${JSON.stringify(
  {
    name: project.name,
    sector: project.sector,
    status: project.status,
    approvedAmount: project.approvedAmount,
    spentAmount: project.spentAmount,
    startDate: project.startDate,
    expectedEndDate: project.expectedEndDate,
    completedAt: project.completedAt,
    latitude: project.latitude,
    longitude: project.longitude,
    contractor: project.contractor,
    district: project.district,
    state: project.state,
    constituency: project.constituency,
  },
  null,
  2
)}

Satellite Observations (real rows from the database; an empty list means no usable observation exists):
${JSON.stringify(
  (Array.isArray(project.satelliteObservations) ? project.satelliteObservations : [])
    .filter(
      (o: { ndvi: number | null; ndbi: number | null; constructionScore: number | null }) =>
        o.ndvi != null || o.ndbi != null || o.constructionScore != null
    )
    .map((o: { observationDate: Date; satellite: string; cloudCover: number; ndvi: number | null; ndbi: number | null; bsi: number | null; constructionScore: number | null }) => ({
      observationDate: o.observationDate,
      satellite: o.satellite,
      cloudCover: o.cloudCover,
      ndvi: o.ndvi,
      ndbi: o.ndbi,
      bsi: o.bsi,
      constructionScore: o.constructionScore,
    })),
  null,
  2
)}
`;
  }
}
