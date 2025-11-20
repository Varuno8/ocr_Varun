import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Create today's metric
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metric = await prisma.dailyMetric.upsert({
        where: { date: today },
        update: {},
        create: {
            date: today,
            scanned: 12,
            pending: 3,
            accuracy: 98.5,
            syncedToHis: true,
        },
    });
    console.log('Created daily metric:', metric);

    // Create some sample OCR jobs
    const jobs = await Promise.all([
        prisma.oCRJob.create({
            data: {
                filename: 'patient_report_001.pdf',
                module: 'lab-reports',
                method: 'Inline PDF',
                status: 'success',
                elapsedMs: 1250,
                sizeBytes: 1024 * 500,
                mimeType: 'application/pdf',
                textSnippet: 'PATIENT NAME: John Doe\nDOB: 01/01/1980\n...',
            },
        }),
        prisma.oCRJob.create({
            data: {
                filename: 'prescription_scan.jpg',
                module: 'document-scanner',
                method: 'Inline Image',
                status: 'success',
                elapsedMs: 800,
                sizeBytes: 1024 * 200,
                mimeType: 'image/jpeg',
                textSnippet: 'Rx: Amoxicillin 500mg\nSig: 1 tab po tid x 7 days...',
            },
        }),
        prisma.oCRJob.create({
            data: {
                filename: 'corrupted_file.pdf',
                module: 'upload-scans',
                method: 'Inline PDF',
                status: 'failed',
                error: 'File corrupted or unreadable',
                elapsedMs: 100,
                sizeBytes: 1024 * 10,
                mimeType: 'application/pdf',
            },
        }),
    ]);

    console.log(`Created ${jobs.length} sample OCR jobs.`);
    console.log('Seeding finished.');
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
