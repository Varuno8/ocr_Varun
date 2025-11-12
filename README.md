# DocuHealth AI Dashboard

DocuHealth AI is a React + Vite single page application for digitising medical paperwork, paired with an Express API backed by PostgreSQL. It visualises document throughput, validation queues, medicine stock alerts, and compliance activity for government medical institutions while exposing endpoints for uploading scans and querying operational telemetry.

## Prerequisites

* Node.js 18+
* npm 9+

## Getting started

### Local development

Install dependencies (front-end + API share a single `package.json`).

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
| `DATABASE_URL` | No | PostgreSQL connection string. When omitted the API falls back to an in-memory database seeded with demo data. |
| `PGSSLMODE` | No | Set to `require` when connecting to a managed Postgres instance that needs TLS. |
| `PORT` | No | HTTP port for the Express API (defaults to `4000`). |
| `UPLOAD_MAX_MB` | No | Override the maximum upload size in megabytes for OCR scans (defaults to `25`). |

### PostgreSQL initialisation

When a real PostgreSQL connection string is provided the server automatically creates the required tables on startup. Seed data is inserted only when the `modules` table is empty, making it safe to point the API at an existing database. The schema covers modules, documents, validations, audit logs, and pharmacy stock levels.

## API reference

The backend exposes REST endpoints tailored to the medical OCR workflow:

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Health probe with database status. |
| GET | `/api/dashboard` | Aggregated KPIs including daily scans, pending validations, medicine stock, and recent documents. |
| GET | `/api/modules` | Summary list of OCR modules with status, accuracy, and supported document types. |
| GET | `/api/modules/:slug` | Detailed telemetry, metrics, and contacts for a specific module. |
| GET | `/api/audit-logs` | Recent audit events covering HIS syncs, overrides, and compliance exports. |
| POST | `/api/documents` | Upload a new scan (`multipart/form-data` with `file`) and queue it for OCR/validation. |

All responses are JSON. Uploads exceeding the configured confidence threshold create pending validation tickets automatically, keeping the validation queue and dashboard metrics in sync.

### Performance instrumentation

Every request is timed and surfaced via standard headers to help diagnose slow endpoints during demos or production pilots:

* `X-Response-Time` exposes the end-to-end processing time in milliseconds.
* `Server-Timing: app;dur=…` can be read by browsers and observability tooling for waterfall charts.

The Express server also logs a concise line per request with the HTTP method, path, status code, and duration (e.g. `[server] GET /api/dashboard 200 42.1ms`).
