import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');

        const logs = await prisma.oCRJob.findMany({
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                filename: true,
                module: true,
                method: true,
                status: true,
                elapsedMs: true,
                createdAt: true,
            },
        });

        // Format dates to ISO strings for JSON serialization
        const formattedLogs = logs.map(log => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
        }));

        return NextResponse.json(formattedLogs);
    } catch (error) {
        console.error('Logs API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
