import { Pool } from 'pg';
import { newDb } from 'pg-mem';

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURL;
const useSsl =
  process.env.PGSSLMODE === 'require' || process.env.DATABASE_SSL === 'true';

let pool;
let usingInMemory = false;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
} else {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'now',
    returns: 'timestamp',
    implementation: () => new Date(),
  });
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  usingInMemory = true;
}

const migrations = [
  `CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Operational',
    accuracy NUMERIC(5, 2) DEFAULT 0,
    icon TEXT,
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    his_facilities_synced INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS module_metrics (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    caption TEXT,
    UNIQUE (module_id, label)
  )`,
  `CREATE TABLE IF NOT EXISTS module_events (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    detail TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS module_next_steps (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    UNIQUE (module_id, step)
  )`,
  `CREATE TABLE IF NOT EXISTS module_contacts (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS module_document_types (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    UNIQUE (module_id, document_type)
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL,
    confidence NUMERIC(5, 2) DEFAULT 0,
    his_synced BOOLEAN DEFAULT TRUE,
    summary TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS validations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    assigned_to TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    detail TEXT,
    actor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS medicine_stock (
    id SERIAL PRIMARY KEY,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit TEXT NOT NULL,
    threshold INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
  )`
];

const seedDatabase = async () => {
  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM modules');
  if (Number(rows[0].count) > 0) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const moduleSeeds = [
      {
        slug: 'document-scanner',
        name: 'Document Scanner',
        category: 'Digitization',
        description:
          'High-speed scanning and OCR pipeline for OPD/IPD intake forms with barcode routing into the HIS.',
        status: 'Operational',
        accuracy: 96.2,
        icon: '🖨️',
        lastSyncedMinutesAgo: 12,
        hisFacilitiesSynced: 8,
        metrics: [
          { label: 'Documents processed', value: '1,240', caption: 'Last 24 hours' },
          { label: 'Average turnaround', value: '7m 40s', caption: 'From scan to HIS' },
          { label: 'Auto-triaged', value: '82%', caption: 'Forms routed without manual touch' }
        ],
        events: [
          {
            detail: 'Batch from District Hospital #14 completed with 98.4% accuracy.',
            occurredMinutesAgo: 45
          },
          {
            detail: 'Barcode service latency returned to normal after morning peak.',
            occurredMinutesAgo: 125
          }
        ],
        nextSteps: [
          'Roll out duplex scanners to OPD Block C',
          'Finalize OCR templates for the new neonatal admission form'
        ],
        contacts: [
          {
            name: 'Dr. Anika Rao',
            role: 'Medical Superintendent',
            email: 'anika.rao@govhealth.in'
          },
          {
            name: 'Mahesh Kulkarni',
            role: 'Health IT Operations',
            email: 'mahesh.kulkarni@govhealth.in',
            phone: '+91 98765 11223'
          }
        ],
        documentTypes: ['OPD Form', 'IPD Case Sheet', 'Referral Slip']
      },
      {
        slug: 'upload-scans',
        name: 'Upload Scans',
        category: 'Ingestion',
        description: 'Secure upload drop for peripheral clinics and mobile health units.',
        status: 'Operational',
        accuracy: 92.5,
        icon: '☁️',
        lastSyncedMinutesAgo: 28,
        hisFacilitiesSynced: 6,
        metrics: [
          { label: 'Clinics connected', value: '26', caption: 'Syncing nightly batches' },
          { label: 'Avg. queue time', value: '11m', caption: 'Awaiting OCR' }
        ],
        events: [
          {
            detail: 'Mobile PHC unit uploaded 42 scans from immunization drive.',
            occurredMinutesAgo: 70
          }
        ],
        nextSteps: [
          'Enable auto-tagging based on clinic IDs',
          'Pilot compression for low-bandwidth talukas'
        ],
        contacts: [
          {
            name: 'Prisha Menon',
            role: 'Field Digitization Lead',
            email: 'prisha.menon@govhealth.in'
          }
        ],
        documentTypes: ['Scan Batch', 'Legacy Case File']
      },
      {
        slug: 'medicine-stock-parser',
        name: 'Medicine Stock Parser',
        category: 'Pharmacy',
        description: 'Digitizes pharmacy stock sheets and reconciles batches with the central supply chain.',
        status: 'Operational',
        accuracy: 94.1,
        icon: '💊',
        lastSyncedMinutesAgo: 18,
        hisFacilitiesSynced: 7,
        metrics: [
          { label: 'SKUs tracked', value: '312', caption: 'Across 8 facilities' },
          { label: 'Low stock alerts', value: '9', caption: 'Triggered today' }
        ],
        events: [
          {
            detail: 'Batch 27B highlighted Ceftriaxone shortage at Civil Hospital.',
            occurredMinutesAgo: 90
          }
        ],
        nextSteps: [
          'Integrate lot expiry prediction with HIS pharmacy module',
          'Schedule reconciliation with district warehouse'
        ],
        contacts: [
          {
            name: 'Sanjay Iyer',
            role: 'Chief Pharmacist',
            email: 'sanjay.iyer@govhealth.in'
          }
        ],
        documentTypes: ['Stock Sheet', 'Drug Dispensing Log']
      },
      {
        slug: 'opd-ipd-digitization',
        name: 'OPD/IPD Form Digitization',
        category: 'Clinical Records',
        description: 'Structured capture of admission, consent, and discharge summaries for OPD/IPD workflows.',
        status: 'Operational',
        accuracy: 95.8,
        icon: '📝',
        lastSyncedMinutesAgo: 9,
        hisFacilitiesSynced: 8,
        metrics: [
          { label: 'Average accuracy', value: '95.8%', caption: 'Rolling 7 days' },
          { label: 'Manual exceptions', value: '4', caption: 'Awaiting validation' }
        ],
        events: [
          {
            detail: 'New consent form template trained for maternity ward.',
            occurredMinutesAgo: 30
          }
        ],
        nextSteps: [
          'Deploy bedside tablet capture for IPD vitals',
          'Translate discharge instructions to Marathi'
        ],
        contacts: [
          {
            name: 'Dr. Vivek Sharma',
            role: 'Clinical Informatics',
            email: 'vivek.sharma@govhealth.in'
          }
        ],
        documentTypes: ['Admission Form', 'Consent Form', 'Discharge Summary']
      },
      {
        slug: 'lab-reports-digitization',
        name: 'Lab Reports Digitization',
        category: 'Diagnostics',
        description: 'OCR for handwritten and printed lab reports with auto-flagging of critical values.',
        status: 'Degraded',
        accuracy: 91.3,
        icon: '🔬',
        lastSyncedMinutesAgo: 47,
        hisFacilitiesSynced: 5,
        metrics: [
          { label: 'Reports processed', value: '684', caption: 'Last 7 days' },
          { label: 'Critical alerts', value: '17', caption: 'Escalated to clinicians' }
        ],
        events: [
          {
            detail: 'Handwriting model retraining scheduled for biochemistry forms.',
            occurredMinutesAgo: 210
          }
        ],
        nextSteps: [
          'Validate pathology template updates with QA team',
          'Roll out dual entry verification for outlier values'
        ],
        contacts: [
          {
            name: 'Dr. Renu Kapoor',
            role: 'Pathology Lead',
            email: 'renu.kapoor@govhealth.in'
          }
        ],
        documentTypes: ['Lab Report', 'Pathology Summary']
      },
      {
        slug: 'audit-logs',
        name: 'Audit Logs & Compliance',
        category: 'Governance',
        description: 'Tracks document access, overrides, and HIS sync activity for compliance reporting.',
        status: 'Operational',
        accuracy: 99.1,
        icon: '🛡️',
        lastSyncedMinutesAgo: 5,
        hisFacilitiesSynced: 8,
        metrics: [
          { label: 'Overrides reviewed', value: '32', caption: 'This month' },
          { label: 'Access anomalies', value: '0', caption: 'Past 24 hours' }
        ],
        events: [
          {
            detail: 'Compliance export shared with State Health Mission team.',
            occurredMinutesAgo: 300
          }
        ],
        nextSteps: [
          'Enable auto-escalation for overdue validations',
          'Map HIS user roles for night shift staff'
        ],
        contacts: [
          {
            name: 'Isha Thomas',
            role: 'Compliance Officer',
            email: 'isha.thomas@govhealth.in'
          }
        ],
        documentTypes: ['Audit Event', 'Sync Report']
      }
    ];

    const moduleIdBySlug = new Map();

    for (const moduleSeed of moduleSeeds) {
      const { rows: moduleRows } = await client.query(
        `INSERT INTO modules (slug, name, category, description, status, accuracy, icon, last_synced, his_facilities_synced)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - ($8 || ' minutes')::interval, $9)
         RETURNING id`,
        [
          moduleSeed.slug,
          moduleSeed.name,
          moduleSeed.category,
          moduleSeed.description,
          moduleSeed.status,
          moduleSeed.accuracy,
          moduleSeed.icon,
          moduleSeed.lastSyncedMinutesAgo,
          moduleSeed.hisFacilitiesSynced
        ]
      );
      const moduleId = moduleRows[0].id;
      moduleIdBySlug.set(moduleSeed.slug, moduleId);

      for (const metric of moduleSeed.metrics) {
        await client.query(
          `INSERT INTO module_metrics (module_id, label, value, caption)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (module_id, label) DO UPDATE SET value = EXCLUDED.value, caption = EXCLUDED.caption`,
          [moduleId, metric.label, metric.value, metric.caption]
        );
      }

      for (const event of moduleSeed.events) {
        await client.query(
          `INSERT INTO module_events (module_id, detail, occurred_at)
           VALUES ($1, $2, NOW() - ($3 || ' minutes')::interval)`,
          [moduleId, event.detail, event.occurredMinutesAgo]
        );
      }

      for (const step of moduleSeed.nextSteps) {
        await client.query(
          `INSERT INTO module_next_steps (module_id, step)
           VALUES ($1, $2)
           ON CONFLICT (module_id, step) DO NOTHING`,
          [moduleId, step]
        );
      }

      for (const contact of moduleSeed.contacts) {
        await client.query(
          `INSERT INTO module_contacts (module_id, name, role, email, phone)
           VALUES ($1, $2, $3, $4, $5)`,
          [moduleId, contact.name, contact.role, contact.email, contact.phone || null]
        );
      }

      for (const documentType of moduleSeed.documentTypes) {
        await client.query(
          `INSERT INTO module_document_types (module_id, document_type)
           VALUES ($1, $2)
           ON CONFLICT (module_id, document_type) DO NOTHING`,
          [moduleId, documentType]
        );
      }
    }

    const documentSeeds = [
      {
        moduleSlug: 'document-scanner',
        title: 'OPD Intake - Ramesh Patel',
        documentType: 'OPD Form',
        fileName: 'opd_ramesh_patol.pdf',
        mimeType: 'application/pdf',
        status: 'Validated',
        confidence: 97.2,
        hisSynced: true,
        summary: 'Patient GH-9821 triaged to Orthopedics with priority green.',
        uploadedBy: 'Nurse Radhika',
        uploadedMinutesAgo: 30
      },
      {
        moduleSlug: 'medicine-stock-parser',
        title: 'Pharmacy Stock - Ward 5',
        documentType: 'Stock Sheet',
        fileName: 'ward5_stock_2024-06-01.csv',
        mimeType: 'text/csv',
        status: 'Validated',
        confidence: 93.4,
        hisSynced: true,
        summary: 'Ceftriaxone vials below reorder level; escalated to procurement.',
        uploadedBy: 'Pharmacist Leena',
        uploadedMinutesAgo: 95
      },
      {
        moduleSlug: 'opd-ipd-digitization',
        title: 'IPD Consent - Baby Aarav',
        documentType: 'Consent Form',
        fileName: 'consent_aarav.jpeg',
        mimeType: 'image/jpeg',
        status: 'Pending Validation',
        confidence: 88.9,
        hisSynced: false,
        summary: 'Awaiting guardian signature verification before HIS sync.',
        uploadedBy: 'Resident Dr. Pooja',
        uploadedMinutesAgo: 140
      },
      {
        moduleSlug: 'lab-reports-digitization',
        title: 'Lab Report - Hemogram (Suhana)',
        documentType: 'Lab Report',
        fileName: 'hemogram_suhana.tif',
        mimeType: 'image/tiff',
        status: 'Validated',
        confidence: 91.1,
        hisSynced: true,
        summary: 'Critical platelet count flagged and sent to duty doctor.',
        uploadedBy: 'Lab Tech Arun',
        uploadedMinutesAgo: 220
      },
      {
        moduleSlug: 'document-scanner',
        title: 'OPD Intake - Lata Desai',
        documentType: 'OPD Form',
        fileName: 'opd_lata_desai.pdf',
        mimeType: 'application/pdf',
        status: 'Validated',
        confidence: 96.5,
        hisSynced: true,
        summary: 'Auto-tagged to Gynecology with follow-up reminder.',
        uploadedBy: 'Nurse Vimal',
        uploadedMinutesAgo: 15
      },
      {
        moduleSlug: 'upload-scans',
        title: 'Legacy Case File - Cardiology',
        documentType: 'Legacy Case File',
        fileName: 'cardio_case_118.zip',
        mimeType: 'application/zip',
        status: 'Queued',
        confidence: 0,
        hisSynced: false,
        summary: 'Queued for background OCR (6 documents pending).',
        uploadedBy: 'Data Entry Desk',
        uploadedMinutesAgo: 8
      }
    ];

    const documentIdByTitle = new Map();

    for (const doc of documentSeeds) {
      const moduleId = moduleIdBySlug.get(doc.moduleSlug) || null;
      const { rows: inserted } = await client.query(
        `INSERT INTO documents (module_id, title, document_type, file_name, mime_type, status, confidence, his_synced, summary, uploaded_by, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - ($11 || ' minutes')::interval)
         RETURNING id`,
        [
          moduleId,
          doc.title,
          doc.documentType,
          doc.fileName,
          doc.mimeType,
          doc.status,
          doc.confidence,
          doc.hisSynced,
          doc.summary,
          doc.uploadedBy,
          doc.uploadedMinutesAgo
        ]
      );
      documentIdByTitle.set(doc.title, inserted[0].id);
    }

    const validationSeeds = [
      {
        documentTitle: 'IPD Consent - Baby Aarav',
        assignedTo: 'QA Nurse Team',
        status: 'pending',
        priority: 'high',
        dueMinutesAhead: 120
      },
      {
        documentTitle: 'Legacy Case File - Cardiology',
        assignedTo: 'Records Digitization',
        status: 'pending',
        priority: 'normal',
        dueMinutesAhead: 240
      },
      {
        documentTitle: 'Lab Report - Hemogram (Suhana)',
        assignedTo: 'Pathology QA',
        status: 'in-review',
        priority: 'high',
        dueMinutesAhead: 60
      }
    ];

    for (const validation of validationSeeds) {
      const documentId = documentIdByTitle.get(validation.documentTitle);
      if (!documentId) continue;
      await client.query(
        `INSERT INTO validations (document_id, assigned_to, status, priority, due_at)
         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval)`,
        [
          documentId,
          validation.assignedTo,
          validation.status,
          validation.priority,
          validation.dueMinutesAhead
        ]
      );
    }

    const auditSeeds = [
      {
        moduleSlug: 'audit-logs',
        action: 'HIS Sync',
        detail: 'OPD Intake - Ramesh Patel synced to HIS and archived.',
        actor: 'System'
      },
      {
        moduleSlug: 'lab-reports-digitization',
        action: 'Manual Override',
        detail: 'Critical lab alert acknowledged by Dr. Asha Kulkarni.',
        actor: 'Dr. Asha Kulkarni'
      },
      {
        moduleSlug: 'document-scanner',
        action: 'Template Update',
        detail: 'OPD form template v3.2 published for Government Medical College.',
        actor: 'Mahesh Kulkarni'
      },
      {
        moduleSlug: 'medicine-stock-parser',
        action: 'Stock Alert',
        detail: 'Hydrocortisone ampoules flagged for resupply.',
        actor: 'System'
      },
      {
        moduleSlug: 'opd-ipd-digitization',
        action: 'Validation Completed',
        detail: 'Consent form for Baby Aarav approved by QA Nurse Team.',
        actor: 'QA Nurse Team'
      }
    ];

    for (const audit of auditSeeds) {
      const moduleId = moduleIdBySlug.get(audit.moduleSlug) || null;
      await client.query(
        `INSERT INTO audit_logs (module_id, action, detail, actor, created_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour' * random())`,
        [moduleId, audit.action, audit.detail, audit.actor]
      );
    }

    const stockSeeds = [
      {
        itemName: 'Ceftriaxone 1g Vial',
        quantity: 42,
        unit: 'vials',
        threshold: 50,
        lastUpdatedMinutesAgo: 20
      },
      {
        itemName: 'Paracetamol 500mg Tablet',
        quantity: 680,
        unit: 'tablets',
        threshold: 400,
        lastUpdatedMinutesAgo: 55
      },
      {
        itemName: 'Insulin (Short Acting)',
        quantity: 88,
        unit: 'vials',
        threshold: 80,
        lastUpdatedMinutesAgo: 75
      },
      {
        itemName: 'ORS Sachet',
        quantity: 120,
        unit: 'sachets',
        threshold: 100,
        lastUpdatedMinutesAgo: 42
      },
      {
        itemName: 'Antivenom Polyvalent',
        quantity: 18,
        unit: 'vials',
        threshold: 20,
        lastUpdatedMinutesAgo: 300
      }
    ];

    for (const stock of stockSeeds) {
      await client.query(
        `INSERT INTO medicine_stock (item_name, quantity, unit, threshold, last_updated)
         VALUES ($1, $2, $3, $4, NOW() - ($5 || ' minutes')::interval)`,
        [stock.itemName, stock.quantity, stock.unit, stock.threshold, stock.lastUpdatedMinutesAgo]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const query = (text, params) => pool.query(text, params);
export const getPool = () => pool;
export const isUsingInMemory = () => usingInMemory;

await Promise.all(migrations.map((sql) => pool.query(sql)));
await seedDatabase();

export default {
  query,
  getPool,
  isUsingInMemory,
};

