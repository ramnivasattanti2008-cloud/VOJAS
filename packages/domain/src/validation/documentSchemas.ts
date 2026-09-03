import { z } from 'zod';

export const documentMetadataSchema = z
  .object({
    projectId: z.string().uuid({ message: 'Valid projectId is required' }),
    type: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    filename: z.string().min(1),
    originalName: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().positive('File size must be positive'),
    url: z.string().url(),
  })
  .strict();
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;
