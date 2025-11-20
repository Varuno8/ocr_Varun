'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import useSWR from 'swr';
import { Upload, FileText, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { StatCard } from '@/components/dashboard/StatCard';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import { ResultsPanel } from '@/components/dashboard/ResultsPanel';
import { AuditLogTable } from '@/components/dashboard/AuditLogTable';
import { MODULES, DailyMetric, OcrResponse } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
    const [activeModule, setActiveModule] = useState(MODULES[0].id);
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [ocrResults, setOcrResults] = useState<OcrResponse[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const { data: metrics } = useSWR<DailyMetric>('/api/dashboard', fetcher, {
        refreshInterval: 10000,
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(acceptedFiles);
        setUploadError(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/tiff': ['.tiff', '.tif'],
        },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('module', activeModule);

        try {
            const res = await fetch('/api/ocr', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data: OcrResponse = await res.json();
            setOcrResults([data, ...ocrResults]);
            setFiles([]);
        } catch (err: any) {
            console.error(err);
            setUploadError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cf-bg text-cf-text-primary selection:bg-cf-accent-teal/30">
            <TopBar />

            <main className="p-6 max-w-[1600px] mx-auto space-y-8">

                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-cf-surface-glass border border-white/5 p-8 shadow-glass"
                >
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cf-accent-blue/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <h2 className="text-3xl font-bold mb-2 tracking-tight text-white">
                                Command Center
                            </h2>
                            <p className="text-cf-text-secondary max-w-xl">
                                Real-time oversight of document processing pipelines.
                                <span className="text-cf-accent-teal ml-2 font-mono text-xs bg-cf-accent-teal/10 px-2 py-1 rounded border border-cf-accent-teal/20">
                                    v2.4.0 STABLE
                                </span>
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <div className="text-xs text-cf-text-muted uppercase tracking-wider mb-1">Server Load</div>
                                <div className="text-xl font-mono font-bold text-cf-accent-teal">12%</div>
                            </div>
                            <div className="w-[1px] h-10 bg-white/10"></div>
                            <div className="text-right">
                                <div className="text-xs text-cf-text-muted uppercase tracking-wider mb-1">Queue Depth</div>
                                <div className="text-xl font-mono font-bold text-white">0</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Asymmetrical Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Stats & Modules (Masonry style) */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard
                                label="Today's Scans"
                                value={metrics?.scansProcessed || 0}
                                trend={{ value: "+12%", isPositive: true }}
                                index={0}
                                type="default"
                            />
                            <StatCard
                                label="Accuracy Rate"
                                value={`${metrics?.averageConfidence ? (metrics.averageConfidence * 100).toFixed(1) : 0}%`}
                                trend={{ value: "+0.5%", isPositive: true }}
                                index={1}
                                type="accuracy"
                            />
                            <StatCard
                                label="Pending Validation"
                                value={3} // Mock data
                                trend={{ value: "-2", isPositive: true }} // Negative pending is good
                                index={2}
                                type="pending"
                            />
                        </div>

                        {/* Modules Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-cf-text-primary tracking-tight">Active Modules</h3>
                                <button className="text-xs text-cf-accent-teal hover:text-white transition-colors uppercase tracking-wider font-bold">
                                    View All Modules
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {MODULES.map((module) => (
                                    <ModuleCard
                                        key={module.id}
                                        id={module.id}
                                        title={module.title}
                                        description={module.description}
                                        iconName={module.icon}
                                        isActive={activeModule === module.id}
                                        onClick={setActiveModule}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Audit Logs (Moved to left column bottom) */}
                        <AuditLogTable />
                    </div>

                    {/* Right Column: Workspace (Upload & Results) */}
                    <div className="lg:col-span-5 flex flex-col gap-6 h-full">

                        {/* Upload Zone */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="glass-panel rounded-2xl p-1 overflow-hidden relative group"
                        >
                            <div {...getRootProps()} className={`
                                relative rounded-xl border-2 border-dashed transition-all duration-500 p-8 min-h-[320px] flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden
                                ${isDragActive
                                    ? 'border-cf-accent-teal bg-cf-accent-teal/5'
                                    : 'border-white/10 hover:border-cf-accent-teal/30 hover:bg-white/5'
                                }
                            `}>
                                <input {...getInputProps()} />

                                {/* Plasma Field Effect */}
                                <div className={`absolute inset-0 bg-plasma opacity-0 transition-opacity duration-500 pointer-events-none blur-3xl ${isDragActive ? 'opacity-20' : 'group-hover:opacity-5'}`} />

                                <AnimatePresence mode="wait">
                                    {isUploading ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex flex-col items-center z-10"
                                        >
                                            <div className="relative w-24 h-24 mb-6">
                                                <div className="absolute inset-0 border-4 border-cf-surface-hover rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-cf-accent-teal rounded-full border-t-transparent animate-spin"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <FileText className="text-cf-accent-teal animate-pulse" size={32} />
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Processing Neural Net...</h3>
                                            <p className="text-cf-text-secondary text-sm font-mono">Extracting entities & validating confidence</p>
                                        </motion.div>
                                    ) : files.length > 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex flex-col items-center z-10 w-full max-w-xs"
                                        >
                                            <div className="w-16 h-16 bg-cf-accent-teal/10 rounded-2xl flex items-center justify-center mb-4 border border-cf-accent-teal/20 shadow-glow">
                                                <FileText className="text-cf-accent-teal" size={32} />
                                            </div>
                                            <p className="font-bold text-white mb-1 truncate w-full text-center">{files[0].name}</p>
                                            <p className="text-xs text-cf-text-secondary mb-6 font-mono">{(files[0].size / 1024).toFixed(1)} KB • Ready to scan</p>

                                            <div className="flex gap-3 w-full">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setFiles([]); }}
                                                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-cf-text-secondary hover:bg-white/5 hover:text-white transition-colors text-sm font-bold"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                                    className="flex-1 px-4 py-2 rounded-lg bg-cf-accent-teal text-cf-bg hover:bg-cf-accent-teal/90 transition-colors text-sm font-bold shadow-glow"
                                                >
                                                    Initialize Scan
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex flex-col items-center z-10"
                                        >
                                            <div className={`w-20 h-20 mb-6 rounded-3xl flex items-center justify-center transition-all duration-500 ${isDragActive ? 'bg-cf-accent-teal text-cf-bg scale-110 shadow-glow' : 'bg-cf-surface-hover/50 text-cf-text-muted group-hover:text-cf-accent-teal group-hover:bg-cf-surface-hover'}`}>
                                                <Upload size={32} strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Initiate Data Ingestion</h3>
                                            <p className="text-cf-text-secondary text-sm max-w-xs mx-auto mb-6 leading-relaxed">
                                                Drag & drop medical records, lab reports, or insurance forms here.
                                            </p>
                                            <button className="px-6 py-2.5 rounded-xl bg-cf-surface-hover border border-white/10 text-cf-text-primary text-sm font-bold hover:border-cf-accent-teal/50 hover:shadow-glow transition-all">
                                                Browse Local Drive
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {uploadError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute bottom-4 left-4 right-4 p-3 bg-cf-accent-coral/10 border border-cf-accent-coral/20 rounded-lg flex items-center gap-2 text-cf-accent-coral text-xs font-bold"
                                    >
                                        <AlertCircle size={14} />
                                        {uploadError}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>

                        {/* Results Panel */}
                        {ocrResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <ResultsPanel result={ocrResults[0]} />
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
