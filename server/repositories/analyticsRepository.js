import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';

export const FEATURE_DEFINITIONS = [
  {
    id: 'document-scanner',
    title: 'Document Scanner',
    description: 'Digitize OPD/IPD forms with quality review workflows.',
    icon: '🖨️',
  },
  {
    id: 'upload-scans',
    title: 'Upload Scans',
    description: 'Securely ingest legacy scans and triage validation queues.',
    icon: '📤',
  },
  {
    id: 'medicine-stock-parser',
    title: 'Medicine Stock Parser',
    description: 'Audit pharmacy stock sheets and flag discrepancies automatically.',
    icon: '💊',
  },
  {
    id: 'opd-ipd-digitization',
    title: 'OPD/IPD Form Digitization',
    description: 'Structure inpatient and outpatient forms for HIS synchronization.',
    icon: '📋',
  },
  {
    id: 'lab-reports-digitization',
    title: 'Lab Reports Digitization',
    description: 'Route lab reports to consultants with accuracy dashboards.',
    icon: '🧪',
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    description: 'Track all OCR automations across departments.',
    icon: '🛡️',
  },
];

const emptyTrend = () => {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const label = date.toLocaleDateString('en-IN', {
      month: 'short',
      day: '2-digit',
    });
    days.push({ label, volume: 0 });
  }
  return days;
};

const mergeTrend = (base, rows) => {
  const map = new Map(base.map((entry) => [entry.label, { ...entry }]));
  rows.forEach((row) => {
    const date = new Date(row.day);
    const label = date.toLocaleDateString('en-IN', {
      month: 'short',
      day: '2-digit',
    });
    const target = map.get(label);
    if (target) {
      target.volume = Number(row.volume || 0);
      map.set(label, target);
    }
  });
  return Array.from(map.values());
};

const recordAuditLog = async ({ eventType, actor, summary, payload }) => {
  await query(
    `INSERT INTO audit_logs (id, event_type, actor, summary, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), eventType, actor, summary, payload ? JSON.stringify(payload) : '{}'],
  );
};

const fetchDocumentScanSummary = async () => {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN DATE(scanned_at) = CURRENT_DATE THEN scan_volume ELSE 0 END), 0)::int AS documents_scanned_today,
      COALESCE(SUM(CASE WHEN status = 'pending_validation' THEN scan_volume ELSE 0 END), 0)::int AS pending_validations,
      COALESCE(ROUND(AVG(accuracy_score)::numeric, 3), 0)::float AS avg_accuracy,
      COALESCE(SUM(scan_volume), 0)::int AS total_volume,
      COALESCE(SUM(CASE WHEN his_synced THEN scan_volume ELSE 0 END), 0)::int AS synced_volume
    FROM document_scans
  `);
  const summary = rows[0] || {};
  const hisSyncRate = summary.total_volume
    ? Number(summary.synced_volume || 0) / Number(summary.total_volume)
    : 0;

  return {
    documentsScannedToday: Number(summary.documents_scanned_today || 0),
    pendingValidations: Number(summary.pending_validations || 0),
    avgAccuracy: Number(summary.avg_accuracy || 0),
    hisSyncRate,
    hisSyncStatus: hisSyncRate === 0 ? 'No' : hisSyncRate >= 0.9 ? 'Yes' : 'Partial',
  };
};

const fetchUploadSummary = async () => {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(scan_volume), 0)::int AS total_volume,
      COALESCE(SUM(CASE WHEN status IN ('processing', 'pending_validation') THEN scan_volume ELSE 0 END), 0)::int AS queue_volume,
      COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - scanned_at)) / 60), 0) AS avg_minutes_open
    FROM document_scans
    WHERE ingestion_channel = 'upload'
  `);
  const summary = rows[0] || {};
  return {
    totalUploads: Number(summary.total_volume || 0),
    queueVolume: Number(summary.queue_volume || 0),
    avgMinutesOpen: Number(summary.avg_minutes_open || 0),
  };
};

const fetchMedicineSummary = async () => {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total_batches,
      COALESCE(SUM(CASE WHEN discrepancy_flag THEN 1 ELSE 0 END), 0)::int AS flagged,
      COALESCE(SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS expiring
    FROM medicine_stock_events
  `);
  const summary = rows[0] || {};
  return {
    totalBatches: Number(summary.total_batches || 0),
    flagged: Number(summary.flagged || 0),
    expiringSoon: Number(summary.expiring || 0),
  };
};

const fetchOpdIpdSummary = async () => {
  const { rows } = await query(`
    SELECT
      document_type,
      COALESCE(SUM(scan_volume), 0)::int AS volume,
      COALESCE(SUM(CASE WHEN status = 'pending_validation' THEN scan_volume ELSE 0 END), 0)::int AS pending
    FROM document_scans
    WHERE document_type IN ('opd', 'ipd')
    GROUP BY document_type
  `);
  const totalVolume = rows.reduce((acc, row) => acc + Number(row.volume || 0), 0);
  const pending = rows.reduce((acc, row) => acc + Number(row.pending || 0), 0);
  return {
    totalVolume,
    pending,
    breakdown: rows.map((row) => ({
      documentType: row.document_type,
      volume: Number(row.volume || 0),
      pending: Number(row.pending || 0),
    })),
  };
};

