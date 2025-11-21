import { AlertCircle } from 'lucide-react';
import { useLogs } from '../../hooks/useDashboardData';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const statusVariant = (status: string) => (status === 'SUCCESS' ? 'success' : 'error');

export function AuditLogTable() {
  const { data, error } = useLogs();
  const logs = data || [];

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <p className="text-sm text-muted">Every OCR run is captured for compliance and observability.</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unable to load audit logs</p>
              <p className="text-xs text-amber-700">{error.message}</p>
            </div>
          </div>
        )}
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-text">Time</th>
              <th className="px-4 py-2 text-left font-semibold text-text">Filename</th>
              <th className="px-4 py-2 text-left font-semibold text-text">Module</th>
              <th className="px-4 py-2 text-left font-semibold text-text">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-text">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No audit logs yet. Run OCR to populate the trail.
                </td>
              </tr>
            )}
            {logs.map((log: any, idx: number) => (
              <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-text">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-text">{log.filename}</td>
                <td className="px-4 py-3 text-text">{log.moduleName}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant(log.status)}>{log.status}</Badge></td>
                <td className="px-4 py-3 text-text">{log.elapsedMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
