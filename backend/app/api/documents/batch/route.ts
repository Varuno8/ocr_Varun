import { NextRequest, NextResponse } from 'next/server';
import { uploadSchema } from '@/src/server/types/api';
import { handleError } from '@/src/server/utils/error';
import { processInlineBytes } from '@/src/server/services/ocrService';
import { saveDocument, recordProcessingJob, createAuditLog } from '@/src/server/services/documentService';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('files');
    if (!files.length) {
      return NextResponse.json({ error: 'files are required' }, { status: 400 });
    }

    const meta = uploadSchema.parse({
      moduleId: form.get('moduleId')?.toString(),
      title: form.get('title')?.toString(),
      uploadedBy: form.get('uploadedBy')?.toString(),
      notes: form.get('notes')?.toString(),
    });

    const results = [] as unknown[];

    for (const item of files) {
      if (!(item instanceof File)) continue;
      const buffer = Buffer.from(await item.arrayBuffer());
      const { text, elapsedMs, method } = await processInlineBytes(buffer, item.type || 'application/pdf');
      const doc = await saveDocument(item.name, meta.moduleId, method, elapsedMs, text, meta);
      await recordProcessingJob(doc.id, { method });
      await createAuditLog(doc.id, meta.moduleId ?? null, 'SUCCESS', elapsedMs);
      results.push({
        id: doc.id,
        filename: doc.filename,
        moduleId: doc.moduleId,
        method,
        elapsed: elapsedMs,
        text,
        createdAt: doc.createdAt,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    return handleError(error);
  }
}