const fetchLabSummary = async () => {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total_reports,
      COALESCE(SUM(CASE WHEN status IN ('pending_validation', 'processing') THEN 1 ELSE 0 END), 0)::int AS pending,
      COALESCE(SUM(CASE WHEN his_synced THEN 1 ELSE 0 END), 0)::int AS synced
    FROM lab_reports
  `);
  const summary = rows[0] || {};
  return {
    totalReports: Number(summary.total_reports || 0),
    pending: Number(summary.pending || 0),
    synced: Number(summary.synced || 0),
  };
};

const fetchAuditSummary = async () => {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total_entries,
      COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END), 0)::int AS last_day
    FROM audit_logs
  `);
  const summary = rows[0] || {};
  return {
    totalEntries: Number(summary.total_entries || 0),
    lastDay: Number(summary.last_day || 0),
  };
};

export const getDashboardSnapshot = async () => {
  const [scanSummary, validations, trendRows] = await Promise.all([
    fetchDocumentScanSummary(),
    query(
      `SELECT id, document_name, department, validation_due_at
       FROM document_scans
       WHERE status = 'pending_validation'
       ORDER BY validation_due_at ASC NULLS LAST
       LIMIT 6`,
    ),
    query(
      `SELECT DATE_TRUNC('day', scanned_at) AS day, SUM(scan_volume)::int AS volume
       FROM document_scans
       WHERE scanned_at >= NOW() - INTERVAL '6 days'
       GROUP BY 1
       ORDER BY 1`,
    ),
  ]);

  return {
    lastUpdated: new Date().toISOString(),
    summary: scanSummary,
    validationsDue: validations.rows.map((row) => ({
      id: row.id,
      documentName: row.document_name,
      department: row.department,
      validationDueAt: row.validation_due_at,
    })),
    productivityTrend: mergeTrend(emptyTrend(), trendRows.rows),
  };
};

export const getFeatureCatalogue = async () => {
  const [scanSummary, uploadSummary, medicineSummary, opdIpdSummary, labSummary, auditSummary] =
    await Promise.all([
      fetchDocumentScanSummary(),
      fetchUploadSummary(),
      fetchMedicineSummary(),
      fetchOpdIpdSummary(),
      fetchLabSummary(),
      fetchAuditSummary(),
    ]);

  return FEATURE_DEFINITIONS.map((feature) => {
    switch (feature.id) {
      case 'document-scanner':
        return {
          ...feature,
          metrics: {
            documentsScannedToday: scanSummary.documentsScannedToday,
            pendingValidations: scanSummary.pendingValidations,
            avgAccuracy: scanSummary.avgAccuracy,
          },
        };
      case 'upload-scans':
        return {
          ...feature,
          metrics: {
            queueVolume: uploadSummary.queueVolume,
            totalUploads: uploadSummary.totalUploads,
            avgMinutesOpen: uploadSummary.avgMinutesOpen,
          },
        };
      case 'medicine-stock-parser':
        return {
          ...feature,
          metrics: medicineSummary,
        };
      case 'opd-ipd-digitization':
        return {
          ...feature,
          metrics: {
            totalVolume: opdIpdSummary.totalVolume,
            pending: opdIpdSummary.pending,
          },
        };
      case 'lab-reports-digitization':
        return {
          ...feature,
          metrics: labSummary,
        };
      case 'audit-logs':
        return {
          ...feature,
          metrics: auditSummary,
        };
      default:
        return feature;
    }
  });
};

