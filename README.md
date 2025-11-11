# DocuHealth AI Platform

DocuHealth AI pairs a Vite + React front-end with an Express API to orchestrate medical document digitisation. It surfaces live
KPIs for hospital administrators, brokers OCR processing through Google Cloud Document AI, and persists operational telemetry
inside PostgreSQL for auditability.

## Prerequisites

* Node.js 18+
* npm 9+
* PostgreSQL 13+ (cloud-hosted or local)
* Google Cloud project with Document AI (optional for demo mode, required for real OCR processing)

## Getting started

### 1. Install dependencies

> **Note**
> Installing the Google Cloud SDK packages requires access to the public npm registry. If installation fails with `403 Forbidden`
or connectivity errors, retry on a network that allows access to `@google-cloud/*` packages.

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file (already ignored by git) with the required secrets.

#### Core server configuration

Set one of the following database connection options:

```
# Option A: single connection string
DATABASE_URL=postgres://user:password@host:5432/docuhealth

# Option B: discrete parameters
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=docuhealth
DB_SSL=false
```

Document AI variables are optional if you only want to explore the dashboard seeded data. Provide them to enable live OCR
processing:

```
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
DOC_AI_PROJECT_ID=your-gcp-project
DOC_AI_LOCATION=us
DOC_AI_PROCESSOR_ID=xxxxxxxxxxxxxxxx
DOC_AI_GCS_BUCKET=your-bucket-name           # required for >10 MB uploads and batch jobs
DOC_AI_GCS_OUTPUT_PREFIX=document-ai-output # optional
DOC_AI_GCS_UPLOAD_PREFIX=document-ai-uploads # optional
DOC_AI_SYNC_UPLOAD_LIMIT_BYTES=10485760      # optional override (default 10 MB)
```

### 3. Start the stack

Run the React dev server and the Express API together:

```bash
npm run dev
```

* React (Vite) – http://localhost:5173
* Express API – http://localhost:4000

Set `VITE_API_BASE` in `.env` (e.g. `VITE_API_BASE=http://localhost:4000/api`) if you host the API elsewhere.

To run the services independently:

```bash
npm run dev:client   # React app only
npm run dev:server   # Express API only
```

The API automatically initialises the PostgreSQL schema on boot and seeds demo data for dashboards when the tables are empty. If
you prefer a clean database, clear the seeded rows after the first run.

### 4. Production build

Create an optimised production bundle:

```bash
npm run build
```

Preview the production assets locally:

```bash
npm run preview
```

## Architecture overview

* **Front-end** – Medical operations cockpit with modules for document scanning, uploads, medicine stock audits, OPD/IPD form
digitisation, lab reports, and audit trails. The UI mirrors the DocuHealth AI dashboard concept shared in design discussions.
* **API** – Express service exposing REST endpoints for dashboard metrics, workflow management, Document AI processing, and
request intake.
* **Database** – PostgreSQL storing `document_scans`, `medicine_stock_events`, `lab_reports`, `audit_logs`, and
`feature_requests`. Seed data simulates a typical hospital day (120 documents scanned, 10 pending validations, 95% accuracy).

## API reference

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Liveness probe. |
| GET | `/api/dashboard` | Aggregated KPI snapshot for the dashboard cards, QC queue, and velocity trend. |
| GET | `/api/features` | Returns the automation catalogue with headline metrics per module. |
| GET | `/api/features/:featureId` | Detailed analytics for a module (recent scans, lab reports, audit logs, etc.). |
| POST | `/api/features/:featureId/actions/launch` | Logs a workflow trigger in the audit trail. |
| POST | `/api/requests` | Persists a workflow enhancement request (`featureId`, requester details, notes). |
| POST | `/api/process` | Submits a PDF/TIFF upload (`file` field) or GCS URI for OCR. Automatically queues batch jobs when files
exceed the synchronous limit and records the transaction in PostgreSQL. Optional fields: `documentType`, `department`,
`validationDueHours`, `ingestionChannel`. |
| GET | `/api/processors` | Lists Document AI processors (requires Document AI configuration). |
| GET | `/api/processors/:processorId/versions` | Lists processor versions for audit/rollout tooling. |
| GET | `/api/operations?name=<operation>` | Polls long-running Document AI batch jobs. |

All error responses are JSON, making it safe for the front-end to surface messages. When Document AI is not configured the OCR
endpoints return `503 Service Unavailable` with a descriptive error.

## Database schema (excerpt)

The API auto-migrates on startup. Key tables:

* `document_scans` – capture each ingest (source channel, department, accuracy score, HIS sync status, validation SLA).
* `medicine_stock_events` – pharmacy stock discrepancies and expiry signals.
* `lab_reports` – digitisation state for lab investigations.
* `audit_logs` – immutable timeline of automation activity and operator actions.
* `feature_requests` – backlog of requested workflows from hospital stakeholders.

## Front-end modules

1. **Dashboard overview** – Summary cards, validation queue, and seven-day digitisation velocity trend.
2. **Document Scanner** – Upload form for OPD/IPD batches, QC queue visibility, recent scans, and trend analytics.
3. **Upload Scans** – Handles historical/legacy scan ingestion with queue monitoring.
4. **Medicine Stock Parser** – Flags discrepancies and expiring batches from pharmacy stock sheets.
5. **OPD/IPD Form Digitization** – Tracks inpatient/outpatient digitisation throughput and accuracy.
6. **Lab Reports Digitization** – Shows lab report statuses and HIS synchronisation signals.
7. **Audit Logs** – Chronological automation timeline with launch and request events.

Each module consumes the REST API and refreshes after uploads/requests to keep the metrics live.

## Troubleshooting

* **Package install fails (403)** – Use a network that permits access to the Google Cloud npm registry or mirror the packages.
* **Database connection errors** – Ensure the Postgres credentials are correct and the user has privileges to create tables.
* **Document AI disabled** – OCR endpoints will respond with 503 until `DOC_AI_*` variables are supplied. The rest of the
platform, including the seeded analytics, remains accessible.

## License

MIT
