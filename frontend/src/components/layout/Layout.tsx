import { Activity, HeartPulse } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/badge';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold text-text">DocuHealth AI</div>
              <p className="text-sm text-muted">AI-Powered Document Digitization for Medical Institutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="flex items-center gap-1">
              <Activity className="h-4 w-4" /> Online · Connected to HIS
            </Badge>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">{children}</main>
    </div>
  );
}
