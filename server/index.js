import express from 'express';
import cors from 'cors';
import multer from 'multer';

import config from './config.js';
import { query, isUsingInMemory } from './db/index.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxSizeMb * 1024 * 1024,
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  let headerApplied = false;
  const originalWriteHead = res.writeHead;

  res.writeHead = function writeHeadPatched(...args) {
    if (!headerApplied && !res.headersSent) {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const rounded = Math.max(elapsedMs, 0).toFixed(1);
      res.setHeader('X-Response-Time', `${rounded}ms`);
      res.setHeader('Server-Timing', `app;dur=${rounded}`);
      headerApplied = true;
    }
    return originalWriteHead.apply(this, args);
  };

  res.once('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const rounded = Math.max(elapsedMs, 0).toFixed(1);
    console.log(`[server] ${req.method} ${req.originalUrl} ${res.statusCode} ${rounded}ms`);
  });

  next();
});

const parseNumeric = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  const result = Number(value);
  return Number.isNaN(result) ? fallback : result;
};

const formatPercentChange = (current, previous) => {
  if (previous === 0) {
    if (current === 0) return 'No change';
    return 'New activity';
  }
  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded}% vs yesterday`;
};

const buildDocument = (row) => ({
  id: row.id,
  title: row.title,
  documentType: row.document_type,
  status: row.status,
  confidence: row.confidence !== null ? Number(row.confidence) : null,
  hisSynced: row.his_synced,
  summary: row.summary,
  uploadedBy: row.uploaded_by,
  uploadedAt: row.uploaded_at,
  module: row.module_slug
    ? {
        slug: row.module_slug,
        name: row.module_name,
      }
    : null,
});

app.get('/health', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    res.json({
      status: 'ok',
      database: isUsingInMemory() ? 'in-memory' : 'postgres',
      timestamp: rows[0].now,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const [{ rows: todayRows }, { rows: yesterdayRows }, { rows: pendingRows }, { rows: overdueRows }] =
      await Promise.all([
        query(
          `SELECT COUNT(*)::int AS count FROM documents WHERE uploaded_at >= date_trunc('day', NOW())`,
        ),
        query(
          `SELECT COUNT(*)::int AS count FROM documents
           WHERE uploaded_at >= date_trunc('day', NOW() - INTERVAL '1 day')
             AND uploaded_at < date_trunc('day', NOW())`,
        ),
        query(`SELECT COUNT(*)::int AS count FROM validations WHERE status IN ('pending', 'in-review')`),
        query(
          `SELECT COUNT(*)::int AS count FROM validations
           WHERE status = 'pending' AND due_at IS NOT NULL AND due_at < NOW()`,
        ),
      ]);

    const documentsToday = Number(todayRows[0]?.count ?? 0);
    const documentsYesterday = Number(yesterdayRows[0]?.count ?? 0);
    const pendingValidationsCount = Number(pendingRows[0]?.count ?? 0);
    const overdueValidations = Number(overdueRows[0]?.count ?? 0);

    const [{ rows: accuracyRows }, { rows: accuracyPrevRows }] = await Promise.all([
      query(
        `SELECT AVG(confidence) AS avg_confidence
         FROM documents
         WHERE confidence IS NOT NULL AND confidence > 0
           AND uploaded_at >= NOW() - INTERVAL '7 days'`,
      ),
      query(
        `SELECT AVG(confidence) AS avg_confidence
         FROM documents
         WHERE confidence IS NOT NULL AND confidence > 0
           AND uploaded_at >= NOW() - INTERVAL '14 days'
           AND uploaded_at < NOW() - INTERVAL '7 days'`,
      ),
    ]);

    const avgAccuracy = parseNumeric(accuracyRows[0]?.avg_confidence, null);
    const previousAccuracy = parseNumeric(accuracyPrevRows[0]?.avg_confidence, null);
    const accuracyTrend =
      avgAccuracy !== null && previousAccuracy !== null
        ? formatPercentChange(avgAccuracy, previousAccuracy)
        : 'Stable performance';

    const { rows: syncRows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE his_synced) AS synced,
         COUNT(*) AS total
       FROM documents
       WHERE uploaded_at >= NOW() - INTERVAL '1 day'`,
    );

    const syncedCount = Number(syncRows[0]?.synced ?? 0);
    const totalSyncedWindow = Number(syncRows[0]?.total ?? 0);
    const hisHealthy = totalSyncedWindow === 0 ? true : syncedCount / totalSyncedWindow >= 0.9;

    const { rows: pendingDetailRows } = await query(
      `SELECT
         v.id,
         v.priority,
         v.status,
         v.due_at,
         d.id AS document_id,
         d.title AS document_title,
         d.document_type,
         d.uploaded_at,
         d.uploaded_by,
         m.slug AS module_slug,
         m.name AS module_name
       FROM validations v
       JOIN documents d ON d.id = v.document_id
       LEFT JOIN modules m ON m.id = d.module_id
       WHERE v.status IN ('pending', 'in-review')
       ORDER BY v.priority DESC, v.due_at ASC NULLS LAST
       LIMIT 6`,
    );

    const pendingValidations = pendingDetailRows.map((row) => ({
      id: row.id,
      priority: row.priority,
      status: row.status,
      dueAt: row.due_at,
      document: {
        id: row.document_id,
        title: row.document_title,
        type: row.document_type,
        uploadedAt: row.uploaded_at,
        uploadedBy: row.uploaded_by,
        module: row.module_slug
          ? {
              slug: row.module_slug,
              name: row.module_name,
            }
          : null,
      },
    }));

    const { rows: documentRows } = await query(
      `SELECT
         d.id,
         d.title,
         d.document_type,
         d.status,
         d.confidence,
         d.his_synced,
         d.summary,
         d.uploaded_by,
         d.uploaded_at,
         m.slug AS module_slug,
         m.name AS module_name
       FROM documents d
       LEFT JOIN modules m ON m.id = d.module_id
       ORDER BY d.uploaded_at DESC
       LIMIT 8`,
    );

    const { rows: medicineRows } = await query(
      `SELECT id, item_name, quantity, unit, threshold, last_updated
       FROM medicine_stock
       ORDER BY item_name ASC`,
    );

    res.json({
      status: hisHealthy ? 'Operational' : 'Degraded',
      lastUpdated: new Date().toISOString(),
      stats: [
        {
          id: 'documents',
          label: 'Documents scanned today',
          value: documentsToday,
          icon: '🖨️',
          trend: formatPercentChange(documentsToday, documentsYesterday),
        },
        {
          id: 'validations',
          label: 'Pending validations',
          value: pendingValidationsCount,
          icon: '⏳',
          trend:
            overdueValidations > 0
              ? `${overdueValidations} overdue`
              : 'All within SLA',
        },
        {
          id: 'accuracy',
          label: 'Accuracy score',
          value: avgAccuracy !== null ? `${Math.round(avgAccuracy * 10) / 10}%` : '—',
          icon: '🎯',
          trend: accuracyTrend,
        },
        {
          id: 'his-sync',
          label: 'Synced to HIS',
          value: hisHealthy ? 'Yes' : 'Review needed',
          icon: '🔗',
          trend: `${syncedCount}/${totalSyncedWindow || 0} batches`,
        },
      ],
      pendingValidations,
      recentDocuments: documentRows.map(buildDocument),
      medicineStock: medicineRows.map((row) => ({
        id: row.id,
        itemName: row.item_name,
        quantity: row.quantity,
        unit: row.unit,
        threshold: row.threshold,
        status: row.quantity <= row.threshold ? 'low' : 'ok',
        lastUpdated: row.last_updated,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/modules', async (_req, res, next) => {
  try {
    const { rows: moduleRows } = await query(
      `SELECT
         m.id,
         m.slug,
         m.name,
         m.category,
         m.description,
         m.status,
         m.icon,
         m.accuracy,
         m.last_synced,
         m.his_facilities_synced,
         COALESCE(MAX(d.uploaded_at), m.last_synced) AS last_activity,
         COUNT(*) FILTER (WHERE d.uploaded_at >= NOW() - INTERVAL '1 day') AS documents_today
       FROM modules m
       LEFT JOIN documents d ON d.module_id = m.id
       GROUP BY m.id
       ORDER BY m.name ASC`,
    );

    const { rows: docTypeRows } = await query(
      `SELECT module_id, document_type FROM module_document_types ORDER BY document_type`,
    );

    const documentTypes = new Map();
    docTypeRows.forEach((row) => {
      const current = documentTypes.get(row.module_id) ?? [];
      current.push(row.document_type);
      documentTypes.set(row.module_id, current);
    });

    const modules = moduleRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      summary: row.description,
      status: row.status,
      icon: row.icon,
      accuracy: row.accuracy !== null ? Number(row.accuracy) : null,
      lastRun: row.last_activity,
      documentsToday: Number(row.documents_today ?? 0),
      hisFacilitiesSynced: Number(row.his_facilities_synced ?? 0),
      category: row.category,
      documentTypes: documentTypes.get(row.id) ?? [],
    }));

    res.json({ modules });
  } catch (error) {
    next(error);
  }
});

