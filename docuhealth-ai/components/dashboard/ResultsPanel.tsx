import React from 'react';
import { OcrResponse } from '@/lib/types';
import { Download, FileText, Clock, CheckCircle2, FileType } from 'lucide-react';

interface ResultsPanelProps {
    result: OcrResponse;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
    const handleDownload = (text: string, filename: string, ext: 'txt' | 'md') => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-extracted.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white rounded-xl border border-medical-border shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-medical-border bg-medical-bg/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-medical-text-heading text-sm">{result.filename}</h3>
                        <div className="flex items-center gap-3 text-xs text-medical-text-body mt-0.5 opacity-80">
                            <span className="flex items-center gap-1"><Clock size={12} /> {result.elapsedMs}ms</span>
                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><FileType size={10} /> {result.method}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleDownload(result.text, result.filename, 'txt')}
                        className="px-3 py-1.5 bg-white border border-medical-border text-medical-text-body text-xs font-medium rounded-lg hover:border-medical-primary/50 hover:text-medical-primary transition-colors shadow-sm"
                    >
                        Download .txt
                    </button>
                    <button
                        onClick={() => handleDownload(result.text, result.filename, 'md')}
                        className="px-3 py-1.5 bg-white border border-medical-border text-medical-text-body text-xs font-medium rounded-lg hover:border-medical-primary/50 hover:text-medical-primary transition-colors shadow-sm"
                    >
                        Download .md
                    </button>
                </div>
            </div>
            <div className="p-0">
                <textarea
                    readOnly
                    className="w-full h-64 p-4 text-sm font-mono text-medical-text-body bg-white resize-y focus:outline-none leading-relaxed"
                    value={result.text}
                />
            </div>
        </div>
    );
}
