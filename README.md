# DocuHealth AI Dashboard

DocuHealth AI is a React + Vite single page application for OCR functionality for medical patients, paired with a lightweight Express API. It visualises document digitisation KPIs for government medical institutions and exposes sample endpoints for interactive demos.

## Prerequisites

* Node.js 18+
* npm 9+

## Getting started

### Local development

Install dependencies (front-end + API share a single `package.json`):

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

## API reference

The demo API responds with static, mock data suitable for front-end integration and UI testing.

| Method | Path                                   | Description                         |
| ------ | -------------------------------------- | ----------------------------------- |
| GET    | `/api/health`                          | Basic health probe                   |
| GET    | `/api/dashboard`                       | Dashboard stats + operations feed    |
| GET    | `/api/features`                        | List of modules/workflows            |
| GET    | `/api/features/:id`                    | Detailed telemetry for a module      |
| POST   | `/api/features/:id/actions/launch`     | Simulate launching a module          |
| POST   | `/api/requests`                        | Submit a support/workflow request    |

All endpoints return JSON responses.