import { Layout } from './components/layout/Layout';
import { StatsRow } from './components/dashboard/StatsRow';
import { ModuleGrid } from './components/dashboard/ModuleGrid';
import { UploadWorkspace } from './components/upload/UploadWorkspace';
import { ResultViewer } from './components/results/ResultViewer';
import { AuditLogTable } from './components/logs/AuditLogTable';
import { useState } from 'react';
import { ToastContainer } from './lib/toast';
import { useSampleExtract } from './features/ocr/useSampleExtract';

export default function App() {
  const [lastResult, setLastResult] = useState<any>();
  const sampleExtract = useSampleExtract((data) => setLastResult(data));

  return (
    <Layout>
      <ToastContainer />
      <section className="space-y-3">
        <div className="text-3xl font-bold text-text">Medical Document Processing Dashboard</div>
        <p className="max-w-3xl text-muted">
          Modern, secure OCR pipeline for hospitals and public health systems. Upload, digitize, and audit every medical document with realtime insights.
        </p>
      </section>

      <StatsRow />
      <ModuleGrid />
      <UploadWorkspace onResult={setLastResult} />
      <ResultViewer
        result={lastResult}
        onSampleExtract={sampleExtract.run}
        isSampleLoading={sampleExtract.isPending}
        sampleError={sampleExtract.error}
      />
      <AuditLogTable />
    </Layout>
  );
}
