import { NextResponse } from 'next/server';
import { moduleSummary } from '@/src/server/services/moduleService';
import { handleError } from '@/src/server/utils/error';

export async function GET() {
  try {
    const data = await moduleSummary();
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}
