import { NextResponse } from 'next/server';
import { handleError } from '@/src/server/utils/error';

export async function GET() {
  try {
    return NextResponse.json({
      id: 'sample-document',
      filename: 'discharge-summary.pdf',
      moduleId: 'General Upload',
      method: 'Sample Extract',
      elapsed: 1240,
      text:
        'Patient: John Doe\nAge: 58\nDiagnosis: Acute bronchitis\nMedication: Amoxicillin 500mg, Paracetamol 650mg\nFollow-up: 2 weeks with primary physician\nNotes: Encourage hydration and monitor fever.',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}
