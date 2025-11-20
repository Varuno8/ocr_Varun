# DocuHealth AI

AI-Powered Document Digitization for Government Medical Institutions.

## Features

- **Google Document AI Integration**: High-accuracy OCR for medical documents.
- **Next.js 14 App Router**: Modern, fast, and scalable frontend/backend.
- **PostgreSQL + Prisma**: Robust data persistence.
- **Modern UI**: Clean, iOS-style dashboard with Tailwind CSS.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.local.example` to `.env.local` and fill in your Google Cloud and Database credentials.
   ```bash
   cp .env.local.example .env.local
   ```

   **Required Variables:**
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Service Account JSON key.
   - `DOC_AI_PROJECT_ID`: GCP Project ID.
   - `DOC_AI_LOCATION`: Processor location (e.g., `us`).
   - `DOC_AI_PROCESSOR_ID`: Document AI Processor ID.
   - `DOC_AI_GCS_BUCKET`: GCS Bucket for batch processing (large PDFs).
   - `DATABASE_URL`: PostgreSQL connection string.

3. **Database Setup**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push schema to DB
   npx prisma migrate dev --name init

   # Seed initial data
   npx prisma db seed
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Architecture

- **Frontend**: React components in `components/`, pages in `app/`.
- **Backend**: API routes in `app/api/`.
- **OCR Logic**: `lib/docai.ts` handles interactions with Google Document AI.
- **Database**: `lib/db.ts` provides the Prisma client instance.

## License

Private / Proprietary.
