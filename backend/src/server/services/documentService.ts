import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { UploadPayload } from '../types/api';
import type { DocumentMethod } from '../types/document';

export async function saveDocument(
  filename: string,
  moduleId: string | undefined,
  method: DocumentMethod,
  elapsedMs: number,
  text: string,
  meta: UploadPayload
) {
  const doc = await prisma.document.create({
    data: {
      filename,
      moduleId: moduleId ?? null,
      method,
      elapsedMs,
      text,
      uploadedBy: meta.uploadedBy,
      title: meta.title,
      notes: meta.notes,
    },
  });
  logger.info('Document saved', { id: doc.id, moduleId: doc.moduleId });
  return doc;
}

export async function recordProcessingJob(documentId: string, metadata: Record<string, unknown>) {
  return prisma.processingJob.create({
    data: {
      documentId,
      status: 'COMPLETED',
      metadata,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });
}

export async function createAuditLog(
  documentId: string,
  moduleId: string | null,
  status: 'SUCCESS' | 'FAILED',
  elapsedMs: number,
  errorMessage?: string
) {
  return prisma.auditLog.create({
    data: {
      documentId,
      moduleId,
      status,
      elapsedMs,
      errorMessage,
    },
  });
}
