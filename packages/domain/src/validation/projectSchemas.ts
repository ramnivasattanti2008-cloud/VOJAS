import { ProjectSector, ProjectStatus } from '@vojas/shared';
import { z } from 'zod';
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

const stringFilter = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' || trimmed.toUpperCase() === 'ALL' ? undefined : trimmed;
  }
  return val === null ? undefined : val;
}, z.string().optional());

const sectorFilter = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (trimmed === '' || trimmed === 'ALL' || trimmed === 'UNDEFINED' || trimmed === 'NULL') {
      return undefined;
    }
    return trimmed;
  }
  return val === null ? undefined : val;
}, z.nativeEnum(ProjectSector).optional());

const statusFilter = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (trimmed === '' || trimmed === 'ALL' || trimmed === 'UNDEFINED' || trimmed === 'NULL') {
      return undefined;
    }
    return trimmed;
  }
  return val === null ? undefined : val;
}, z.nativeEnum(ProjectStatus).optional());

const completionFilter = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (trimmed === '' || trimmed === 'ALL' || trimmed === 'UNDEFINED' || trimmed === 'NULL') {
      return undefined;
    }
    return trimmed;
  }
  return val === null ? undefined : val;
}, z.enum(['DONE', 'NOT_DONE']).optional());

const numberFilter = z.preprocess((val) => {
  if (val === '' || val === undefined || val === null) return undefined;
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
}, z.number().nonnegative().optional());

const sortByFilter = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (['name', 'approvedAmount', 'spentAmount', 'createdAt', 'status', 'riskScore'].includes(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}, z.enum(['name', 'approvedAmount', 'spentAmount', 'createdAt', 'status', 'riskScore']).optional());

const sortOrderFilter = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === 'asc' || trimmed === 'desc') return trimmed;
  }
  return 'desc';
}, z.enum(['asc', 'desc']).default('desc'));

const intFilter = (defaultVal: number, minVal: number, maxVal: number) =>
  z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return defaultVal;
    const num = Number(val);
    if (!Number.isFinite(num)) return defaultVal;
    return Math.min(Math.max(Math.floor(num), minVal), maxVal);
  }, z.number().int().min(minVal).max(maxVal).default(defaultVal));

export const projectFiltersSchema = z.object({
  state: stringFilter,
  district: stringFilter,
  constituency: stringFilter,
  sector: sectorFilter,
  status: statusFilter,
  completion: completionFilter,
  showcase: z
    .boolean()
    .or(z.enum(['true', 'false']).transform((v) => v === 'true'))
    .optional(),
  minAmount: numberFilter,
  maxAmount: numberFilter,
  hasAnomalies: z.boolean().optional(),
  hasCoordinates: z
    .boolean()
    .or(z.enum(['true', 'false']).transform((v) => v === 'true'))
    .optional(),
  search: stringFilter,
  page: intFilter(1, 1, 1000000),
  limit: intFilter(20, 1, 100),
  sortBy: sortByFilter,
  sortOrder: sortOrderFilter,
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
