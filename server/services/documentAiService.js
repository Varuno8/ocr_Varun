import crypto from 'crypto';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import config from '../config.js';
import { downloadFileToBuffer } from './storageService.js';

let client;

const getClient = () => {
  if (!client) {
    client = new DocumentProcessorServiceClient();
  }
  return client;
};

const processorName = (processorId = config.docAi.processorId) =>
  `projects/${config.docAi.projectId}/locations/${config.docAi.location}/processors/${processorId}`;

const parentPath = `projects/${config.docAi.projectId}/locations/${config.docAi.location}`;

const formatEntities = (entities = []) =>
  entities.map((entity) => ({
    id: entity.id,
    type: entity.type,
    mentionText: entity.mentionText,
    confidence: entity.confidence,
    normalizedValue: entity.normalizedValue,
    pageAnchor: entity.pageAnchor,
  }));

const formatPages = (pages = []) =>
  pages.map((page, index) => ({
    pageNumber: page.pageNumber ?? index + 1,
    dimension: page.dimension,
    imageQualityScores: page.imageQualityScores,
    layoutConfidence: page.layoutConfidence,
  }));

const buildProcessResponse = (result) => {
  const { document, humanReviewStatus, entities } = result;
  return {
    document: document
      ? {
          text: document.text,
          pages: formatPages(document.pages),
          entities: formatEntities(document.entities),
        }
      : null,
    entities: formatEntities(entities),
    humanReviewStatus,
  };
};

export const processInlineDocument = async ({ content, mimeType }) => {
  const request = {
    name: processorName(),
    rawDocument: {
      content: content.toString('base64'),
      mimeType,
    },
  };

  const [result] = await getClient().processDocument(request);
  return buildProcessResponse(result);
};

export const processDocumentFromGcs = async ({ gcsUri, mimeType }) => {
  const { buffer, mimeType: detectedMimeType } = await downloadFileToBuffer(gcsUri);
  if (buffer.length > config.docAi.syncUploadLimitBytes) {
    const error = new Error(
      'Document exceeds synchronous processing limit. Remove sync=true to trigger batch processing.',
    );
    error.status = 400;
    throw error;
  }
  return processInlineDocument({ content: buffer, mimeType: mimeType || detectedMimeType });
};

export const batchProcessDocument = async ({ gcsInputUri, outputBucket, outputPrefix, mimeType }) => {
  const outputUriPrefix = `gs://${outputBucket}/${outputPrefix}/${Date.now()}-${crypto.randomUUID()}/`;

  const request = {
    name: processorName(),
    inputDocuments: {
      gcsDocuments: {
        documents: [
          {
            gcsUri: gcsInputUri,
            mimeType,
          },
        ],
      },
    },
    outputConfig: {
      gcsOutputConfig: {
        gcsUri: outputUriPrefix,
      },
    },
  };

  const [operation] = await getClient().batchProcessDocuments(request);

  return {
    operationName: operation.name,
    outputUriPrefix,
  };
};

export const listProcessors = async () => {
  const [processors] = await getClient().listProcessors({ parent: parentPath });
  return processors.map((processor) => ({
    name: processor.name,
    displayName: processor.displayName,
    type: processor.type,
    state: processor.state,
    defaultProcessorVersion: processor.defaultProcessorVersion,
    createTime: processor.createTime,
    kmsKeyName: processor.kmsKeyName,
  }));
};

export const listProcessorVersions = async (processorId = config.docAi.processorId) => {
  const [versions] = await getClient().listProcessorVersions({
    parent: processorName(processorId),
  });

  return versions.map((version) => ({
    name: version.name,
    displayName: version.displayName,
    state: version.state,
    createTime: version.createTime,
    kmsKeyName: version.kmsKeyName,
  }));
};

export const getOperation = async (name) => {
  if (!name) {
    throw new Error('Operation name is required');
  }

  const [operation] = await getClient().operationsClient.getOperation({ name });
  return operation;
};
