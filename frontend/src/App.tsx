import { Layout } from './components/layout/Layout';
import { StatsRow } from './components/dashboard/StatsRow';
import { ModuleGrid } from './components/dashboard/ModuleGrid';
import { UploadWorkspace } from './components/upload/UploadWorkspace';
import { ResultViewer } from './components/results/ResultViewer';
import { AuditLogTable } from './components/logs/AuditLogTable';
import { useState } from 'react';
import { Toaster } from 'sonner';

export default function App() {
  const [lastResult, setLastResult] = useState<any>();

  return (
    <Layout>
      <Toaster position="top-right" richColors />
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="gradient-card rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg">Powered by Google Document AI</div>
          <div className="text-3xl font-bold text-text">Medical Document Processing Dashboard</div>
        </div>
        <p className="max-w-3xl text-muted">
          Modern, secure OCR pipeline for hospitals and public health systems. Upload, digitize, and audit every medical document with realtime insights.
        </p>
      </section>

      <StatsRow />
      <ModuleGrid />
      <UploadWorkspace onResult={setLastResult} />
      <ResultViewer result={lastResult} />
      <AuditLogTable />
    </Layout>
  );
}
