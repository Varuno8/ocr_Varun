import React from 'react';
import useSWR from 'swr';
import { OcrLog } from '@/lib/types';
import { Loader2, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AuditLogTable() {
    const { data: logs, error, isLoading } = useSWR<OcrLog[]>('/api/logs?limit=20', fetcher, {
        refreshInterval: 5000,
    });

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-cf-accent-teal" /></div>;
    if (error) return <div className="text-cf-accent-coral p-4">Failed to load logs</div>;

    return (
        <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-lg font-bold text-cf-text-primary tracking-tight">System Audit Logs</h2>
                <div className="flex items-center gap-2 text-xs text-cf-text-muted">
                    <span className="w-2 h-2 rounded-full bg-cf-accent-teal animate-pulse"></span>
                    Live Stream
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-cf-surface-hover/50 text-cf-text-secondary font-mono text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Time</th>
                            <th className="px-6 py-4 font-medium">Filename</th>
                            <th className="px-6 py-4 font-medium">Module</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs?.map((log, index) => (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4 text-cf-text-secondary whitespace-nowrap font-mono text-xs">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-cf-text-primary flex items-center gap-3">
                                    <div className="p-1.5 rounded bg-cf-surface-hover text-cf-text-muted group-hover:text-cf-accent-teal transition-colors">
                                        <FileText size={14} />
                                    </div>
                                    {log.filename}
                                </td>
                                <td className="px-6 py-4 text-cf-text-secondary">{log.module}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${log.status === 'success'
                                            ? 'bg-cf-accent-teal/10 text-cf-accent-teal border-cf-accent-teal/20'
                                            : 'bg-cf-accent-coral/10 text-cf-accent-coral border-cf-accent-coral/20'
                                        }`}>
                                        {log.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-cf-text-secondary font-mono text-xs group-hover:text-cf-text-primary transition-colors">
                                    {log.elapsedMs}ms
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
