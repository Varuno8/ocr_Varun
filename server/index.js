import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const dashboardData = {
  status: 'Live',
  lastUpdated: new Date().toISOString(),
  stats: [
    {
      id: 'documents-scanned',
      label: 'Documents scanned today',
      value: '120',
      icon: '🗂️',
      trend: '+12 vs yesterday',
    },
    {
      id: 'pending-validations',
      label: 'Pending validations',
      value: '10',
      icon: '⏳',
      trend: 'Clears in ~18 min',
    },
    {
      id: 'accuracy-score',
      label: 'Accuracy score',
      value: '95%',
      icon: '📈',
      trend: '+2% week over week',
    },
    {
      id: 'his-sync',
      label: 'Synced to HIS',
      value: 'Yes',
      icon: '🔄',
      trend: 'Last sync 4 min ago',
    },
  ],
  operations: [
    'Central archive sync scheduled for 23:00 IST',
    'OPD/IPD schema v2 deployed across regional hospitals',
    'Validation SLA holding steady at 24 minutes',
  ],
};

const featureSummaries = [
  {
    id: 'document-scanner',
    name: 'Document Scanner',
    summary: 'Bulk ingest high-volume physical records with automatic classification.',
    icon: '📄',
    status: 'Operational',
    lastRun: '2 min ago',
  },
  {
    id: 'upload-scans',
    name: 'Upload Scans',
    summary: 'Secure drop-zone for remote clinics to upload scanned batches.',
    icon: '📄',
    status: 'Operational',
    lastRun: '8 min ago',
  },
  {
    id: 'medicine-stock-parser',
    name: 'Medicine Stock Parser',
    summary: 'Digitize pharmacy stock sheets and surface low-inventory alerts.',
    icon: '📄',
    status: 'Degraded',
    lastRun: '15 min ago',
  },
  {
    id: 'opd-ipd-digitization',
    name: 'OPD/IPD Form Digitization',
    summary: 'Convert inpatient/outpatient forms into structured HIS records.',
    icon: '📄',
    status: 'Operational',
    lastRun: '5 min ago',
  },
  {
    id: 'lab-reports-digitization',
    name: 'Lab Reports Digitization',
    summary: 'Classify and normalize lab reports with anomaly detection.',
    icon: '📄',
    status: 'Operational',
    lastRun: '11 min ago',
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    summary: 'Trace every document change for regulatory compliance.',
    icon: '📄',
    status: 'Operational',
    lastRun: '3 min ago',
  },
];

