import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import config from './config.js';

let pool;

const getPoolConfig = () => {
  if (config.database.connectionString) {
    return {
      connectionString: config.database.connectionString,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
  };
};

export const getPool = () => {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }
  return pool;
};

export const query = (text, params = []) => getPool().query(text, params);

const seedDocumentScans = async (client) => {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM document_scans');
  if (rows[0]?.count) return;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

  const documents = [
    {
      documentName: 'OPD Intake Batch',
      documentType: 'opd',
      department: 'Outpatient',
      ingestionChannel: 'scanner',
      status: 'completed',
      accuracyScore: 0.98,
      hisSynced: true,
      scanVolume: 60,
      scannedAt: now,
      validationDueAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    },
    {
      documentName: 'IPD Admission Files',
      documentType: 'ipd',
      department: 'Inpatient',
      ingestionChannel: 'scanner',
      status: 'pending_validation',
      accuracyScore: 0.93,
      hisSynced: false,
      scanVolume: 10,
      scannedAt: new Date(now.getTime() - 60 * 60 * 1000),
      validationDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    },
    {
      documentName: 'Radiology Reports',
      documentType: 'lab',
      department: 'Radiology',
      ingestionChannel: 'upload',
      status: 'processing',
      accuracyScore: 0.92,
      hisSynced: true,
      scanVolume: 24,
      scannedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      validationDueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    },
    {
      documentName: 'Pharmacy Stock Sheets',
      documentType: 'inventory',
      department: 'Pharmacy',
      ingestionChannel: 'upload',
      status: 'processing',
      accuracyScore: 0.91,
      hisSynced: true,
      scanVolume: 26,
      scannedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      validationDueAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    },
    {
      documentName: 'OPD Follow-up Forms',
      documentType: 'opd',
      department: 'Outpatient',
      ingestionChannel: 'scanner',
      status: 'completed',
      accuracyScore: 0.97,
      hisSynced: true,
      scanVolume: 28,
      scannedAt: yesterday,
      validationDueAt: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000),
    },
    {
      documentName: 'IPD Discharge Summaries',
      documentType: 'ipd',
      department: 'Inpatient',
      ingestionChannel: 'scanner',
      status: 'completed',
      accuracyScore: 0.96,
      hisSynced: true,
      scanVolume: 22,
      scannedAt: twoDaysAgo,
      validationDueAt: new Date(twoDaysAgo.getTime() + 3 * 60 * 60 * 1000),
    },
    {
      documentName: 'OPD Intake Batch',
      documentType: 'opd',
      department: 'Outpatient',
      ingestionChannel: 'scanner',
      status: 'completed',
      accuracyScore: 0.95,
      hisSynced: true,
      scanVolume: 12,
      scannedAt: threeDaysAgo,
      validationDueAt: new Date(threeDaysAgo.getTime() + 3 * 60 * 60 * 1000),
    },
    {
      documentName: 'Lab Panels - Hematology',
      documentType: 'lab',
      department: 'Laboratory',
      ingestionChannel: 'scanner',
      status: 'completed',
      accuracyScore: 0.94,
      hisSynced: true,
      scanVolume: 10,
      scannedAt: fourDaysAgo,
      validationDueAt: new Date(fourDaysAgo.getTime() + 3 * 60 * 60 * 1000),
    },
  ];

  for (const doc of documents) {
    await client.query(
      `INSERT INTO document_scans
        (id, document_name, document_type, department, ingestion_channel, status, accuracy_score, his_synced,
         scan_volume, scanned_at, validation_due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        uuidv4(),
        doc.documentName,
        doc.documentType,
        doc.department,
        doc.ingestionChannel,
        doc.status,
        doc.accuracyScore,
        doc.hisSynced,
        doc.scanVolume,
        doc.scannedAt,
        doc.validationDueAt,
      ],
    );
  }
};

const seedMedicineEvents = async (client) => {
  const { rows } = await client.query(
    'SELECT COUNT(*)::int AS count FROM medicine_stock_events',
  );
  if (rows[0]?.count) return;

  const events = [
    {
      medicineName: 'Amoxicillin 500mg',
      batchNumber: 'AMX-2309',
      expiryDate: new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000),
      quantityDetected: 120,
      discrepancyFlag: false,
    },
    {
      medicineName: 'Insulin Glargine',
      batchNumber: 'INS-2402',
      expiryDate: new Date(new Date().getTime() + 120 * 24 * 60 * 60 * 1000),
      quantityDetected: 48,
      discrepancyFlag: true,
    },
    {
      medicineName: 'Atorvastatin 20mg',
      batchNumber: 'ATR-2312',
      expiryDate: new Date(new Date().getTime() + 300 * 24 * 60 * 60 * 1000),
      quantityDetected: 200,
      discrepancyFlag: false,
    },
  ];

  for (const event of events) {
    await client.query(
      `INSERT INTO medicine_stock_events
        (id, medicine_name, batch_number, expiry_date, quantity_detected, discrepancy_flag)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        event.medicineName,
        event.batchNumber,
        event.expiryDate,
        event.quantityDetected,
        event.discrepancyFlag,
      ],
    );
  }
};

