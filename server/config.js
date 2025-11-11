import dotenv from 'dotenv';

dotenv.config();

const SYNC_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB, Document AI sync limit

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: Number.parseInt(process.env.PORT, 10) || 4000,
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

export const validateConfig = () => {
  const missing = [];

  if (!config.docAi.projectId) missing.push('DOC_AI_PROJECT_ID');
  if (!config.docAi.location) missing.push('DOC_AI_LOCATION');
  if (!config.docAi.processorId) missing.push('DOC_AI_PROCESSOR_ID');

  if (missing.length) {
    throw new Error(
      `Missing required Document AI environment variables: ${missing.join(', ')}`,
    );
  }

  if (!config.docAi.credentialsPath) {
    console.warn(
      'Warning: GOOGLE_APPLICATION_CREDENTIALS is not defined. Make sure the environment provides credentials for the Google Cloud SDK.',
    );
  }

  if (
    Number.isNaN(config.docAi.syncUploadLimitBytes) ||
    config.docAi.syncUploadLimitBytes <= 0
  ) {
    throw new Error('DOC_AI_SYNC_UPLOAD_LIMIT_BYTES must be a positive integer when provided.');
  }

  return config;
};

export default config;
