import { UserRole, buildUserContext } from '@vojas/shared';
import { describe, expect, it, vi } from 'vitest';
import { AIAgentService } from '../../src/services/aiAgent/aiAgentService.js';
import { AIToolRegistry } from '../../src/services/aiAgent/aiTools.js';

describe('AIToolRegistry — RBAC and Deterministic Calculation Gates', () => {
  it('enforces RBAC: denies getOfficerQueue to Citizen role', async () => {
    const mockPrisma: any = {};
    const registry = new AIToolRegistry(mockPrisma);
    const citizenContext = buildUserContext(UserRole.CITIZEN, 'citizen-1');

    const result = await registry.executeTool('getOfficerQueue', {}, citizenContext);

    expect(result.success).toBe(false);
    expect(result.isRestricted).toBe(true);
    expect(result.error).toContain('Permission Denied');
  });

  it('enforces RBAC: denies getContractorProjects to Citizen role', async () => {
    const mockPrisma: any = {};
    const registry = new AIToolRegistry(mockPrisma);
    const citizenContext = buildUserContext(UserRole.CITIZEN, 'citizen-1');

    const result = await registry.executeTool('getContractorProjects', {}, citizenContext);

    expect(result.success).toBe(false);
    expect(result.isRestricted).toBe(true);
    expect(result.error).toContain('Permission Denied');
  });

  it('computes deterministic financial balance without LLM fabrication', async () => {
    const mockPrisma: any = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'proj-123',
          name: 'Anganwadi Center Construction',
          approvedAmount: 1000000,
          spentAmount: 650000,
          status: 'IN_PROGRESS',
          financialObservations: [
            {
              date: new Date('2026-01-15'),
              amount: 650000,
              type: 'EXPENDITURE',
              description: 'First milestone civil work release',
              vendor: 'Shree Infrastructure',
            },
          ],
        }),
      },
    };

    const registry = new AIToolRegistry(mockPrisma);
    const citizenContext = buildUserContext(UserRole.CITIZEN, 'citizen-1');

    const result = await registry.executeTool('getProjectFinancials', { projectId: 'proj-123' }, citizenContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const fin: any = result.data;
    expect(fin.approvedAmountINR).toBe(1000000);
    expect(fin.spentAmountINR).toBe(650000);
    expect(fin.unutilizedBalanceINR).toBe(350000); // 1000000 - 650000
    expect(fin.utilizationPercentage).toBe(65.0);
    expect(fin.isOverSpent).toBe(false);
    expect(fin.disbursalStatus).toBe('PARTIALLY_DISBURSED');
  });

  it('returns NO_GEOSPATIAL_COORDINATES when project has null latitude/longitude', async () => {
    const mockPrisma: any = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'proj-no-coords',
          latitude: null,
          longitude: null,
          satelliteObservations: [],
          changeAnalyses: [],
        }),
      },
    };

    const registry = new AIToolRegistry(mockPrisma);
    const citizenContext = buildUserContext(UserRole.CITIZEN, 'citizen-1');

    const result = await registry.executeTool('getProjectSatellite', { projectId: 'proj-no-coords' }, citizenContext);

    expect(result.success).toBe(true);
    const sat: any = result.data;
    expect(sat.status).toBe('NO_GEOSPATIAL_COORDINATES');
    expect(sat.usableObservationsCount).toBe(0);
  });
});

describe('AIAgentService — In-Process Deterministic Fallback & Structured Schema', () => {
  it('synthesizes structured response without external LLM when API keys are absent', async () => {
    const mockPrisma: any = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'proj-456',
          name: 'Primary School Building',
          sector: 'EDUCATION',
          status: 'IN_PROGRESS',
          approvedAmount: 2000000,
          spentAmount: 800000,
          district: 'Kalahandi',
          state: 'Odisha',
          constituency: 'Kalahandi',
          latitude: null,
          longitude: null,
          financialObservations: [],
          satelliteObservations: [],
          changeAnalyses: [],
          districtRecord: { name: 'Kalahandi', lgdCode: '350' },
          stateRecord: { name: 'Odisha', code: 'OD' },
          mp: { name: 'Sujata Singh', constituency: 'Kalahandi', house: 'LOK_SABHA', party: 'BJP' },
          vendor: { name: 'Odisha Builders', status: 'ACTIVE' },
        }),
      },
      projectRisk: {
        findUnique: vi.fn().mockResolvedValue({
          projectId: 'proj-456',
          riskScore: 28,
          riskLevel: 'LOW',
        }),
      },
      riskFinding: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      riskSignal: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const agent = new AIAgentService(mockPrisma);
    const citizenContext = buildUserContext(UserRole.CITIZEN, 'citizen-1');

    const response = await agent.processQuery(
      {
        message: 'What is the status and spending on this project?',
        contextProjectId: 'proj-456',
      },
      citizenContext
    );

    expect(response).toBeDefined();
    expect(response.answer).toContain('Primary School Building');
    expect(response.answer).toContain('₹20,00,000');
    expect(response.facts.length).toBeGreaterThan(0);
    expect(response.sources).toContain('VOJAS Official Database');
    expect(response.recommendedActions.length).toBeGreaterThan(0);
    expect(response.modelUsed).toContain('VOJAS Sentinel Deterministic Engine');
    expect(response.roleContext).toBe(UserRole.CITIZEN);
  });
});

