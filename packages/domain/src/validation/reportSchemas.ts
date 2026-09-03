import { z } from 'zod';

export const reportListSchema = z.object({
  status: z
    .enum(['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'])
    .optional(),
  category: z
    .enum([
      'CONSTRUCTION_QUALITY',
      'FINANCIAL_IRREGULARITY',
      'DELAYED_WORK',
      'ABANDONED_WORK',
      'FAKE_DOCUMENTS',
      'VENDOR_MISCONDUCT',
      'LOCATION_MISMATCH',
      'PROGRESS_MISMATCH',
      'ENVIRONMENTAL_VIOLATION',
      'SAFETY_HAZARD',
      'OTHER',
    ])
    .optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const reportSubmitSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  category: z.enum([
    'CONSTRUCTION_QUALITY',
    'FINANCIAL_IRREGULARITY',
    'DELAYED_WORK',
    'ABANDONED_WORK',
    'FAKE_DOCUMENTS',
    'VENDOR_MISCONDUCT',
    'LOCATION_MISMATCH',
    'PROGRESS_MISMATCH',
    'ENVIRONMENTAL_VIOLATION',
    'SAFETY_HAZARD',
    'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  locationDesc: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  projectId: z.string().uuid().optional(),
  reporterName: z.string().max(200).optional(),
  reporterEmail: z.string().email().max(200).optional().or(z.literal('')),
  reporterPhone: z.string().max(20).optional(),
  isAnonymous: z.boolean().default(false),
});

export const reportAssignSchema = z.object({
  assignedToId: z.string().uuid(),
});

export const reportResolveSchema = z.object({
  resolution: z.string().min(1).max(5000),
});
