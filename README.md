# DocuHealth AI Monorepo

Brand new build of DocuHealth AI — a premium health-tech dashboard powered by Google Document AI. The repo hosts a Next.js 15 backend (App Router) and a React 18 + Vite frontend.

## Structure
- **backend/**: Next.js App Router, Prisma ORM, Google Document AI integration, API routes under `/api`.
- **frontend/**: React + TypeScript + TailwindCSS + shadcn-inspired UI components.

## Quick start
1. Install dependencies per app:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. Run backend:
   ```bash
   cd backend && npm run dev
   ```
3. Run frontend:
   ```bash
   cd frontend && npm run dev
   ```

## Environment
Create `backend/.env` with:
```
GOOGLE_APPLICATION_CREDENTIALS=path/to/ocrvarun-6b2c2d17608a.json
DOC_AI_PROJECT_ID=ocrvarun
DOC_AI_LOCATION=us
DOC_AI_PROCESSOR_ID=54b437d46998c95d
DOC_AI_GCS_BUCKET=your-bucket-name
DATABASE_URL=postgresql://user:password@localhost:5432/docuhealth
```

## Database
Prisma models cover Users, Documents, Modules, AuditLogs, and ProcessingJobs with sensible indexes. Seed default modules via:
```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

## Frontend
- React Query for data fetching
- React Hook Form + Zod for validation
- TailwindCSS + shadcn-inspired primitives
- Premium dashboard layout: hero, stats, module grid, upload workspace, OCR viewer, and audit log table.
