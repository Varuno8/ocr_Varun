import { NextRequest, NextResponse } from 'next/server';
import { uploadSchema } from '@/src/server/types/api';
import { handleError } from '@/src/server/utils/error';
import { processInlineBytes } from '@/src/server/services/ocrService';
import { saveDocument, recordProcessingJob, createAuditLog } from '@/src/server/services/documentService';
import { logger } from '@/src/server/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const meta = uploadSchema.parse({
      moduleId: form.get('moduleId')?.toString(),
      title: form.get('title')?.toString(),
      uploadedBy: form.get('uploadedBy')?.toString(),
      notes: form.get('notes')?.toString(),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, elapsedMs, method } = await processInlineBytes(buffer, file.type || 'application/pdf');
    const doc = await saveDocument(file.name, meta.moduleId, method, elapsedMs, text, meta);
    await recordProcessingJob(doc.id, { method });
    await createAuditLog(doc.id, meta.moduleId ?? null, 'SUCCESS', elapsedMs);

    logger.info('Upload processed', { documentId: doc.id });

    return NextResponse.json({
      id: doc.id,
      filename: doc.filename,
      moduleId: doc.moduleId,
      method,
      elapsed: elapsedMs,
      text,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
