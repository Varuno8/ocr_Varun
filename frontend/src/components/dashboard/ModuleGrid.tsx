import { FileText, FlaskConical, FolderOpenDot, Microscope, ScanLine, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useModules } from '../../hooks/useDashboardData';

const fallbackModules = [
  { name: 'Document Scanner', description: 'High-fidelity OCR for clinical docs', icon: ScanLine, status: 'healthy', lastRunAt: 'Just now' },
  { name: 'Medicine Stock Parser', description: 'Digitize pharmacy and stock ledgers', icon: FlaskConical, status: 'healthy', lastRunAt: '2m ago' },
  { name: 'OPD/IPD Forms', description: 'Structured intake extraction', icon: Stethoscope, status: 'degraded', lastRunAt: '5m ago' },
  { name: 'Lab Reports', description: 'Normalize lab report outputs', icon: Microscope, status: 'healthy', lastRunAt: '8m ago' },
  { name: 'General Upload', description: 'Ad-hoc OCR workspace', icon: FolderOpenDot, status: 'healthy', lastRunAt: '12m ago' },
  { name: 'Audit & Logs', description: 'Track every OCR event', icon: FileText, status: 'healthy', lastRunAt: '1m ago' },
];

const statusVariant = (status: string) =>
  status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'error';

export function ModuleGrid() {
  const { data } = useModules();
  const modules = data || fallbackModules;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((mod: any) => {
        const Icon = mod.icon ? (fallbackModules.find((m) => m.name === mod.name)?.icon ?? ScanLine) : ScanLine;
        return (
          <Card key={mod.name} className="hover-lift h-full">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{mod.name}</CardTitle>
                  <p className="text-sm text-muted">{mod.description}</p>
                </div>
              </div>
              <Badge variant={statusVariant(mod.status)}>{mod.status || 'healthy'}</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted">
              <div>Last run: {mod.lastRunAt || 'moments ago'}</div>
              <div className="flex gap-3 text-xs">
                <span>Processed: {mod.metrics?.processed ?? 0}</span>
                <span>Errors: {mod.metrics?.errors ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
