import { z } from 'zod';

const REQUIRED_KEYS = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'DOC_AI_PROJECT_ID',
  'DOC_AI_LOCATION',
  'DOC_AI_PROCESSOR_ID',
  'DOC_AI_GCS_BUCKET',
  'DATABASE_URL',
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

const envSchema = z
  .object({
    GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
    DOC_AI_PROJECT_ID: z.string().min(1).optional(),
    DOC_AI_LOCATION: z.string().min(1).optional(),
    DOC_AI_PROCESSOR_ID: z.string().min(1).optional(),
    DOC_AI_GCS_BUCKET: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql')).optional(),
  })
  .partial();

const parsed = envSchema.safeParse(process.env);

const missingKeys = REQUIRED_KEYS.filter((key) => !process.env[key]);
const demoMode = missingKeys.length > 0;

if (!parsed.success) {
  console.warn('⚠️ Environment variable validation failed; running in demo mode.', parsed.error.flatten().fieldErrors);
}

if (demoMode) {
  console.warn('⚠️ Missing environment variables detected, enabling demo mode:', missingKeys);
}

export type EnvConfig = z.infer<typeof envSchema> & { DEMO_MODE: boolean; missingKeys: RequiredKey[] };

export const env: EnvConfig = {
  ...(parsed.success ? parsed.data : {}),
  DEMO_MODE: demoMode,
  missingKeys,
};
