import { prisma } from '../lib/prisma';

export function listModules() {
  return prisma.module.findMany({
    orderBy: { createdAt: 'asc' },
  });
}

export async function moduleSummary() {
  const modules = await listModules();
  return modules.map((mod) => ({
    id: mod.id,
    name: mod.name,
    description: mod.description,
    icon: mod.code,
    status: mod.isActive ? 'healthy' : 'offline',
    lastRunAt: mod.updatedAt.toISOString(),
    metrics: { processed: Math.floor(Math.random() * 1200), errors: Math.floor(Math.random() * 10) },
  }));
}
