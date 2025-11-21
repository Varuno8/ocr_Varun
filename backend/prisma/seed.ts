import { PrismaClient, ModuleCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const modules = [
    { name: 'Document Scanner', code: ModuleCode.DOCUMENT_SCANNER, description: 'High fidelity OCR for clinical documents' },
    { name: 'Medicine Stock Parser', code: ModuleCode.MEDICINE_STOCK, description: 'Digitize stock lists and invoices' },
    { name: 'OPD/IPD Form Digitization', code: ModuleCode.OPD_IPD_FORM, description: 'Structured extraction for admission forms' },
    { name: 'Lab Reports Digitization', code: ModuleCode.LAB_REPORT, description: 'Normalize lab report outputs' },
    { name: 'General Upload', code: ModuleCode.GENERAL_UPLOAD, description: 'Ad-hoc OCR for miscellaneous content' },
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
  }

  console.log('✅ Seeded default modules');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
