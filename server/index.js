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
