import { z } from 'zod';

export const recordExpenditureSchema = z
  .object({
    projectId: z.string().uuid({ message: 'Valid projectId is required' }),
    date: z.string().datetime({ offset: true }).or(z.string()),
    type: z.string().min(1).default('EXPENDITURE'),
    amount: z.number().positive('Amount must be positive'),
    category: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    vendor: z.string().optional(),
    invoiceNo: z.string().optional(),
    paidOn: z.string().datetime({ offset: true }).or(z.string()).optional(),
    notes: z.string().optional(),
    source: z.string().min(1).default('MANUAL'),
    sourceTxnId: z.string().optional(),
  })
  .strict();
export type RecordExpenditureInput = z.infer<typeof recordExpenditureSchema>;
