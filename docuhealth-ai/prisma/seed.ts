import { AuditStatus, DocumentStatus, PrismaClient, ProcessingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DocuHealth AI seed...');

  const admin = await prisma.user.upsert({
    where: { email: 'ops@docuhealth.ai' },
    update: { name: 'Operations Lead' },
    create: {
      email: 'ops@docuhealth.ai',
      name: 'Operations Lead',
      role: 'ops-admin',
    },
  });

  const modules = [
    {
      key: 'document-scanner',
      name: 'Document Scanner',
      description: 'Scan handwritten and printed clinical notes with Document AI precision.',
      icon: 'ScanLine',
      confidence: 0.97,
    },
    {
      key: 'medicine-stock-parser',
      name: 'Medicine Stock Parser',
      description: 'Digitize pharmacy ledgers and reconcile stock movements automatically.',
      icon: 'Pill',
      confidence: 0.93,
    },
    {
      key: 'opd-ipd-forms',
      name: 'OPD/IPD Forms',
      description: 'Normalize OPD/IPD admission forms into structured data for HIS sync.',
      icon: 'ClipboardList',
      confidence: 0.95,
    },
    {
      key: 'lab-reports',
      name: 'Lab Reports',
      description: 'Extract lab observations and flag critical values for review.',
      icon: 'FlaskRound',
      confidence: 0.96,
    },
    {
      key: 'general-upload',
      name: 'General Upload',
      description: 'Upload any medical artifact for rapid OCR and classification.',
      icon: 'Upload',
      confidence: 0.92,
    },
    {
      key: 'audit-view',
      name: 'Audit View',
      description: 'Trace every document event with durable, compliant audit logs.',
      icon: 'ShieldCheck',
      confidence: 0.99,
    },
  ];

  await Promise.all(
    modules.map((module) =>
      prisma.module.upsert({
        where: { key: module.key },
        update: {
          ...module,
          lastProcessedAt: new Date(Date.now() - 1000 * 60 * 15),
          isActive: true,
        },
        create: {
          ...module,
          lastProcessedAt: new Date(Date.now() - 1000 * 60 * 45),
          isActive: true,
        },
      })
    )
  );

  const clinicalDoc = await prisma.document.create({
    data: {
      title: 'ICU Intake Form',
      filename: 'icu_intake_form.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 734003,
      method: 'Inline PDF',
      status: DocumentStatus.COMPLETED,
      processingTimeMs: 1480,
      textSnippet: 'Patient: A. Kumar | Age: 64 | Diagnosis: Acute MI',
      extractedText:
        'Patient Name: A. Kumar\nAge: 64\nPrimary Dx: Acute MI\nPlan: Start Heparin infusion, serial troponins.',
      module: { connect: { key: 'opd-ipd-forms' } },
      user: { connect: { id: admin.id } },
    },
  });

  const labDoc = await prisma.document.create({
    data: {
      title: 'Cardiac Panel',
      filename: 'cardiac_panel.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 524288,
      method: 'Async PDF',
      status: DocumentStatus.PROCESSING,
      textSnippet: 'Troponin I: 0.41 ng/mL (High)',
      module: { connect: { key: 'lab-reports' } },
      user: { connect: { id: admin.id } },
    },
  });

  await prisma.processingJob.createMany({
    data: [
      {
        documentId: clinicalDoc.id,
        moduleId: (await prisma.module.findUnique({ where: { key: 'opd-ipd-forms' } }))?.id!,
        userId: admin.id,
        status: ProcessingStatus.SUCCEEDED,
        provider: 'google-document-ai',
        method: 'Inline PDF',
        durationMs: 1480,
        completedAt: new Date(Date.now() - 1000 * 60 * 5),
      },
      {
        documentId: labDoc.id,
        moduleId: (await prisma.module.findUnique({ where: { key: 'lab-reports' } }))?.id!,
        userId: admin.id,
        status: ProcessingStatus.RUNNING,
        provider: 'google-document-ai',
        method: 'Async PDF',
        startedAt: new Date(Date.now() - 1000 * 60 * 2),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        documentId: clinicalDoc.id,
        action: 'document.processed',
        entityType: 'document',
        entityId: clinicalDoc.id,
        status: AuditStatus.SUCCESS,
        durationMs: 1480,
        metadata: { module: 'opd-ipd-forms', confidence: 0.97 },
      },
      {
        userId: admin.id,
        documentId: labDoc.id,
        action: 'document.queued',
        entityType: 'document',
        entityId: labDoc.id,
        status: AuditStatus.WARNING,
        durationMs: 0,
        metadata: { module: 'lab-reports', queue: 'priority' },
      },
    ],
  });

  console.log('✅ Seed completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
