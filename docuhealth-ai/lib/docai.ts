import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

// Ensure env vars are present
const requiredEnvVars = [
    'GOOGLE_APPLICATION_CREDENTIALS',
    'DOC_AI_PROJECT_ID',
    'DOC_AI_LOCATION',
    'DOC_AI_PROCESSOR_ID',
    'DOC_AI_GCS_BUCKET'
];

// We only check these on the server side
if (typeof window === 'undefined') {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.warn(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

const projectId = process.env.DOC_AI_PROJECT_ID;
const location = process.env.DOC_AI_LOCATION;
const processorId = process.env.DOC_AI_PROCESSOR_ID;
const gcsBucketName = process.env.DOC_AI_GCS_BUCKET;

const client = new DocumentProcessorServiceClient();
const storage = new Storage();

export async function processInline(content: Buffer, mimeType: string): Promise<{ text: string; method: string }> {
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Encode image to base64
    const encodedImage = content.toString('base64');

    const request = {
        name,
        rawDocument: {
            content: encodedImage,
            mimeType,
        },
    };

    const [result] = await client.processDocument(request);
    const { document } = result;
    const text = document?.text || '';

    return { text, method: 'Inline' };
}

export async function processPdfBatchViaGCS(buffer: Buffer, filename: string, mimeType: string): Promise<{ text: string; method: string }> {
    // 1. Upload to GCS
    const bucket = storage.bucket(gcsBucketName!);
    const gcsFileName = `uploads/${Date.now()}-${filename}`;
    const file = bucket.file(gcsFileName);

    await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
    });

    const gcsUri = `gs://${gcsBucketName}/${gcsFileName}`;
    const outputGcsPrefix = `gs://${gcsBucketName}/results/${Date.now()}-${filename}/`;

    // 2. Batch Process
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const request = {
        name,
        inputDocuments: {
            gcsDocuments: {
                documents: [
                    {
                        gcsUri,
                        mimeType,
                    },
                ],
            },
        },
        documentOutputConfig: {
            gcsOutputConfig: {
                gcsUri: outputGcsPrefix,
            },
        },
    };

    // Note: batchProcessDocument is a long-running operation. 
    // For a real production app, we'd return a job ID and poll for status.
    // For this demo, we'll await the operation (which might timeout for very large files in a serverless fn).
    const [operation] = await client.batchProcessDocuments(request);
    await operation.promise();

    // 3. Read results from GCS
    // The output is a JSON file in the output bucket
    const [files] = await bucket.getFiles({ prefix: `results/${Date.now()}-${filename}/` });

    let fullText = '';

    for (const outputFile of files) {
        if (outputFile.name.endsWith('.json')) {
            const [content] = await outputFile.download();
            const json = JSON.parse(content.toString());
            if (json.text) {
                fullText += json.text;
            }
        }
    }

    return { text: fullText, method: 'Batch GCS' };
}
