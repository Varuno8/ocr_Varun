import express from 'express';
import cors from 'cors';
import multer from 'multer';

import config, { validateConfig } from './config.js';
import { initDb } from './db.js';
import {
  getDashboardSnapshot,
  getFeatureCatalogue,
  getFeatureDetail,
  createFeatureRequest,
  recordFeatureLaunch,
  recordDocumentScan,
  getFeatureDefinition,
} from './repositories/analyticsRepository.js';
import {
  processInlineDocument,
  processDocumentFromGcs,
  batchProcessDocument,
  listProcessors,
  listProcessorVersions,
  getOperation,
} from './services/documentAiService.js';
import { uploadBufferToBucket } from './services/storageService.js';

validateConfig();

await initDb().catch((error) => {
  console.error('[server] Failed to initialise database', error);
  process.exit(1);
});

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB upper bound; larger files should stream via GCS
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
};

const parseInteger = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const computeAccuracyScore = (result) => {
  const confidences = [
    ...(result?.document?.entities?.map((entity) => entity.confidence).filter((v) => typeof v === 'number') || []),
    ...(result?.entities?.map((entity) => entity.confidence).filter((v) => typeof v === 'number') || []),
  ];

  if (!confidences.length) {
    return result?.humanReviewStatus?.state === 'rejected' ? 0.5 : 0.95;
  }

  const total = confidences.reduce((acc, value) => acc + value, 0);
  return Math.round((total / confidences.length) * 1000) / 1000;
};

const resolveValidationDueAt = ({ validationDueAt, validationDueHours }) => {
  if (validationDueAt) {
    const date = new Date(validationDueAt);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const hours = Number.parseFloat(validationDueHours);
  const effectiveHours = Number.isNaN(hours) ? 8 : hours;
  return new Date(Date.now() + effectiveHours * 60 * 60 * 1000);
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config/doc-ai', (_req, res) => {
  res.json({
    projectId: config.docAi.projectId,
    location: config.docAi.location,
    processorId: config.docAi.processorId,
    gcsBucketConfigured: Boolean(config.docAi.gcsBucket),
    syncUploadLimitBytes: config.docAi.syncUploadLimitBytes,
    enabled: config.docAi.enabled,
  });
});

app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const snapshot = await getDashboardSnapshot();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.get('/api/features', async (_req, res, next) => {
  try {
    const features = await getFeatureCatalogue();
    res.json({ features });
  } catch (error) {
    next(error);
  }
});

