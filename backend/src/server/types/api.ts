import { z } from 'zod';

export const uploadSchema = z.object({
  moduleId: z.string().uuid().optional(),
  title: z.string().max(140).optional(),
  uploadedBy: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const statsResponseSchema = z.object({
  pending: z.number(),
  scannedToday: z.number(),
  accuracy: z.number(),
  syncedToHis: z.boolean(),
});

export const moduleResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    status: z.enum(['healthy', 'degraded', 'offline']),
    lastRunAt: z.string().nullable(),
    metrics: z.object({ processed: z.number(), errors: z.number() }),
  })
);

export const logsResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    timestamp: z.string(),
    filename: z.string(),
    moduleName: z.string(),
    status: z.enum(['SUCCESS', 'FAILED']),
    elapsedMs: z.number(),
  })
);

export type UploadPayload = z.infer<typeof uploadSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;
export type ModuleResponse = z.infer<typeof moduleResponseSchema>;
export type LogsResponse = z.infer<typeof logsResponseSchema>;