export const getFeatureDetail = async (featureId) => {
  switch (featureId) {
    case 'document-scanner': {
      const [scanSummary, recentScans, validations, trend] = await Promise.all([
        fetchDocumentScanSummary(),
        query(
          `SELECT id, document_name, department, status, accuracy_score, his_synced, scan_volume, scanned_at
           FROM document_scans
           ORDER BY scanned_at DESC
           LIMIT 10`,
        ),
        query(
          `SELECT id, document_name, department, validation_due_at
           FROM document_scans
           WHERE status = 'pending_validation'
           ORDER BY validation_due_at ASC NULLS LAST
           LIMIT 6`,
        ),
        query(
          `SELECT DATE_TRUNC('day', scanned_at) AS day, SUM(scan_volume)::int AS volume
           FROM document_scans
           WHERE scanned_at >= NOW() - INTERVAL '6 days'
           GROUP BY 1
           ORDER BY 1`,
        ),
      ]);

      return {
        id: featureId,
        summary: scanSummary,
        recentScans: recentScans.rows.map((row) => ({
          id: row.id,
          documentName: row.document_name,
          department: row.department,
          status: row.status,
          accuracyScore: row.accuracy_score,
          hisSynced: row.his_synced,
          scanVolume: row.scan_volume,
          scannedAt: row.scanned_at,
        })),
        validationsDue: validations.rows.map((row) => ({
          id: row.id,
          documentName: row.document_name,
          department: row.department,
          validationDueAt: row.validation_due_at,
        })),
        productivityTrend: mergeTrend(emptyTrend(), trend.rows),
      };
    }
    case 'upload-scans': {
      const [uploadSummary, uploads] = await Promise.all([
        fetchUploadSummary(),
        query(
          `SELECT id, document_name, department, status, scanned_at
           FROM document_scans
           WHERE ingestion_channel = 'upload'
           ORDER BY scanned_at DESC
           LIMIT 10`,
        ),
      ]);

      return {
        id: featureId,
        summary: uploadSummary,
        uploads: uploads.rows.map((row) => ({
          id: row.id,
          documentName: row.document_name,
          department: row.department,
          status: row.status,
          scannedAt: row.scanned_at,
        })),
      };
    }
    case 'medicine-stock-parser': {
      const [summary, events] = await Promise.all([
        fetchMedicineSummary(),
        query(
          `SELECT id, medicine_name, batch_number, expiry_date, quantity_detected, discrepancy_flag, detected_at
           FROM medicine_stock_events
           ORDER BY detected_at DESC
           LIMIT 10`,
        ),
      ]);

      return {
        id: featureId,
        summary,
        events: events.rows.map((row) => ({
          id: row.id,
          medicineName: row.medicine_name,
          batchNumber: row.batch_number,
          expiryDate: row.expiry_date,
          quantityDetected: row.quantity_detected,
          discrepancyFlag: row.discrepancy_flag,
          detectedAt: row.detected_at,
        })),
      };
    }
    case 'opd-ipd-digitization': {
      const summary = await fetchOpdIpdSummary();
      const recent = await query(
        `SELECT id, document_name, document_type, department, status, scanned_at, accuracy_score
         FROM document_scans
         WHERE document_type IN ('opd', 'ipd')
         ORDER BY scanned_at DESC
         LIMIT 10`,
      );

      return {
        id: featureId,
        summary,
        records: recent.rows.map((row) => ({
          id: row.id,
          documentName: row.document_name,
          documentType: row.document_type,
          department: row.department,
          status: row.status,
          scannedAt: row.scanned_at,
          accuracyScore: row.accuracy_score,
        })),
      };
    }
    case 'lab-reports-digitization': {
      const [summary, reports] = await Promise.all([
        fetchLabSummary(),
        query(
          `SELECT id, patient_name, test_type, status, his_synced, detected_at
           FROM lab_reports
           ORDER BY detected_at DESC
           LIMIT 12`,
        ),
      ]);

      return {
        id: featureId,
        summary,
        reports: reports.rows.map((row) => ({
          id: row.id,
          patientName: row.patient_name,
          testType: row.test_type,
          status: row.status,
          hisSynced: row.his_synced,
          detectedAt: row.detected_at,
        })),
      };
    }
    case 'audit-logs': {
      const [summary, logs] = await Promise.all([
        fetchAuditSummary(),
        query(
          `SELECT id, event_type, actor, summary, created_at
           FROM audit_logs
           ORDER BY created_at DESC
           LIMIT 15`,
        ),
      ]);

      return {
        id: featureId,
        summary,
        logs: logs.rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          actor: row.actor,
          summary: row.summary,
          createdAt: row.created_at,
        })),
      };
    }
    default:
      return null;
  }
};

export const createFeatureRequest = async ({
  featureId,
  requesterName,
  department,
  priority,
  notes,
}) => {
  const id = uuidv4();
  await query(
    `INSERT INTO feature_requests
      (id, feature_id, requester_name, department, priority, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, featureId, requesterName, department, priority, notes],
  );

  await recordAuditLog({
    eventType: 'feature.request.created',
    actor: requesterName || 'unknown',
    summary: `New workflow request for ${featureId}`,
    payload: { featureId, department, priority },
  });

  return { id };
};

export const recordFeatureLaunch = async ({ featureId, actor }) => {
  await recordAuditLog({
    eventType: 'feature.launch',
    actor: actor || 'system',
    summary: `Triggered workflow for ${featureId}`,
  });
};

export const recordDocumentScan = async ({
  documentName,
  documentType,
  department,
  ingestionChannel,
  status,
  accuracyScore,
  hisSynced,
  scanVolume,
  validationDueAt,
  metadata,
}) => {
  const id = uuidv4();
  await query(
    `INSERT INTO document_scans
      (id, document_name, document_type, department, ingestion_channel, status,
       accuracy_score, his_synced, scan_volume, validation_due_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      documentName,
      documentType,
      department,
      ingestionChannel || 'scanner',
      status || 'completed',
      accuracyScore,
      hisSynced ?? false,
      scanVolume || 1,
      validationDueAt,
      metadata ? JSON.stringify(metadata) : '{}',
    ],
  );

  await recordAuditLog({
    eventType: 'document.scan.recorded',
    actor: 'ocr-service',
    summary: `Captured ${documentName} (${documentType}) via ${ingestionChannel || 'scanner'}.`,
    payload: { status, accuracyScore },
  });

  return { id };
};

export const getFeatureDefinition = (featureId) =>
  FEATURE_DEFINITIONS.find((feature) => feature.id === featureId);
