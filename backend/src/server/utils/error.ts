import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    logger.warn(error.message);
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    logger.warn('Validation error', { issues: error.issues });
    return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 422 });
  }
  logger.error('Unexpected error', { error });
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
