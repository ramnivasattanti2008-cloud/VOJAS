import { z } from 'zod';

export const anomalyListSchema = z.object({
  status: z
    .enum(['OPEN', 'ACKNOWLEDGED', 'UNDER_INVESTIGATION', 'RESOLVED', 'ESCALATED', 'DISMISSED'])
    .optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z
    .enum([
      'DUPLICATE',
      'COST_OUTLIER',
      'TIMELINE',
      'BUDGET_OVERRUN',
      'STALLED',
      'GEOGRAPHIC',
      'COMPLIANCE',
      'FINANCIAL',
      'PROGRESS_DISCREPANCY',
    ])
    .optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const anomalyAcknowledgeSchema = z.object({});
export const anomalyResolveSchema = z.object({
  resolution: z.string().min(1).max(5000),
});
export const anomalyEscalateSchema = z.object({
  authority: z.enum(['ACB_OFFICE', 'POLICE_OFFICE', 'CVC', 'LOKAYUKTA', 'VIGILANCE']).optional(),
  notes: z.string().max(2000).optional(),
});
export const anomalyCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  category: z.enum([
    'DUPLICATE',
    'COST_OUTLIER',
    'TIMELINE',
    'BUDGET_OVERRUN',
    'STALLED',
    'GEOGRAPHIC',
    'COMPLIANCE',
    'FINANCIAL',
    'PROGRESS_DISCREPANCY',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  projectId: z.string().optional(),
  ruleCode: z.string().optional(),
  evidence: z.record(z.unknown()).optional(),
});
