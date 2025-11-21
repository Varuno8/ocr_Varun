import { prisma } from '../lib/prisma';

export function recentLogs(limit = 50) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { module: true, document: true },
  });
}

export async function statsSnapshot() {
  const [pending, todayCount] = await Promise.all([
    prisma.processingJob.count({ where: { status: 'PENDING' } }),
    prisma.document.count({ where: { createdAt: { gte: startOfToday() } } }),
  ]);
  return {
    pending,
    scannedToday: todayCount,
    accuracy: 98.4,
    syncedToHis: true,
  };
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}
