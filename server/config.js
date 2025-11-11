import dotenv from 'dotenv';

dotenv.config();

const SYNC_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB, Document AI sync limit

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
};

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: Number.parseInt(process.env.PORT, 10) || 4000,
  },
  database: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: parseBoolean(process.env.DB_SSL || process.env.DATABASE_SSL, false),
  },
  docAi: {
    projectId: process.env.DOC_AI_PROJECT_ID,
    location: process.env.DOC_AI_LOCATION,
    processorId: process.env.DOC_AI_PROCESSOR_ID,
    gcsBucket: process.env.DOC_AI_GCS_BUCKET,
    outputPrefix: process.env.DOC_AI_GCS_OUTPUT_PREFIX || 'document-ai-output',
    uploadPrefix: process.env.DOC_AI_GCS_UPLOAD_PREFIX || 'document-ai-uploads',
    syncUploadLimitBytes: Number.parseInt(
      process.env.DOC_AI_SYNC_UPLOAD_LIMIT_BYTES || SYNC_UPLOAD_LIMIT_BYTES,
      10,
    ),
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
};

config.docAi.enabled =
  Boolean(config.docAi.projectId) &&
  Boolean(config.docAi.location) &&
  Boolean(config.docAi.processorId);

export const validateConfig = () => {
  if (!config.database.connectionString) {
    const missingDbFields = [];
    if (!config.database.host) missingDbFields.push('DB_HOST');
    if (!config.database.user) missingDbFields.push('DB_USER');
    if (!config.database.password) missingDbFields.push('DB_PASSWORD');
    if (!config.database.name) missingDbFields.push('DB_NAME');

    if (missingDbFields.length) {
      throw new Error(
        `Database configuration is incomplete. Provide DATABASE_URL or set ${missingDbFields.join(', ')}.`,
      );
    }
  }

  if (!config.docAi.enabled) {
    console.warn(
      'Warning: Document AI is not fully configured. Set DOC_AI_PROJECT_ID, DOC_AI_LOCATION, and DOC_AI_PROCESSOR_ID to enable OCR processing.',
    );
  }

  if (
    Number.isNaN(config.docAi.syncUploadLimitBytes) ||
    config.docAi.syncUploadLimitBytes <= 0
  ) {
    throw new Error('DOC_AI_SYNC_UPLOAD_LIMIT_BYTES must be a positive integer when provided.');
  }

  if (!config.docAi.credentialsPath && config.docAi.enabled) {
    console.warn(
      'Warning: GOOGLE_APPLICATION_CREDENTIALS is not defined. Ensure the runtime environment supplies Google Cloud credentials.',
    );
  }

  return config;
};

export default config;
