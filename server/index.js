import express from 'express';
import cors from 'cors';
import multer from 'multer';

import config, { validateConfig } from './config.js';
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
  });
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
    const { gcsUri, mimeType, sync } = req.body;
    const resolvedMimeType = mimeType || req.file?.mimetype || 'application/pdf';

    if (gcsUri) {
      if (parseBoolean(sync)) {
        const result = await processDocumentFromGcs({ gcsUri, mimeType: resolvedMimeType });
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

    res.json({ mode: 'inline', result });
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

import { getClient } from './services/documentAiService.js';

// Dashboard - system health + Document AI stats
app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const client = getClient();

    // List processors (actual API call)
    const [processors] = await client.listProcessors({
      parent: `projects/${config.docAi.projectId}/locations/${config.docAi.location}`,
    });

    const processorCount = processors.length;
    const activeProcessors = processors.filter(p => p.state === 'ENABLED').length;

    res.json({
      status: 'Operational',
      lastUpdated: new Date().toISOString(),
      stats: [
        { id: 'processors', label: 'Total processors', value: processorCount },
        { id: 'active', label: 'Active', value: activeProcessors },
      ],
      operations: processors.map(p => p.displayName),
    });
  } catch (err) {
    next(err);
  }
});

// Features list - all processors from Document AI
app.get('/api/features', async (_req, res, next) => {
  try {
    const client = getClient();
    const [processors] = await client.listProcessors({
      parent: `projects/${config.docAi.projectId}/locations/${config.docAi.location}`,
    });

    const features = processors.map((p) => ({
      id: p.name.split('/').pop(),
      name: p.displayName,
      summary: p.type,
      status: p.state === 'ENABLED' ? 'Operational' : 'Disabled',
      icon: '📄',
      lastRun: new Date(p.createTime.seconds * 1000).toLocaleString(),
    }));

    res.json({ features });
  } catch (err) {
    next(err);
  }
});

// Single feature details
app.get('/api/features/:id', async (req, res, next) => {
  try {
    const client = getClient();
    const processorId = req.params.id;

    const [versions] = await client.listProcessorVersions({
      parent: `projects/${config.docAi.projectId}/locations/${config.docAi.location}/processors/${processorId}`,
    });

    res.json({
      id: processorId,
      name: `Processor ${processorId}`,
      description: 'Google Document AI Processor',
      status: 'Operational',
      metrics: [
        { label: 'Versions', value: versions.length },
        { label: 'Last Updated', value: new Date().toLocaleString() },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// Launch a processor action (e.g., process sample doc)
app.post('/api/features/:id/actions/launch', async (req, res, next) => {
  try {
    const processorId = req.params.id;
    const client = getClient();

    // Perform a dry-run to ensure connectivity
    await client.getProcessor({
      name: `projects/${config.docAi.projectId}/locations/${config.docAi.location}/processors/${processorId}`,
    });

    res.json({ message: `Processor ${processorId} validated and ready to process documents.` });
  } catch (err) {
    next(err);
  }
});

