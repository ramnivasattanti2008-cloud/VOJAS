/**
 * VOJAS Intelligent Accountability Agent Service
 * ===============================================
 * Role-aware, evidence-grounded AI copilot for citizens, officers, MPs, and contractors.
 *
 * Adheres strictly to the VOJAS Master AI Agent Instruction:
 * 1. Role-aware (CITIZEN, MP, GOVERNMENT_OFFICER, CONTRACTOR, ADMIN).
 * 2. Controlled tool layer (no direct DB access).
 * 3. Never fabricates civic data, rupee amounts, dates, or satellite observations.
 * 4. Grounded in accessible application data and statutory rules (GFR 2017, CVC, CPWD).
 * 5. Structured output format (answer, facts, analysis, missingData, sources, recommendedActions).
 * 6. Dual-engine: Gemini 2.0 Flash / OpenAI with deterministic in-process fallback. Never crashes.
 */

import type { PrismaClient } from '@vojas/db';
import type { UserContext } from '@vojas/shared';
import { UserRole } from '@vojas/shared';
import { AIToolRegistry } from './aiTools.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIAgentRequest {
  message: string;
  history?: ChatMessage[];
  contextProjectId?: string;
  explicitGeminiKey?: string;
  explicitOpenAiKey?: string;
  language?: string;
}

export interface AIAgentResponse {
  answer: string;
  facts: string[];
  analysis: string[];
  missingData: string[];
  sources: string[];
  recommendedActions: string[];
  toolCallsExecuted: string[];
  modelUsed: string;
  roleContext: UserRole;
}

export class AIAgentService {
  private toolRegistry: AIToolRegistry;

  constructor(private prisma: PrismaClient) {
    this.toolRegistry = new AIToolRegistry(prisma);
  }

