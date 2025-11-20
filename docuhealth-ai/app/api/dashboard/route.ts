import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Try to find today's metric
        let metric = await prisma.dailyMetric.findUnique({
            where: { date: today },
        });

        // If not found, calculate from OCR jobs or create default
        if (!metric) {
            const scannedCount = await prisma.oCRJob.count({
                where: {
                    createdAt: {
                        gte: today,
                    },
                },
            });

            metric = await prisma.dailyMetric.create({
                data: {
                    date: today,
                    scanned: scannedCount,
                    pending: 0,
                    accuracy: 95.0,
                    syncedToHis: true,
                },
            });
        }

        return NextResponse.json({
            scannedToday: metric.scanned,
            pendingValidations: metric.pending,
            accuracyScore: metric.accuracy,
            syncedToHis: metric.syncedToHis,
        });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
