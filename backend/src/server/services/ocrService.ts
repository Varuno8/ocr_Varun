import { DocumentProcessorServiceClient } from 'google-cloud-documentai';
import { Storage } from '@google-cloud/storage';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import type { DocumentMethod } from '../types/document';

const client = new DocumentProcessorServiceClient();
const storage = new Storage();

export async function processInlineBytes(buffer: Buffer, mimeType: string) {
  const name = `projects/${env.DOC_AI_PROJECT_ID}/locations/${env.DOC_AI_LOCATION}/processors/${env.DOC_AI_PROCESSOR_ID}`;
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
  const gcsInputUri = `gs://${env.DOC_AI_GCS_BUCKET}/${inputPrefix}`;
  const gcsOutputUri = `gs://${env.DOC_AI_GCS_BUCKET}/${outputPrefix}`;
  const request = {
    name: `projects/${env.DOC_AI_PROJECT_ID}/locations/${env.DOC_AI_LOCATION}/processors/${env.DOC_AI_PROCESSOR_ID}`,
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
  const [operation] = await client.batchProcessDocuments(request);
  await operation.promise();
  const elapsedMs = Math.round(process.hrtime(start)[0] * 1000);
  logger.info('Batch process complete', { elapsedMs });

  const [files] = await storage.bucket(env.DOC_AI_GCS_BUCKET).getFiles({ prefix: outputPrefix });
  const [first] = files;
  const [content] = await first.download();
  const text = content.toString();
  return { text, elapsedMs, method: 'Batch GCS' as DocumentMethod };
}
