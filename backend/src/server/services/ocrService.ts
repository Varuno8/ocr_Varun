import { DocumentProcessorServiceClient } from 'google-cloud-documentai';
import { Storage } from '@google-cloud/storage';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import type { DocumentMethod } from '../types/document';

const client = env.DEMO_MODE ? null : new DocumentProcessorServiceClient();
const storage = env.DEMO_MODE ? null : new Storage();

function requireDocAiConfig() {
  const { DOC_AI_PROJECT_ID, DOC_AI_LOCATION, DOC_AI_PROCESSOR_ID, DOC_AI_GCS_BUCKET } = env;
  const missing = [
    ['DOC_AI_PROJECT_ID', DOC_AI_PROJECT_ID],
    ['DOC_AI_LOCATION', DOC_AI_LOCATION],
    ['DOC_AI_PROCESSOR_ID', DOC_AI_PROCESSOR_ID],
    ['DOC_AI_GCS_BUCKET', DOC_AI_GCS_BUCKET],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Document AI configuration missing: ${missing.join(', ')}`);
  }

  return {
    projectId: DOC_AI_PROJECT_ID!,
    location: DOC_AI_LOCATION!,
    processorId: DOC_AI_PROCESSOR_ID!,
    bucket: DOC_AI_GCS_BUCKET!,
  };
}

export async function processInlineBytes(buffer: Buffer, mimeType: string) {
  if (env.DEMO_MODE) {
    const elapsedMs = 350;
    const method: DocumentMethod = mimeType.includes('pdf') ? 'Inline Bytes' : 'Inline Image';
    const text =
      'Demo OCR output (no DATABASE_URL or Document AI credentials set). Replace with real service credentials to process files.';
    logger.warn('Demo mode enabled: returning mock OCR result');
    return { text, elapsedMs, method };
  }

  const { projectId, location, processorId } = requireDocAiConfig();
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const request = {
    name,
    rawDocument: {
      content: buffer,
      mimeType,
    },
  } as const;

  const start = process.hrtime();
  const [result] = await client.processDocument(request);
  const text = result.document?.text ?? '';
  const elapsedMs = Math.round(process.hrtime(start)[0] * 1000);
  logger.info('Processed inline document', { elapsedMs });
  const method: DocumentMethod = mimeType.includes('pdf') ? 'Inline Bytes' : 'Inline Image';
  return { text, elapsedMs, method };
}

export async function processPdfBatchViaGcs(inputPrefix: string, outputPrefix: string) {
  if (env.DEMO_MODE) {
    logger.warn('Demo mode enabled: batch GCS processing skipped');
    return {
      text: 'Demo batch OCR output (Document AI disabled).',
      elapsedMs: 500,
      method: 'Batch GCS' as DocumentMethod,
    };
  }

  const { projectId, location, processorId, bucket } = requireDocAiConfig();
  const gcsInputUri = `gs://${bucket}/${inputPrefix}`;
  const gcsOutputUri = `gs://${bucket}/${outputPrefix}`;
  const request = {
    name: `projects/${projectId}/locations/${location}/processors/${processorId}`,
    inputDocuments: {
      gcsPrefix: { gcsUriPrefix: gcsInputUri },
    },
    outputConfig: {
      gcsOutputConfig: {
        gcsUri: gcsOutputUri,
      },
    },
  } as const;

  const start = process.hrtime();
  const [operation] = await client!.batchProcessDocuments(request);
  await operation.promise();
  const elapsedMs = Math.round(process.hrtime(start)[0] * 1000);
  logger.info('Batch process complete', { elapsedMs });

  const [files] = await storage!.bucket(bucket).getFiles({ prefix: outputPrefix });
  const [first] = files;
  const [content] = await first.download();
  const text = content.toString();
  return { text, elapsedMs, method: 'Batch GCS' as DocumentMethod };
}
