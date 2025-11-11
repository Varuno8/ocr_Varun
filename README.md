# DocuHealth AI Dashboard

DocuHealth AI is a React + Vite single page application for OCR functionality for medical patients, paired with an Express API that brokers requests to Google Cloud Document AI. It visualises document digitisation KPIs for government medical institutions and exposes production-ready endpoints for processing documents through Document AI.

## Prerequisites

* Node.js 18+
* npm 9+

## Getting started

### Local development

Install dependencies (front-end + API share a single `package.json`).

> **Note**
> Installing the Google Cloud SDK packages requires access to the public npm registry. If installation is blocked by a 403 or connectivity error, retry on a network that allows access to `@google-cloud/*` packages.

```bash
npm install
```

Run the React dev server and the Express API together:

```bash
npm run dev
```

By default this starts:

* Vite on http://localhost:5173
* Express API on http://localhost:4000

The React app proxies requests directly to `http://localhost:4000/api` (you can customise the base URL with `VITE_API_BASE`).

The dev server prints a local URL (usually `http://localhost:5173`) that you can open in your browser.

To run either service independently:

```bash
npm run dev:client   # React app only
npm run dev:server   # Express API only
```

Stop any running dev servers with `Ctrl+C`.

### Building for production

Create an optimised production build with:

```bash
npm run build
```

The compiled assets are emitted into the `dist/` directory. You can preview the production build locally with:

```bash
npm run preview
```

## Backend configuration

Populate the following environment variables before starting the API. They can be stored in a `.env` file (already ignored from git) for local development:

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | Absolute path to a Google Cloud service account key with Document AI and Storage access. |
| `DOC_AI_PROJECT_ID` | Yes | Google Cloud project ID where Document AI is enabled. |
| `DOC_AI_LOCATION` | Yes | Document AI location/region (for example `us` or `us-document-ai`). |
| `DOC_AI_PROCESSOR_ID` | Yes | Processor identifier to run by default. |
| `DOC_AI_GCS_BUCKET` | Recommended | Cloud Storage bucket for staging large documents and writing batch results. Required for files over the synchronous limit. |
| `DOC_AI_GCS_OUTPUT_PREFIX` | No | Folder/prefix inside the bucket for batch outputs (defaults to `document-ai-output`). |
| `DOC_AI_GCS_UPLOAD_PREFIX` | No | Folder/prefix for uploaded files (defaults to `document-ai-uploads`). |
| `DOC_AI_SYNC_UPLOAD_LIMIT_BYTES` | No | Override the synchronous processing size threshold (default 10 MB). |

## API reference

The backend exposes scalable endpoints that proxy Google Cloud Document AI:

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Health probe for uptime checks. |
| GET | `/api/config/doc-ai` | Returns sanitized Document AI configuration metadata. |
| GET | `/api/processors` | Lists processors available in the configured project/location. |
| GET | `/api/processors/:processorId/versions` | Lists processor versions for the supplied processor ID. |
| GET | `/api/operations?name=<operationName>` | Retrieves the status of a long-running batch process. |
| POST | `/api/process` | Processes an uploaded file (`multipart/form-data` field `file`) or an existing `gcsUri`. Automatically escalates to asynchronous batch processing when the document exceeds the synchronous size limit. Include `sync=true` to force a synchronous attempt when providing a `gcsUri` (fails fast if the document is too large). |

JSON responses include normalised Document AI data for downstream consumption.