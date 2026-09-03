import { z } from 'zod';

export const vendorListSchema = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLACKLISTED', 'PENDING_VERIFICATION']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const vendorCreateSchema = z.object({
  name: z.string().min(1).max(300),
  udyamRegNo: z.string().max(20).optional(),
  pan: z.string().max(10).optional(),
  gstin: z.string().max(15).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(20).optional(),
});