const seedLabReports = async (client) => {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM lab_reports');
  if (rows[0]?.count) return;

  const reports = [
    {
      patientName: 'S. Krishnan',
      testType: 'CBC',
      status: 'ready_for_review',
      hisSynced: true,
    },
    {
      patientName: 'A. Bhatia',
      testType: 'LFT',
      status: 'pending_validation',
      hisSynced: false,
    },
    {
      patientName: 'M. Fernandes',
      testType: 'CT Abdomen',
      status: 'processing',
      hisSynced: false,
    },
  ];

  for (const report of reports) {
    await client.query(
      `INSERT INTO lab_reports
        (id, patient_name, test_type, status, his_synced)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), report.patientName, report.testType, report.status, report.hisSynced],
    );
  }
};

const seedAuditLogs = async (client) => {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM audit_logs');
  if (rows[0]?.count) return;

  const logs = [
    {
      eventType: 'scanner.sync',
      actor: 'system',
      summary: 'Synchronized 32 OPD intake files to HIS.',
    },
    {
      eventType: 'validation.assign',
      actor: 'nurse.jyoti',
      summary: 'Assigned pending validations to quality review queue.',
    },
    {
      eventType: 'medicine.alert',
      actor: 'pharmacy.lead',
      summary: 'Flagged Insulin Glargine stock discrepancy for manual recount.',
    },
    {
      eventType: 'lab.push',
      actor: 'system',
      summary: 'Pushed 14 radiology reports to HIS.',
    },
  ];

  for (const log of logs) {
    await client.query(
      `INSERT INTO audit_logs
        (id, event_type, actor, summary)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), log.eventType, log.actor, log.summary],
    );
  }
};

export const initDb = async () => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_scans (
        id uuid PRIMARY KEY,
        document_name text NOT NULL,
        document_type text NOT NULL,
        department text,
        ingestion_channel text NOT NULL DEFAULT 'scanner',
        status text NOT NULL,
        accuracy_score numeric(5,3),
        his_synced boolean NOT NULL DEFAULT false,
        scan_volume integer NOT NULL DEFAULT 1,
        scanned_at timestamptz NOT NULL DEFAULT now(),
        validation_due_at timestamptz,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS medicine_stock_events (
        id uuid PRIMARY KEY,
        medicine_name text NOT NULL,
        batch_number text,
        expiry_date date,
        quantity_detected integer,
        discrepancy_flag boolean DEFAULT false,
        detected_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb DEFAULT '{}'::jsonb
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_reports (
        id uuid PRIMARY KEY,
        patient_name text NOT NULL,
        test_type text NOT NULL,
        status text NOT NULL,
        his_synced boolean DEFAULT false,
        detected_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb DEFAULT '{}'::jsonb
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY,
        event_type text NOT NULL,
        actor text,
        summary text NOT NULL,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_requests (
        id uuid PRIMARY KEY,
        feature_id text NOT NULL,
        requester_name text NOT NULL,
        department text,
        priority text DEFAULT 'normal',
        notes text,
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await seedDocumentScans(client);
    await seedMedicineEvents(client);
    await seedLabReports(client);
    await seedAuditLogs(client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