  /**
   * Main entry point for conversational AI inquiries
   */
  async processQuery(
    request: AIAgentRequest,
    userContext: UserContext
  ): Promise<AIAgentResponse> {
    const { message, history = [], contextProjectId, explicitGeminiKey, explicitOpenAiKey, language = 'en' } = request;
    const executedTools: string[] = [];
    const toolResults: Record<string, unknown> = {};

    // ── 1. Determine Relevant Tools Based on Query & Context ─────────────────────
    const lower = message.toLowerCase();

    // Contextual project inspection
    if (contextProjectId) {
      const projRes = await this.toolRegistry.executeTool('getProject', { projectId: contextProjectId }, userContext);
      if (projRes.success) {
        toolResults.project = projRes.data;
        executedTools.push('getProject');
      }

      if (lower.includes('money') || lower.includes('fund') || lower.includes('spent') || lower.includes('sanction') || lower.includes('financial') || lower.includes('budget')) {
        const finRes = await this.toolRegistry.executeTool('getProjectFinancials', { projectId: contextProjectId }, userContext);
        if (finRes.success) {
          toolResults.financials = finRes.data;
          executedTools.push('getProjectFinancials');
        }
      }

      if (lower.includes('satellite') || lower.includes('space') || lower.includes('sentinel') || lower.includes('ndvi') || lower.includes('earth') || lower.includes('change')) {
        const satRes = await this.toolRegistry.executeTool('getProjectSatellite', { projectId: contextProjectId }, userContext);
        if (satRes.success) {
          toolResults.satellite = satRes.data;
          executedTools.push('getProjectSatellite');
        }
      }

      if (lower.includes('risk') || lower.includes('flag') || lower.includes('delay') || lower.includes('ghost') || lower.includes('anomaly')) {
        const riskRes = await this.toolRegistry.executeTool('getProjectRisk', { projectId: contextProjectId }, userContext);
        if (riskRes.success) {
          toolResults.risk = riskRes.data;
          executedTools.push('getProjectRisk');
        }
      }

      if (lower.includes('timeline') || lower.includes('event') || lower.includes('history') || lower.includes('date')) {
        const timeRes = await this.toolRegistry.executeTool('getProjectTimeline', { projectId: contextProjectId }, userContext);
        if (timeRes.success) {
          toolResults.timeline = timeRes.data;
          executedTools.push('getProjectTimeline');
        }
      }

      if (lower.includes('report') || lower.includes('complaint') || lower.includes('evidence') || lower.includes('inspection')) {
        const evRes = await this.toolRegistry.executeTool('getProjectEvidence', { projectId: contextProjectId }, userContext);
        if (evRes.success) {
          toolResults.evidence = evRes.data;
          executedTools.push('getProjectEvidence');
        }
      }
    } else {
      // General / search query
      if (userContext.role === UserRole.OFFICER && (lower.includes('queue') || lower.includes('today') || lower.includes('verify') || lower.includes('inspection'))) {
        const qRes = await this.toolRegistry.executeTool('getOfficerQueue', {}, userContext);
        if (qRes.success) {
          toolResults.officerQueue = qRes.data;
          executedTools.push('getOfficerQueue');
        }
      } else if (userContext.role === UserRole.CONTRACTOR && (lower.includes('my contract') || lower.includes('milestone') || lower.includes('project'))) {
        const cRes = await this.toolRegistry.executeTool('getContractorProjects', {}, userContext);
        if (cRes.success) {
          toolResults.contractorProjects = cRes.data;
          executedTools.push('getContractorProjects');
        }
      } else if (lower.includes('constituency') || (userContext.role === UserRole.MP && userContext.constituency)) {
        const targetConstituency = userContext.constituency || 'Kalahandi';
        const mpRes = await this.toolRegistry.executeTool('getConstituencyProjects', { constituency: targetConstituency }, userContext);
        if (mpRes.success) {
          toolResults.constituency = mpRes.data;
          executedTools.push('getConstituencyProjects');
        }
      } else {
        // Broad project search
        const sRes = await this.toolRegistry.executeTool('searchProjects', { query: message, limit: 5 }, userContext);
        if (sRes.success) {
          toolResults.search = sRes.data;
          executedTools.push('searchProjects');
        }
      }
    }

    // ── 2. Cloud LLM or In-Process Fallback Dispatch ─────────────────────────────
    const geminiKey = explicitGeminiKey?.trim() || process.env.GEMINI_API_KEY;
    const openaiKey = explicitOpenAiKey?.trim() || process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        const cloudResp = await this.callGeminiAgent(message, history, toolResults, userContext, language, geminiKey);
        if (cloudResp) {
          cloudResp.toolCallsExecuted = executedTools;
          return cloudResp;
        }
      } catch (err) {
        console.warn('AIAgentService: Gemini API failed, falling back to deterministic synthesis:', err);
      }
    } else if (openaiKey) {
      try {
        const cloudResp = await this.callOpenAIAgent(message, history, toolResults, userContext, language, openaiKey);
        if (cloudResp) {
          cloudResp.toolCallsExecuted = executedTools;
          return cloudResp;
        }
      } catch (err) {
        console.warn('AIAgentService: OpenAI API failed, falling back to deterministic synthesis:', err);
      }
    }

    // In-Process Deterministic Fallback Engine (Zero hallucinations)
    return this.synthesizeDeterministicResponse(message, toolResults, userContext, executedTools);
  }

  // ── Layered System Prompt Construction ───────────────────────────────────────
  private buildSystemPrompt(user: UserContext, language: string): string {
    const rolePrompt = this.getRolePrompt(user.role);

    return `You are the VOJAS Civic Accountability Copilot — an institutional intelligence assistant for Indian public works (MPLADS / state infrastructure).

CORE DIRECTIVES:
1. FACTUAL GROUNDING: Rely strictly on the supplied Tool Results. NEVER invent numbers, dates, contractors, or satellite observations.
2. ABSENT DATA HONESTY: If a field or satellite image is missing, explicitly state that it is NOT_AVAILABLE or NO_USABLE_OBSERVATION. Do NOT extrapolate or guess.
3. REPUTATIONAL CAUTION: You are an accountability assistant, NOT a legal court. Never use words like "fraud", "corruption confirmed", "criminal", or "guilty". Use cautious institutional terminology: "potential anomaly requiring verification", "discrepancy between records", "further physical inspection recommended".
4. ROLE AWARENESS: ${rolePrompt}
5. MULTILINGUAL: Respond in ${language}. Never translate technical IDs, project cuid strings, or Indian Rupee symbols (₹).
6. OUTPUT FORMAT: Respond strictly in valid JSON matching this schema:
{
  "answer": "Clear, comprehensive prose explaining the situation",
  "facts": ["Fact 1 grounded directly in data", "Fact 2 grounded in data"],
  "analysis": ["Analytical insight or risk correlation"],
  "missingData": ["Any information needed that was not in the records"],
  "sources": ["Official MoSPI Registry", "CDSE Sentinel-2 STAC", "GFR 2017 Rules"],
  "recommendedActions": ["Concrete next step for the user"]
}`;
  }

  private getRolePrompt(role: UserRole): string {
    switch (role) {
      case UserRole.CITIZEN:
      case UserRole.VIEWER:
        return 'The user is a CITIZEN. Explain project details simply, clearly, and empoweringly. Guide them on how to inspect local public works, verify physical assets, and file citizen grievances if irregularities are seen.';
      case UserRole.MP:
        return 'The user is a MEMBER OF PARLIAMENT (MP). Provide high-level portfolio overviews, fund absorption velocity, constituency project distribution, and citizen grievance trends.';
      case UserRole.OFFICER:
      case UserRole.FIELD_OFFICER:
        return 'The user is a GOVERNMENT OFFICER / CVO. Provide rigorous statutory audit framing (GFR 2017 Rule 139, CPWD Section 10, CVC circulars). Suggest concrete field verification and treasury reconciliation actions without prejudging culpability.';
      case UserRole.CONTRACTOR:
        return 'The user is a CONTRACTOR. Focus on assigned milestones, pending progress documentation, tender specifications, and inspection follow-ups.';
      case UserRole.ADMIN:
      default:
        return 'The user is an ADMINISTRATOR. Provide full diagnostic transparency, data quality status, and audit trail reconciliation.';
    }
  }

  // ── Gemini 2.0 Flash Execution ───────────────────────────────────────────────
  private async callGeminiAgent(
    message: string,
    history: ChatMessage[],
    toolResults: Record<string, unknown>,
    user: UserContext,
    language: string,
    apiKey: string
  ): Promise<AIAgentResponse | null> {
    const systemPrompt = this.buildSystemPrompt(user, language);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const contextPayload = {
      userRole: user.role,
      userQuery: message,
      toolResults,
      conversationHistory: history.slice(-4),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(contextPayload) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      answer: parsed.answer || 'Analysis complete.',
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      analysis: Array.isArray(parsed.analysis) ? parsed.analysis : [],
      missingData: Array.isArray(parsed.missingData) ? parsed.missingData : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : ['VOJAS Central Database'],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      toolCallsExecuted: [],
      modelUsed: 'Google Gemini 2.0 Flash',
      roleContext: user.role,
    };
  }

  // ── OpenAI GPT-4o-mini Execution ─────────────────────────────────────────────
  private async callOpenAIAgent(
    message: string,
    history: ChatMessage[],
    toolResults: Record<string, unknown>,
    user: UserContext,
    language: string,
    apiKey: string
  ): Promise<AIAgentResponse | null> {
    const systemPrompt = this.buildSystemPrompt(user, language);
    const url = 'https://api.openai.com/v1/chat/completions';

    const contextPayload = {
      userRole: user.role,
      userQuery: message,
      toolResults,
      conversationHistory: history.slice(-4),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(contextPayload) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      answer: parsed.answer || 'Analysis complete.',
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      analysis: Array.isArray(parsed.analysis) ? parsed.analysis : [],
      missingData: Array.isArray(parsed.missingData) ? parsed.missingData : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : ['VOJAS Central Database'],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      toolCallsExecuted: [],
      modelUsed: 'OpenAI GPT-4o-mini',
      roleContext: user.role,
    };
  }

  // ── Deterministic In-Process Fallback Engine ─────────────────────────────────
  private synthesizeDeterministicResponse(
    query: string,
    toolResults: Record<string, unknown>,
    user: UserContext,
    executedTools: string[]
  ): AIAgentResponse {
    const facts: string[] = [];
    const analysis: string[] = [];
    const missingData: string[] = [];
    const sources: string[] = ['VOJAS Official Database'];
    const actions: string[] = [];
    let answer = '';

    const proj: any = toolResults.project;
    const fin: any = toolResults.financials;
    const sat: any = toolResults.satellite;
    const risk: any = toolResults.risk;
    const search: any = toolResults.search;

    if (proj) {
      facts.push(`Project Name: "${proj.name}" (Sector: ${proj.sector}, Status: ${proj.status})`);
      facts.push(`Location: ${proj.location?.district}, ${proj.location?.state}`);
      facts.push(`Sanctioned Amount: ₹${proj.financials?.approvedAmountINR?.toLocaleString('en-IN')}`);
      facts.push(`Recorded Expenditure: ₹${proj.financials?.spentAmountINR?.toLocaleString('en-IN')} (${proj.financials?.utilizationRate})`);

      if (proj.governance?.contractor) {
        facts.push(`Assigned Contractor: ${proj.governance.contractor}`);
      }

      if (fin) {
        if (fin.isOverSpent) {
          analysis.push('Recorded expenditure exceeds sanctioned ceiling. Formal financial audit reconciliation required under GFR 2017.');
          actions.push('Freeze additional voucher releases until revised administrative approval is verified.');
        } else {
          analysis.push(`Fund absorption is currently at ${fin.utilizationPercentage}% of the approved sanction.`);
        }
      }

      if (sat) {
        sources.push('Copernicus Data Space Ecosystem (Sentinel-2)');
        if (sat.status === 'NO_GEOSPATIAL_COORDINATES') {
          missingData.push('Geospatial latitude/longitude coordinates are absent from this project record.');
          analysis.push('Surface verification via Sentinel-2 multi-spectral telemetry could not be performed due to missing coordinates.');
          actions.push('Submit field coordinates via mobile geotagging or citizen inspection.');
        } else if (sat.status === 'NO_USABLE_OBSERVATION') {
          missingData.push('No processed Sentinel-2 cloud-free passes on record for these coordinates.');
          analysis.push('Spectral vegetation and surface texture metrics are not currently available.');
        } else if (sat.latestChangeAnalysis && typeof sat.latestChangeAnalysis === 'object') {
          facts.push(`Satellite Telemetry: ${sat.latestChangeAnalysis.changeClassification} (Confidence: ${sat.latestChangeAnalysis.confidence})`);
          analysis.push(`Satellite observations: ${sat.latestChangeAnalysis.interpretation}`);
        }
      }

      if (risk) {
        facts.push(`Forensic Risk Score: ${risk.riskScore}/100 (Level: ${risk.riskLevel})`);
        if (risk.findings?.length > 0) {
          risk.findings.forEach((f: any) => {
            analysis.push(`Statutory Indicator: [${f.severity}] ${f.title} (${f.ruleCode})`);
          });
        }
      }

      answer = `Project "${proj.name}" located in ${proj.location?.district}, ${proj.location?.state} is currently marked ${proj.status}. Of the ₹${proj.financials?.approvedAmountINR?.toLocaleString('en-IN')} sanctioned, ₹${proj.financials?.spentAmountINR?.toLocaleString('en-IN')} has been disbursed (${proj.financials?.utilizationRate}). ${
        fin?.isOverSpent ? 'An expenditure disparity has been recorded requiring verification. ' : ''
      }${sat?.latestChangeAnalysis?.interpretation ? `Satellite analysis notes: ${sat.latestChangeAnalysis.interpretation}. ` : ''}All reported figures reflect official database records.`;

      if (actions.length === 0) {
        actions.push(user.role === UserRole.CITIZEN ? 'Verify physical project site in person or review community reports.' : 'Review latest contractor milestone and scheduled field inspections.');
      }
    } else if (search && search.projects?.length > 0) {
      facts.push(`Identified ${search.projects.length} matching works in the national database.`);
      search.projects.forEach((p: any) => {
        facts.push(`• [${p.status}] ${p.name} — ₹${p.approvedAmountINR?.toLocaleString('en-IN')} (${p.location})`);
      });
      answer = `Found ${search.projects.length} relevant project records matching your inquiry in the VOJAS registry. You can inspect individual project dossiers for full financial lifecycle, satellite telemetry, and statutory audits.`;
      actions.push('Select a specific project ID to analyze in-depth.');
    } else {
      answer = `VOJAS intelligent accountability assistant is ready to help you inspect public projects, verify expenditures, analyze Sentinel-2 satellite imagery, and track citizen reports across all 16 MPLADS sectors.`;
      actions.push('Search for a project by name, district, or sector to begin.');
    }

    return {
      answer,
      facts,
      analysis,
      missingData,
      sources,
      recommendedActions: actions,
      toolCallsExecuted: executedTools,
      modelUsed: 'VOJAS Sentinel Deterministic Engine v4.2',
      roleContext: user.role,
    };
  }
}