app.get('/api/modules/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { rows: moduleRows } = await query(
      `SELECT * FROM modules WHERE slug = $1 LIMIT 1`,
      [slug],
    );

    if (moduleRows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const module = moduleRows[0];

    const [metricsResult, eventsResult, stepsResult, contactsResult, docTypesResult] = await Promise.all([
      query(
        `SELECT label, value, caption FROM module_metrics WHERE module_id = $1 ORDER BY label`,
        [module.id],
      ),
      query(
        `SELECT detail, occurred_at FROM module_events WHERE module_id = $1 ORDER BY occurred_at DESC LIMIT 8`,
        [module.id],
      ),
      query(
        `SELECT step FROM module_next_steps WHERE module_id = $1 ORDER BY step`,
        [module.id],
      ),
      query(
        `SELECT name, role, email, phone FROM module_contacts WHERE module_id = $1 ORDER BY name`,
        [module.id],
      ),
      query(
        `SELECT document_type FROM module_document_types WHERE module_id = $1 ORDER BY document_type`,
        [module.id],
      ),
    ]);

    res.json({
      slug: module.slug,
      name: module.name,
      description: module.description,
      status: module.status,
      icon: module.icon,
      category: module.category,
      accuracy: module.accuracy !== null ? Number(module.accuracy) : null,
      lastSynced: module.last_synced,
      hisFacilitiesSynced: Number(module.his_facilities_synced ?? 0),
      metrics: metricsResult.rows.map((row) => ({
        label: row.label,
        value: row.value,
        caption: row.caption ?? undefined,
      })),
      recentActivity: eventsResult.rows.map((row) => ({
        time: row.occurred_at,
        detail: row.detail,
      })),
      nextSteps: stepsResult.rows.map((row) => row.step),
      contacts: contactsResult.rows.map((row) => ({
        name: row.name,
        role: row.role,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
      })),
      documentTypes: docTypesResult.rows.map((row) => row.document_type),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/audit-logs', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         a.id,
         a.action,
         a.detail,
         a.actor,
         a.created_at,
         m.slug AS module_slug,
         m.name AS module_name
       FROM audit_logs a
       LEFT JOIN modules m ON m.id = a.module_id
       ORDER BY a.created_at DESC
       LIMIT 12`,
    );

    res.json({
      logs: rows.map((row) => ({
        id: row.id,
        action: row.action,
        detail: row.detail,
        actor: row.actor,
        createdAt: row.created_at,
        module: row.module_slug
          ? {
              slug: row.module_slug,
              name: row.module_name,
            }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/documents', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A scanned file is required.' });
    }

    const moduleSlug = req.body.moduleSlug || 'document-scanner';
    const documentType = req.body.documentType || 'OPD Form';
    const notes = req.body.notes?.trim();
    const uploadedBy = req.body.uploadedBy?.trim() || 'Automated Intake';
    const friendlyName = req.body.title?.trim();

    const { rows: moduleRows } = await query(
      `SELECT id, name FROM modules WHERE slug = $1 LIMIT 1`,
      [moduleSlug],
    );

    if (moduleRows.length === 0) {
      return res.status(400).json({ error: 'Unknown module selected for upload.' });
    }

    const module = moduleRows[0];

    const normalizedTitle =
      friendlyName ||
      `${documentType} - ${req.file.originalname.replace(/\.[^./]+$/, '')}`.replace(/\s+/g, ' ');

    const baseConfidence = 90 + (req.file.size % 1000) / 10;
    const confidenceScore = Math.round(Math.min(baseConfidence, 99.5) * 10) / 10;
    const needsValidation = confidenceScore < 92;
    const status = needsValidation ? 'Pending Validation' : 'Validated';
    const hisSynced = !needsValidation;

    const summaryParts = [
      `Extracted ${documentType.toLowerCase()} for HIS ingestion using DocuHealth AI pipeline.`,
    ];
    if (notes) {
      summaryParts.push(`Operator notes: ${notes}`);
    }

    const { rows: documentRows } = await query(
      `INSERT INTO documents (
         module_id,
         title,
         document_type,
         file_name,
         mime_type,
         status,
         confidence,
         his_synced,
         summary,
         uploaded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, document_type, status, confidence, his_synced, summary, uploaded_by, uploaded_at`,
      [
        module.id,
        normalizedTitle,
        documentType,
        req.file.originalname,
        req.file.mimetype,
        status,
        confidenceScore,
        hisSynced,
        summaryParts.join(' '),
        uploadedBy,
      ],
    );

    const document = documentRows[0];

    let validationRecord = null;
    if (needsValidation) {
      const dueMinutes = confidenceScore < 88 ? 60 : 180;
      const priority = confidenceScore < 88 ? 'high' : 'normal';
      const { rows: validationRows } = await query(
        `INSERT INTO validations (document_id, assigned_to, status, priority, due_at)
         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval)
         RETURNING id, status, priority, due_at`,
        [document.id, 'QA Nurse Team', 'pending', priority, dueMinutes],
      );
      validationRecord = validationRows[0];
    }

    await query(
      `INSERT INTO audit_logs (module_id, action, detail, actor)
       VALUES ($1, $2, $3, $4)`,
      [
        module.id,
        'Document Uploaded',
        `${normalizedTitle} ingested via ${module.name}.`,
        uploadedBy,
      ],
    );

    res.status(201).json({
      message: needsValidation
        ? 'Document uploaded and queued for validation.'
        : 'Document processed and synced successfully.',
      document: {
        ...buildDocument({
          ...document,
          module_slug: moduleSlug,
          module_name: module.name,
        }),
        extractedFields: [
          { label: 'Module', value: module.name },
          { label: 'Document type', value: documentType },
          { label: 'OCR confidence', value: `${confidenceScore.toFixed(1)}%` },
          {
            label: 'HIS sync status',
            value: hisSynced ? 'Scheduled' : 'Awaiting QA validation',
          },
          ...(notes ? [{ label: 'Operator notes', value: notes }] : []),
        ],
        validation: validationRecord
          ? {
              id: validationRecord.id,
              status: validationRecord.status,
              priority: validationRecord.priority,
              dueAt: validationRecord.due_at,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('[server] Error processing request', error);
  const status = error.status || error.statusCode || 500;
  res.status(status).json({
    error: error.message || 'Unexpected server error',
  });
});

const server = app.listen(config.server.port, () => {
  console.log(`API server listening on port ${config.server.port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('HTTP server closed gracefully');
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('HTTP server interrupted and closed');
    process.exit(0);
  });
});

export default app;

