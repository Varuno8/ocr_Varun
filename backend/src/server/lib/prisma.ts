import { randomUUID } from 'crypto';
import { AuditStatus, JobStatus, ModuleCode, PrismaClient } from '@prisma/client';

type ModuleRecord = {
  id: string;
  name: string;
  code: ModuleCode;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type DocumentRecord = {
  id: string;
  filename: string;
  moduleId: string | null;
  method: string;
  text: string;
  elapsedMs: number;
  uploadedBy?: string | null;
  title?: string | null;
  notes?: string | null;
  createdAt: Date;
};

type AuditLogRecord = {
  id: string;
  documentId: string;
  moduleId: string | null;
  status: AuditStatus;
  elapsedMs: number;
  errorMessage?: string | null;
  createdAt: Date;
};

type ProcessingJobRecord = {
  id: string;
  documentId: string;
  status: JobStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  metadata: Record<string, unknown> | null;
};

class DemoPrisma {
  private modules: ModuleRecord[] = [
    {
      id: 'demo-mod-1',
      name: 'Document Scanner',
      code: ModuleCode.DOCUMENT_SCANNER,
      description: 'Baseline OCR for clinical documents.',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'demo-mod-2',
      name: 'Medicine Stock',
      code: ModuleCode.MEDICINE_STOCK,
      description: 'Inventory insights without a database connection.',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private documents: DocumentRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private processingJobs: ProcessingJobRecord[] = [];

  module = {
    findMany: async () => this.modules,
  };

  document = {
    count: async (args?: { where?: { createdAt?: { gte?: Date } } }) => {
      if (!args?.where?.createdAt?.gte) return this.documents.length;
      return this.documents.filter((doc) => doc.createdAt >= args.where!.createdAt!.gte!).length;
    },
    create: async ({ data }: { data: Omit<DocumentRecord, 'id' | 'createdAt'> }) => {
      const doc: DocumentRecord = {
        id: randomUUID(),
        createdAt: new Date(),
        ...data,
      };
      this.documents.push(doc);
      return doc;
    },
  };

  processingJob = {
    count: async (args?: { where?: { status?: JobStatus } }) => {
      if (!args?.where?.status) return this.processingJobs.length;
      return this.processingJobs.filter((job) => job.status === args.where!.status!).length;
    },
    create: async ({ data }: { data: Omit<ProcessingJobRecord, 'id'> }) => {
      const job: ProcessingJobRecord = {
        id: randomUUID(),
        ...data,
      };
      this.processingJobs.push(job);
      return job;
    },
  };

  auditLog = {
    findMany: async (args?: { take?: number }) => {
      const take = args?.take ?? 50;
      return this.auditLogs
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take)
        .map((log) => ({
          ...log,
          module: this.modules.find((m) => m.id === log.moduleId) ?? null,
          document: this.documents.find((d) => d.id === log.documentId) ?? null,
        }));
    },
    create: async ({ data }: { data: Omit<AuditLogRecord, 'id' | 'createdAt'> }) => {
      const log: AuditLogRecord = {
        id: randomUUID(),
        createdAt: new Date(),
        ...data,
      };
      this.auditLogs.push(log);
      return log;
    },
  };
}

const hasDatabase = Boolean(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | DemoPrisma | undefined };

export const prisma =
  hasDatabase && globalForPrisma.prisma instanceof PrismaClient
    ? globalForPrisma.prisma
    : hasDatabase
      ? new PrismaClient({
          log: ['query', 'info', 'warn', 'error'],
        })
      : new DemoPrisma();

if (hasDatabase && process.env.NODE_ENV !== 'production' && prisma instanceof PrismaClient) {
  globalForPrisma.prisma = prisma;
}
