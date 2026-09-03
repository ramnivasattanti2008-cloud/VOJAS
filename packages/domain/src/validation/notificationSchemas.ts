import { z } from 'zod';

export const notificationListSchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z
    .enum([
      'ANOMALY_DETECTED',
      'ANOMALY_ACKNOWLEDGED',
      'ANOMALY_RESOLVED',
      'ANOMALY_ESCALATED',
      'ANOMALY_ESCALATED_TO_LAW',
      'REPORT_SUBMITTED',
      'REPORT_ASSIGNED',
      'RISK_THRESHOLD',
      'PROJECT_COMPLETED',
      'SYSTEM_ALERT',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(50),
});
