import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1),
  DOC_AI_PROJECT_ID: z.string().min(1),
  DOC_AI_LOCATION: z.string().min(1),
  DOC_AI_PROCESSOR_ID: z.string().min(1),
  DOC_AI_GCS_BUCKET: z.string().min(1),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