app.get('/api/features/:featureId', async (req, res, next) => {
  try {
    const { featureId } = req.params;
    const definition = getFeatureDefinition(featureId);
    if (!definition) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    const detail = await getFeatureDetail(featureId);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

app.post('/api/features/:featureId/actions/launch', async (req, res, next) => {
  try {
    const { featureId } = req.params;
    const definition = getFeatureDefinition(featureId);
    if (!definition) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    await recordFeatureLaunch({ featureId, actor: 'admin.console' });
    res.json({ message: `${definition.title} workflow triggered.` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/requests', async (req, res, next) => {
  try {
    const { featureId, requesterName, department, priority, notes } = req.body || {};

    if (!featureId || !getFeatureDefinition(featureId)) {
      return res.status(400).json({ error: 'A valid featureId is required.' });
    }
    if (!requesterName) {
      return res.status(400).json({ error: 'Requester name is required.' });
    }

    await createFeatureRequest({ featureId, requesterName, department, priority, notes });

    res.status(201).json({
      message: 'Request submitted to the DocuHealth AI operations team.',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/processors', async (_req, res, next) => {
  try {
    const processors = await listProcessors();
    res.json({ processors });
  } catch (error) {
    next(error);
  }
});

app.get('/api/processors/:processorId/versions', async (req, res, next) => {
  try {
    const versions = await listProcessorVersions(req.params.processorId);
    res.json({ versions });
  } catch (error) {
    next(error);
  }
});

app.get('/api/operations', async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Query parameter "name" is required' });
    }

    const operation = await getOperation(name);
    res.json({ operation });
  } catch (error) {
    next(error);
  }
});

app.post('/api/process', upload.single('file'), async (req, res, next) => {
  try {
    const { gcsUri, mimeType, sync, documentType, department, ingestionChannel, validationDueAt, validationDueHours } =
      req.body;
    const resolvedMimeType = mimeType || req.file?.mimetype || 'application/pdf';
    const channel = ingestionChannel || (gcsUri ? 'gcs' : req.file ? 'scanner' : 'upload');
    const scanVolume = parseInteger(req.body?.scanVolume, 1);

    if (gcsUri) {
      if (parseBoolean(sync)) {
        const result = await processDocumentFromGcs({ gcsUri, mimeType: resolvedMimeType });
        const accuracyScore = computeAccuracyScore(result);
        await recordDocumentScan({
          documentName: req.body.documentName || gcsUri,
          documentType: documentType || 'general',
          department,
          ingestionChannel: channel,
          status: 'completed',
          accuracyScore,
          scanVolume,
          validationDueAt: resolveValidationDueAt({ validationDueAt, validationDueHours }),
        metadata: { source: channel, operation: 'inline' },
        });
        return res.json({ mode: 'gcs-inline', result });
      }

      if (!config.docAi.gcsBucket) {
        return res.status(400).json({
          error:
            'Batch processing from a GCS URI requires DOC_AI_GCS_BUCKET to be configured for output.',
        });
      }

      const batch = await batchProcessDocument({
        gcsInputUri: gcsUri,
        outputBucket: config.docAi.gcsBucket,
        outputPrefix: config.docAi.outputPrefix,
        mimeType: resolvedMimeType,
      });

      await recordDocumentScan({
        documentName: req.body.documentName || gcsUri,
        documentType: documentType || 'general',
        department,
        ingestionChannel: channel,
        status: 'queued',
        scanVolume,
        validationDueAt: resolveValidationDueAt({ validationDueAt, validationDueHours }),
        metadata: { source: channel, operation: 'batch', batch },
      });

      return res.status(202).json({
        mode: 'gcs-batch',
        message: 'Batch processing has been started for the supplied GCS document.',
        inputUri: gcsUri,
        ...batch,
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'A file upload or gcsUri field is required to process a document.' });
    }

    if (req.file.size > config.docAi.syncUploadLimitBytes) {
      if (!config.docAi.gcsBucket) {
        return res.status(400).json({
          error:
            'Uploaded file exceeds synchronous processing limit. Configure DOC_AI_GCS_BUCKET to enable batch processing for large files.',
        });
      }

      const { gcsUri: uploadedUri } = await uploadBufferToBucket({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: resolvedMimeType,
      });

      const batch = await batchProcessDocument({
        gcsInputUri: uploadedUri,
        outputBucket: config.docAi.gcsBucket,
        outputPrefix: config.docAi.outputPrefix,
        mimeType: resolvedMimeType,
      });

      await recordDocumentScan({
        documentName: req.file.originalname,
        documentType: documentType || 'general',
        department,
        ingestionChannel: channel,
        status: 'queued',
        scanVolume,
        validationDueAt: resolveValidationDueAt({ validationDueAt, validationDueHours }),
        metadata: { source: channel, operation: 'batch', batch },
      });

      return res.status(202).json({
        mode: 'batch',
        message: 'Document exceeds synchronous limit. Batch processing has been started.',
        inputUri: uploadedUri,
        ...batch,
      });
    }

    const result = await processInlineDocument({
      content: req.file.buffer,
      mimeType: resolvedMimeType,
    });

    const accuracyScore = computeAccuracyScore(result);
    const record = await recordDocumentScan({
      documentName: req.file.originalname,
      documentType: documentType || 'general',
      department,
      ingestionChannel: channel,
      status: 'completed',
      accuracyScore,
      scanVolume,
      validationDueAt: resolveValidationDueAt({ validationDueAt, validationDueHours }),
      metadata: { source: channel, operation: 'inline', humanReviewStatus: result.humanReviewStatus },
    });

    res.json({ mode: 'inline', result, record });
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
