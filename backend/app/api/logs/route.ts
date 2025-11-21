import { NextRequest, NextResponse } from 'next/server';
import { recentLogs } from '@/src/server/services/auditService';
import { handleError } from '@/src/server/utils/error';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const logs = await recentLogs(limit);
    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        filename: log.document?.filename ?? 'Unknown',
        moduleName: log.module?.name ?? 'General',
        status: log.status,
        elapsedMs: log.elapsedMs,
      }))
    );
  } catch (error) {
    return handleError(error);
  }
}