const featureDetails = {
  'document-scanner': {
    id: 'document-scanner',
    name: 'Document Scanner',
    description:
      'High-throughput scanning with zonal OCR and automated routing to the respective facility queues.',
    status: 'Operational',
    lastRun: '2 min ago',
    cta: 'Launch scanner pipeline',
    metrics: [
      { label: 'Docs processed today', value: '120', caption: '+12 vs yesterday' },
      { label: 'Avg processing time', value: '42 s', caption: 'per document' },
      { label: 'Validation queue', value: '10', caption: 'awaiting human review' },
    ],
    recentActivity: [
      { time: '09:45', detail: 'Batch #523 uploaded by Radiology (42 docs)' },
      { time: '09:38', detail: 'Auto-classified 18 ICU admission forms' },
      { time: '09:20', detail: 'Synced 12 discharge summaries to HIS' },
    ],
    nextSteps: [
      'Nightly retraining scheduled for 22:30 IST',
      'Add cardiology consent forms to high-priority queue',
    ],
    contacts: [
      {
        name: 'Ravi Singh',
        role: 'Platform Operations',
        email: 'ravi.singh@govhospital.in',
        phone: '+91 98765 43210',
      },
      {
        name: 'Dr. Kavya Menon',
        role: 'Clinical QA Lead',
        email: 'kavya.menon@govhospital.in',
        phone: '+91 91234 56780',
      },
    ],
  },
  'upload-scans': {
    id: 'upload-scans',
    name: 'Upload Scans',
    description: 'Secure upload portal with checksum verification and duplicate detection.',
    status: 'Operational',
    lastRun: '8 min ago',
    cta: 'Open upload portal',
    metrics: [
      { label: 'Active facilities', value: '28', caption: 'of 32 connected' },
      { label: 'Uploads today', value: '312', caption: 'peak throughput at 08:10' },
    ],
    recentActivity: [
      { time: '09:50', detail: 'Sivaganga CHC uploaded 3 pathology batches' },
      { time: '09:32', detail: 'Checksum mismatch flagged for Kalyan trauma center' },
    ],
    nextSteps: ['Roll out auto-tag suggestions to rural clinics'],
    contacts: [
      {
        name: 'Akash Patel',
        role: 'Data Exchange Coordinator',
        email: 'akash.patel@govhospital.in',
      },
    ],
  },
  'medicine-stock-parser': {
    id: 'medicine-stock-parser',
    name: 'Medicine Stock Parser',
    description: 'Digitizes stock ledgers and reconciles availability across warehouses.',
    status: 'Degraded',
    lastRun: '15 min ago',
    cta: 'Review parser health',
    metrics: [
      { label: 'Sheets parsed today', value: '58', caption: '-6 vs plan' },
      { label: 'Low stock alerts', value: '7', caption: '3 critical items' },
    ],
    recentActivity: [
      { time: '09:40', detail: 'Retrying OCR for orthopedics batch #14' },
      { time: '09:12', detail: 'Alert: Amoxicillin stock below 2-day threshold' },
    ],
    nextSteps: ['Escalate failed batches to pharmacy admin dashboard'],
    contacts: [
      {
        name: 'Megha Rao',
        role: 'Pharmacy Informatics',
        email: 'megha.rao@govhospital.in',
      },
    ],
  },
  'opd-ipd-digitization': {
    id: 'opd-ipd-digitization',
    name: 'OPD/IPD Form Digitization',
    description: 'Transforms legacy OPD/IPD forms into structured FHIR-compliant payloads.',
    status: 'Operational',
    lastRun: '5 min ago',
    cta: 'Open digitization console',
    metrics: [
      { label: 'Forms digitized', value: '86', caption: 'Avg confidence 95%' },
      { label: 'Manual escalations', value: '3', caption: 'Down 25% vs yesterday' },
    ],
    recentActivity: [
      { time: '09:48', detail: 'Tagged 6 IPD admissions for secondary review' },
      { time: '09:25', detail: 'Auto-routed emergency intake forms to HIS' },
    ],
    nextSteps: ['Enable multilingual templates for oncology department'],
    contacts: [
      {
        name: 'Lt. Col. Arjun Verma',
        role: 'HIS Integrations',
        email: 'arjun.verma@govhospital.in',
      },
    ],
  },
  'lab-reports-digitization': {
    id: 'lab-reports-digitization',
    name: 'Lab Reports Digitization',
    description: 'Automatically classifies lab report panels and flags abnormal results.',
    status: 'Operational',
    lastRun: '11 min ago',
    cta: 'Launch lab digitizer',
    metrics: [
      { label: 'Reports today', value: '142', caption: 'Peak throughput 09:05' },
      { label: 'Alerts sent', value: '5', caption: 'Abnormal ranges escalated' },
    ],
    recentActivity: [
      { time: '09:52', detail: 'CBC panel anomalies escalated to hematology' },
      { time: '09:18', detail: 'Processed 32 radiology transcripts' },
    ],
    nextSteps: ['Deploy auto-highlighting for pathology comments'],
    contacts: [
      {
        name: 'Sahana Krishnan',
        role: 'Diagnostics Informatics',
        email: 'sahana.krishnan@govhospital.in',
      },
    ],
  },
  'audit-logs': {
    id: 'audit-logs',
    name: 'Audit Logs',
    description: 'Immutable trace of document access and edits to support compliance audits.',
    status: 'Operational',
    lastRun: '3 min ago',
    cta: 'Open audit explorer',
    metrics: [
      { label: 'Events recorded', value: '1,420', caption: '24h rolling window' },
      { label: 'Anomalies', value: '0', caption: 'No anomalies detected' },
    ],
    recentActivity: [
      { time: '09:55', detail: 'New role-based access policy synced' },
      { time: '09:10', detail: 'Security audit export shared with compliance desk' },
    ],
    nextSteps: ['Enable anomaly notifications for cardiology cluster'],
    contacts: [
      {
        name: 'Nitin Awasthi',
        role: 'Security Operations',
        email: 'nitin.awasthi@govhospital.in',
      },
    ],
  },
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(dashboardData);
});

app.get('/api/features', (_req, res) => {
  res.json({ features: featureSummaries });
});

app.get('/api/features/:id', (req, res) => {
  const feature = featureDetails[req.params.id];
  if (!feature) {
    return res.status(404).json({ message: 'Feature not found' });
  }
  return res.json(feature);
});

app.post('/api/features/:id/actions/launch', (req, res) => {
  const feature = featureDetails[req.params.id];
  if (!feature) {
    return res.status(404).json({ message: 'Feature not found' });
  }
  return res.json({
    message: `${feature.name} launch initiated. Workflow telemetry will update shortly.`,
  });
});

app.post('/api/requests', (req, res) => {
  const { featureId, requesterName, department, priority, notes } = req.body ?? {};

  if (!featureId || !featureDetails[featureId]) {
    return res.status(400).json({ message: 'Select a valid module for your request.' });
  }

  if (!requesterName || !department) {
    return res.status(400).json({ message: 'Requester name and department are required.' });
  }

  const requestId = `REQ-${Date.now()}`;

  return res.status(201).json({
    message: `Request ${requestId} logged. The DocuHealth command center will respond within 1 business hour.`,
    payload: {
      id: requestId,
      featureId,
      requesterName,
      department,
      priority: priority ?? 'normal',
      notes: notes ?? '',
      submittedAt: new Date().toISOString(),
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`DocuHealth API listening on http://localhost:${port}`);
});
