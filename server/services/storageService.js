import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import config from '../config.js';

let storageClient;

const getStorageClient = () => {
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
};

export const parseGcsUri = (gcsUri) => {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(gcsUri);
  if (!match) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }

  return { bucketName: match[1], objectName: match[2] };
};

export const uploadBufferToBucket = async ({ buffer, filename, mimeType }) => {
  if (!config.docAi.gcsBucket) {
    throw new Error('DOC_AI_GCS_BUCKET must be configured to upload large files to Cloud Storage.');
  }

  const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blobName = `${config.docAi.uploadPrefix}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const bucket = getStorageClient().bucket(config.docAi.gcsBucket);
  const file = bucket.file(blobName);

  await file.save(buffer, {
    contentType: mimeType,
    resumable: buffer.length > 5 * 1024 * 1024,
    validation: 'crc32c',
  });

  return {
    gcsUri: `gs://${config.docAi.gcsBucket}/${blobName}`,
    blobName,
  };
};

export const downloadFileToBuffer = async (gcsUri) => {
  const { bucketName, objectName } = parseGcsUri(gcsUri);
  const file = getStorageClient().bucket(bucketName).file(objectName);

  const [[contents], [metadata]] = await Promise.all([
    file.download(),
    file.getMetadata().catch(() => [{ contentType: 'application/octet-stream' }]),
  ]);

  return {
    buffer: contents,
    mimeType: metadata.contentType || 'application/octet-stream',
  };
};
