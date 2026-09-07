import { z } from 'zod';
import { ProjectStatus, ProjectSector } from '@vojas/shared';
import { coordinateSchema } from './common.js';

export const createProjectSchema = z
  .object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).default(ProjectStatus.PROPOSED),
    sector: z.nativeEnum(ProjectSector),
    district: z.string().min(1, 'District is required'),
    state: z.string().min(1, 'State is required'),
    constituency: z.string().optional(),
    approvedAmount: z.number().positive('Approved amount must be positive'),
    spentAmount: z.number().min(0).default(0),
    contractor: z.string().optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
    expectedEndDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    source: z.string().min(1).default('MANUAL'),
    sourceWorkId: z.string().optional(),
  })
  .strict();
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().omit({ source: true }).strict();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectFiltersSchema = z.object({
  state: z.string().optional(),
  district: z.string().optional(),
  constituency: z.string().optional(),
  sector: z.nativeEnum(ProjectSector).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  hasAnomalies: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['name', 'approvedAmount', 'spentAmount', 'createdAt', 'status'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

export const addLocationSchema = z
  .object({
    projectId: z.string().uuid(),
    locationType: z.enum(['SITE', 'OFFICE', 'STORAGE', 'OTHER']).default('SITE'),
    label: z.string().optional(),
    address: z.string().optional(),
    ...coordinateSchema.shape,
    locationSource: z.enum(['MANUAL', 'GEOCODED', 'OFFICIAL_RECORD']).default('MANUAL'),
    isPrimary: z.boolean().default(false),
  })
  .strict();
export type AddLocationInput = z.infer<typeof addLocationSchema>;

export { coordinateSchema };
