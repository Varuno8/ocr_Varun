import { NextResponse } from 'next/server';
import { statsSnapshot } from '@/src/server/services/auditService';
import { handleError } from '@/src/server/utils/error';

export async function GET() {
  try {
    const stats = await statsSnapshot();
    return NextResponse.json(stats);
  } catch (error) {
    return handleError(error);
  }
}
