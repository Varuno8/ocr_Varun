export type ModuleId = 'document-scanner' | 'upload-scans' | 'medicine-stock' | 'opd-ipd' | 'lab-reports' | 'audit-logs';

export interface OcrResponse {
    id: string;
    filename: string;
    text: string;
    confidence: number;
    processingTime: number;
    method: 'ocr' | 'docai';
    elapsedMs: number;
}

export interface OcrLog {
    id: string;
    filename: string;
    status: 'success' | 'failed';
    module: string;
    method: string;
    elapsedMs: number;
    createdAt: string;
}

export interface DashboardStats {
    scannedToday: number;
    pendingValidations: number;
    accuracyScore: number;
    syncedToHis: boolean;
}

export interface DailyMetric {
    id: string;
    date: string;
    scansProcessed: number;
    averageConfidence: number;
    createdAt: string;
    updatedAt: string;
}

export const MODULES = [
    { id: 'document-scanner' as ModuleId, title: 'Document Scanner', description: 'Digitize physical records', icon: 'Scan' },
    { id: 'upload-scans' as ModuleId, title: 'Upload Scans', description: 'Import from local drive', icon: 'Upload' },
    { id: 'medicine-stock' as ModuleId, title: 'Medicine Stock', description: 'Inventory management', icon: 'Pill' },
    { id: 'opd-ipd' as ModuleId, title: 'OPD / IPD', description: 'Patient flow tracking', icon: 'Users' },
    { id: 'lab-reports' as ModuleId, title: 'Lab Reports', description: 'Pathology integration', icon: 'FlaskConical' },
    { id: 'audit-logs' as ModuleId, title: 'Audit Logs', description: 'System activity history', icon: 'ClipboardList' },
];
