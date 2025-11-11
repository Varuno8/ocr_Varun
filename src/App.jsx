import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

const initialRequestState = {
  featureId: '',
  requesterName: '',
  department: '',
  priority: 'normal',
  notes: '',
};

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
};

const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const value = new Date(isoString).getTime();
  if (Number.isNaN(value)) return '';
  const diffMs = Date.now() - value;
  const tense = diffMs >= 0 ? 'ago' : 'from now';
  const absDiff = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absDiff < minute) {
    return 'just now';
  }
  if (absDiff < hour) {
    const mins = Math.round(absDiff / minute);
    return `${mins} min ${tense}`;
  }
  if (absDiff < day) {
    const hours = Math.round(absDiff / hour);
    return `${hours} hr ${tense}`;
  }
  const days = Math.round(absDiff / day);
  return `${days} day${days === 1 ? '' : 's'} ${tense}`;
};

const apiFetch = async (path, options = {}) => {
  const init = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${path}`, init);
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let data = null;
  if (text) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.warn('Failed to parse JSON response', error);
        data = { message: text };
      }
    } else {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

const TrendBar = ({ label, value }) => (
  <div className="trend-bar">
    <span>{label}</span>
    <div className="trend-bar__meter">
      <div className="trend-bar__fill" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
    <span className="trend-bar__value">{value}</span>
  </div>
);

const SummaryTile = ({ title, value, caption, accent }) => (
  <div className={`summary-tile summary-tile--${accent ?? 'primary'}`}>
    <div className="summary-tile__value">{value}</div>
    <div className="summary-tile__title">{title}</div>
    {caption && <div className="summary-tile__caption">{caption}</div>}
  </div>
);

const FeatureMetric = ({ label, value }) => {
  let displayValue = value;
  if (typeof value === 'number') {
    const lower = label.toLowerCase();
    if (value > 0 && value <= 1 && (lower.includes('accuracy') || lower.includes('rate'))) {
      displayValue = `${Math.round(value * 100)}%`;
    } else {
      displayValue = Number.isInteger(value) ? value : value.toFixed(1);
    }
  }
  return (
    <div className="feature-metric">
      <div className="feature-metric__label">{label}</div>
      <div className="feature-metric__value">{displayValue}</div>
    </div>
  );
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [features, setFeatures] = useState([]);
  const [featureDetails, setFeatureDetails] = useState({});
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [loadingFeatureId, setLoadingFeatureId] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(initialRequestState);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [toast, setToast] = useState('');
  const [uploadStates, setUploadStates] = useState({});

  const refreshDashboard = async () => {
    try {
      const data = await apiFetch('/dashboard');
      setDashboard(data);
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    }
  };

  const refreshFeatures = async () => {
    try {
      const payload = await apiFetch('/features');
      setFeatures(payload.features ?? []);
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    }
  };

  const fetchFeatureDetail = async (featureId, force = false) => {
    if (!featureId) return;
    if (!force && featureDetails[featureId]) return;

    setLoadingFeatureId(featureId);
    try {
      const detail = await apiFetch(`/features/${featureId}`);
      setFeatureDetails((prev) => ({ ...prev, [featureId]: detail }));
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    } finally {
      setLoadingFeatureId((current) => (current === featureId ? null : current));
    }
  };

  useEffect(() => {
    refreshDashboard();
    refreshFeatures();
  }, []);

  useEffect(() => {
    if (!selectedFeatureId && features.length > 0) {
      const firstFeature = features[0];
      setSelectedFeatureId(firstFeature.id);
      fetchFeatureDetail(firstFeature.id);
    }
  }, [features]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedFeature = useMemo(
    () => (selectedFeatureId ? featureDetails[selectedFeatureId] : null),
    [featureDetails, selectedFeatureId],
  );

  const handleFeatureSelect = (feature) => {
    if (!feature) return;
    setSelectedFeatureId(feature.id);
    fetchFeatureDetail(feature.id);
  };

  const openRequestModal = () => {
    const defaultFeatureId = selectedFeatureId ?? features[0]?.id ?? '';
    setRequestForm((prev) => ({
      ...initialRequestState,
      ...prev,
      featureId: defaultFeatureId,
    }));
    setRequestOpen(true);
  };

  const closeRequestModal = () => {
    setRequestOpen(false);
  };

  const handleRequestField = (field, value) => {
    setRequestForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    setSubmittingRequest(true);
    try {
      await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify(requestForm),
      });
      setToast('Request submitted to the DocuHealth AI operations team.');
      setRequestOpen(false);
      setRequestForm(initialRequestState);
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleDocumentUpload = async ({
    file,
    documentType,
    department,
    validationDueHours,
    ingestionChannel,
  }) => {
    if (!file) {
      setBannerError('Please attach a file before submitting.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (department) formData.append('department', department);
    if (validationDueHours) formData.append('validationDueHours', validationDueHours);
    if (ingestionChannel) formData.append('ingestionChannel', ingestionChannel);

    setUploadStates((prev) => ({
      ...prev,
      [ingestionChannel]: { status: 'loading' },
    }));

    try {
      const response = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      let data = null;
      if (text) {
        data = contentType.includes('application/json') ? JSON.parse(text) : { message: text };
      }

      if (!response.ok) {
        const message = data?.error || data?.message || 'Document upload failed.';
        throw new Error(message);
      }

      setUploadStates((prev) => ({
        ...prev,
        [ingestionChannel]: { status: 'success', data },
      }));

      setToast('Document submitted for OCR processing.');
      setBannerError('');
      await Promise.all([
        refreshDashboard(),
        refreshFeatures(),
        fetchFeatureDetail(selectedFeatureId, true),
      ]);
    } catch (error) {
      console.error('Upload failed', error);
      setUploadStates((prev) => ({
        ...prev,
        [ingestionChannel]: { status: 'error', error: error.message },
      }));
      setBannerError(error.message);
    }
  };

  const renderDashboard = () => {
    if (!dashboard) return null;

    const { summary, validationsDue, productivityTrend, lastUpdated } = dashboard;

    return (
      <section className="dashboard card">
        <div className="dashboard__head">
          <div>
            <h2>Operational Pulse</h2>
            <p>Monitoring digitization KPIs across medical departments.</p>
          </div>
          <div className="dashboard__meta">Last synced {formatRelativeTime(lastUpdated)}</div>
        </div>
        <div className="dashboard__stats">
          <SummaryTile
            title="Documents scanned today"
            value={summary.documentsScannedToday}
            caption="Across OPD, IPD and lab workflows"
            accent="primary"
          />
          <SummaryTile
            title="Pending validations"
            value={summary.pendingValidations}
            caption="Assigned to quality review"
            accent="warning"
          />
          <SummaryTile
            title="Accuracy score"
            value={`${Math.round(summary.avgAccuracy * 100)}%`}
            caption="Auto-extracted field confidence"
            accent="success"
          />
          <SummaryTile
            title="Synced to HIS"
            value={summary.hisSyncStatus}
            caption={`${Math.round(summary.hisSyncRate * 100)}% of digitized records`}
            accent="info"
          />
        </div>
        <div className="dashboard__body">
          <div className="dashboard__validations">
            <h3>Validations due</h3>
            <ul>
              {(validationsDue ?? []).map((item) => (
                <li key={item.id}>
                  <div>
                    <span className="validation__title">{item.documentName}</span>
                    <span className="validation__meta">{item.department || 'General'}</span>
                  </div>
                  <span className="validation__due">{formatRelativeTime(item.validationDueAt)}</span>
                </li>
              ))}
              {(!validationsDue || validationsDue.length === 0) && (
                <li className="validation__empty">No pending validations 🎉</li>
              )}
            </ul>
          </div>
          <div className="dashboard__trend">
            <h3>Digitization velocity (last 7 days)</h3>
            <div className="trend-list">
              {(productivityTrend ?? []).map((item) => (
                <TrendBar key={item.label} label={item.label} value={item.volume} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderDocumentScanner = () => {
    if (!selectedFeature) return null;
    const {
      summary: rawSummary,
      recentScans,
      validationsDue,
      productivityTrend,
    } = selectedFeature;
    const summary = {
      documentsScannedToday: 0,
      pendingValidations: 0,
      avgAccuracy: 0,
      hisSyncRate: 0,
      ...(rawSummary || {}),
    };
    const uploadState = uploadStates.scanner || { status: 'idle' };

    let uploadStatusMessage = '';
    if (uploadState.status === 'loading') uploadStatusMessage = 'Uploading and processing document…';
    if (uploadState.status === 'success') uploadStatusMessage = 'Document captured successfully.';
    if (uploadState.status === 'error') uploadStatusMessage = uploadState.error;

    return (
      <div className="feature-detail">
        <div className="feature-detail__summary">
          <SummaryTile title="Scanned today" value={summary.documentsScannedToday} accent="primary" />
          <SummaryTile title="Pending QC" value={summary.pendingValidations} accent="warning" />
          <SummaryTile
            title="Avg. confidence"
            value={`${Math.round(summary.avgAccuracy * 100)}%`}
            accent="success"
          />
          <SummaryTile
            title="Synced to HIS"
            value={`${Math.round(summary.hisSyncRate * 100)}%`}
            accent="info"
          />
        </div>
        <div className="feature-detail__grid">
          <section className="panel">
            <header>
              <h3>Submit a new batch</h3>
              <p>Scan OPD/IPD forms and push them directly to the DocuHealth OCR pipeline.</p>
            </header>
            <form
              className="upload-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const file = form.file.files[0];
                const documentType = form.documentType.value;
                const department = form.department.value;
                const validationDueHours = form.validationDueHours.value;
                handleDocumentUpload({
                  file,
                  documentType,
                  department,
                  validationDueHours,
                  ingestionChannel: 'scanner',
                });
              }}
            >
              <label className="form-field">
                <span>Document type</span>
                <select name="documentType" defaultValue="opd" required>
                  <option value="opd">OPD intake bundle</option>
                  <option value="ipd">IPD admission kit</option>
                  <option value="lab">Lab report packet</option>
                  <option value="general">Other medical record</option>
                </select>
              </label>
              <label className="form-field">
                <span>Department</span>
                <input name="department" placeholder="Outpatient" defaultValue="Outpatient" />
              </label>
              <label className="form-field">
                <span>Validation SLA (hours)</span>
                <input name="validationDueHours" type="number" min="1" max="48" defaultValue="8" />
              </label>
              <label className="form-field">
                <span>Upload PDF or TIFF</span>
                <input name="file" type="file" accept=".pdf,.tif,.tiff,.png,.jpg,.jpeg" required />
              </label>
              <button type="submit" className="cta" disabled={uploadState.status === 'loading'}>
                {uploadState.status === 'loading' ? 'Processing…' : 'Upload to DocuHealth AI'}
              </button>
              {uploadStatusMessage && (
                <p className={`upload-status upload-status--${uploadState.status}`}>
                  {uploadStatusMessage}
                </p>
              )}
            </form>
          </section>
          <section className="panel">
            <header>
              <h3>Recent digitizations</h3>
              <p>Track the latest batches pushed through the scanner endpoints.</p>
            </header>
            <ul className="record-list">
              {(recentScans ?? []).map((item) => (
                <li key={item.id}>
                  <div>
                    <span className="record-list__title">{item.documentName}</span>
                    <span className="record-list__meta">
                      {item.department || 'General'} • {formatRelativeTime(item.scannedAt)}
                    </span>
                  </div>
                  <div className="record-list__status">
                    <span className={`status-pill status-pill--${item.status}`}>
                      {item.status
                        .replace(/_/g, ' ')
                        .replace(/^./, (char) => char.toUpperCase())}
                    </span>
                    <span className="record-list__confidence">
                      {Math.round((item.accuracyScore ?? 0) * 100)}%
                    </span>
                  </div>
                </li>
              ))}
              {(!recentScans || recentScans.length === 0) && (
                <li className="record-list__empty">No scans captured yet.</li>
              )}
            </ul>
          </section>
          <section className="panel">
            <header>
              <h3>QC queue</h3>
            </header>
            <ul className="record-list">
              {(validationsDue ?? []).map((item) => (
                <li key={item.id}>
                  <div>
                    <span className="record-list__title">{item.documentName}</span>
                    <span className="record-list__meta">{item.department || 'General'}</span>
                  </div>
                  <span className="record-list__badge">{formatRelativeTime(item.validationDueAt)}</span>
                </li>
              ))}
              {(!validationsDue || validationsDue.length === 0) && (
                <li className="record-list__empty">QC queue is clear.</li>
              )}
            </ul>
          </section>
          <section className="panel">
            <header>
              <h3>Velocity trend</h3>
            </header>
            <div className="trend-list">
              {(productivityTrend ?? []).map((item) => (
                <TrendBar key={item.label} label={item.label} value={item.volume} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderUploadFeature = () => {
    if (!selectedFeature) return null;
    const { summary: rawSummary, uploads } = selectedFeature;
    const summary = {
      queueVolume: 0,
      totalUploads: 0,
      avgMinutesOpen: 0,
      ...(rawSummary || {}),
    };
    const uploadState = uploadStates.upload || { status: 'idle' };

    let uploadStatusMessage = '';
    if (uploadState.status === 'loading') uploadStatusMessage = 'Uploading legacy scans…';
    if (uploadState.status === 'success') uploadStatusMessage = 'Upload queued for processing.';
    if (uploadState.status === 'error') uploadStatusMessage = uploadState.error;

    return (
      <div className="feature-detail">
        <div className="feature-detail__summary">
          <SummaryTile title="Queued uploads" value={summary.queueVolume} accent="warning" />
          <SummaryTile title="Total ingested" value={summary.totalUploads} accent="primary" />
          <SummaryTile
            title="Avg. queue time"
            value={`${Math.round(summary.avgMinutesOpen)} min`}
            accent="info"
          />
        </div>
        <div className="feature-detail__grid">
          <section className="panel">
            <header>
              <h3>Upload historical scans</h3>
              <p>Drag-and-drop bulk scans from local drives into the validation queue.</p>
            </header>
            <form
              className="upload-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const file = form.file.files[0];
                const documentType = form.documentType.value;
                const department = form.department.value;
                const validationDueHours = form.validationDueHours.value;
                handleDocumentUpload({
                  file,
                  documentType,
                  department,
                  validationDueHours,
                  ingestionChannel: 'upload',
                });
              }}
            >
              <label className="form-field">
                <span>Document bundle</span>
                <select name="documentType" defaultValue="lab" required>
                  <option value="lab">Lab reports</option>
                  <option value="radiology">Radiology scans</option>
                  <option value="inventory">Pharmacy sheets</option>
                  <option value="general">Other records</option>
                </select>
              </label>
              <label className="form-field">
                <span>Department</span>
                <input name="department" placeholder="Radiology" defaultValue="Records" />
              </label>
              <label className="form-field">
                <span>Validation SLA (hours)</span>
                <input name="validationDueHours" type="number" min="1" max="48" defaultValue="12" />
              </label>
              <label className="form-field">
                <span>Upload document</span>
                <input name="file" type="file" accept=".pdf,.zip,.tif,.tiff" required />
              </label>
              <button type="submit" className="cta" disabled={uploadState.status === 'loading'}>
                {uploadState.status === 'loading' ? 'Uploading…' : 'Queue for OCR'}
              </button>
              {uploadStatusMessage && (
                <p className={`upload-status upload-status--${uploadState.status}`}>
                  {uploadStatusMessage}
                </p>
              )}
            </form>
          </section>
          <section className="panel">
            <header>
              <h3>Upload queue</h3>
            </header>
            <ul className="record-list">
              {(uploads ?? []).map((item) => (
                <li key={item.id}>
                  <div>
                    <span className="record-list__title">{item.documentName}</span>
                    <span className="record-list__meta">{item.department || 'General'}</span>
                  </div>
                  <span className="record-list__badge">
                    {item.status
                      .replace(/_/g, ' ')
                      .replace(/^./, (char) => char.toUpperCase())}
                  </span>
                </li>
              ))}
              {(!uploads || uploads.length === 0) && (
                <li className="record-list__empty">Upload queue is empty.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    );
  };

  const renderMedicineFeature = () => {
    if (!selectedFeature) return null;
    const { summary: rawSummary, events } = selectedFeature;
    const summary = {
      totalBatches: 0,
      flagged: 0,
      expiringSoon: 0,
      ...(rawSummary || {}),
    };
    return (
      <div className="feature-detail">
        <div className="feature-detail__summary">
          <SummaryTile title="Batches parsed" value={summary.totalBatches} accent="primary" />
          <SummaryTile title="Discrepancies" value={summary.flagged} accent="warning" />
          <SummaryTile title="Expiring soon" value={summary.expiringSoon} accent="info" />
        </div>
        <section className="panel">
          <header>
            <h3>Recent medicine stock events</h3>
          </header>
          <ul className="record-list">
            {(events ?? []).map((event) => (
              <li key={event.id}>
                <div>
                  <span className="record-list__title">{event.medicineName}</span>
                  <span className="record-list__meta">
                    Batch {event.batchNumber} • Qty {event.quantityDetected}
                  </span>
                </div>
                <div className="record-list__status">
                  <span className={`status-pill status-pill--${event.discrepancyFlag ? 'alert' : 'ok'}`}>
                    {event.discrepancyFlag ? 'Flagged' : 'Balanced'}
                  </span>
                  <span className="record-list__badge">Exp {formatDateTime(event.expiryDate)}</span>
                </div>
              </li>
            ))}
            {(!events || events.length === 0) && (
              <li className="record-list__empty">No medicine stock events recorded.</li>
            )}
          </ul>
        </section>
      </div>
    );
  };

  const renderOpdIpdFeature = () => {
    if (!selectedFeature) return null;
    const { summary: rawSummary, records } = selectedFeature;
    const summary = {
      totalVolume: 0,
      pending: 0,
      breakdown: [],
      ...(rawSummary || {}),
    };
    return (
      <div className="feature-detail">
        <div className="feature-detail__summary">
          <SummaryTile title="Forms digitized" value={summary.totalVolume} accent="primary" />
          <SummaryTile title="Pending QC" value={summary.pending} accent="warning" />
          <SummaryTile
            title="OPD share"
            value={`${summary.breakdown?.find((b) => b.documentType === 'opd')?.volume ?? 0}`}
            accent="info"
          />
          <SummaryTile
            title="IPD share"
            value={`${summary.breakdown?.find((b) => b.documentType === 'ipd')?.volume ?? 0}`}
            accent="info"
          />
        </div>
        <section className="panel">
          <header>
            <h3>Recent OPD/IPD digitizations</h3>
          </header>
          <ul className="record-list">
            {(records ?? []).map((record) => (
              <li key={record.id}>
                <div>
                  <span className="record-list__title">{record.documentName}</span>
                  <span className="record-list__meta">
                    {record.documentType.toUpperCase()} • {record.department || 'General'}
                  </span>
                </div>
                <div className="record-list__status">
                  <span className={`status-pill status-pill--${record.status}`}>
                    {record.status
                      .replace(/_/g, ' ')
                      .replace(/^./, (char) => char.toUpperCase())}
                  </span>
                  <span className="record-list__confidence">
                    {Math.round((record.accuracyScore ?? 0) * 100)}%
                  </span>
                </div>
              </li>
            ))}
            {(!records || records.length === 0) && (
              <li className="record-list__empty">No recent OPD/IPD forms processed.</li>
            )}
          </ul>
        </section>
      </div>
    );
  };

  const renderLabFeature = () => {
    if (!selectedFeature) return null;
    const { summary: rawSummary, reports } = selectedFeature;
    const summary = {
      totalReports: 0,
      pending: 0,
      synced: 0,
      ...(rawSummary || {}),
    };
    return (
      <div className="feature-detail">
        <div className="feature-detail__summary">
          <SummaryTile title="Reports digitized" value={summary.totalReports} accent="primary" />
          <SummaryTile title="Awaiting review" value={summary.pending} accent="warning" />
          <SummaryTile title="Synced" value={summary.synced} accent="success" />
        </div>
        <section className="panel">
          <header>
            <h3>Lab pipeline</h3>
          </header>
          <ul className="record-list">
            {(reports ?? []).map((report) => (
              <li key={report.id}>
                <div>
                  <span className="record-list__title">{report.patientName}</span>
                  <span className="record-list__meta">{report.testType}</span>
                </div>
                <div className="record-list__status">
                  <span className={`status-pill status-pill--${report.status}`}>
                    {report.status
                      .replace(/_/g, ' ')
                      .replace(/^./, (char) => char.toUpperCase())}
                  </span>
                  <span className="record-list__badge">
                    {report.hisSynced ? 'HIS ✓' : 'Pending'}
                  </span>
                </div>
              </li>
            ))}
            {(!reports || reports.length === 0) && (
              <li className="record-list__empty">No lab reports ready.</li>
            )}
          </ul>
        </section>
      </div>
    );
  };

  const renderAuditFeature = () => {
    if (!selectedFeature) return null;
    const { summary: rawSummary, logs } = selectedFeature;
    const summary = {
      totalEntries: 0,
      lastDay: 0,
      ...(rawSummary || {}),
    };
    return (
      <div className="feature-detail">
        <div className="feature-detail__summary">
          <SummaryTile title="Audit entries" value={summary.totalEntries} accent="primary" />
          <SummaryTile title="Last 24h" value={summary.lastDay} accent="info" />
        </div>
        <section className="panel">
          <header>
            <h3>Activity log</h3>
          </header>
          <ul className="record-list">
            {(logs ?? []).map((log) => (
              <li key={log.id}>
                <div>
                  <span className="record-list__title">{log.summary}</span>
                  <span className="record-list__meta">{log.eventType}</span>
                </div>
                <span className="record-list__badge">{formatRelativeTime(log.createdAt)}</span>
              </li>
            ))}
            {(!logs || logs.length === 0) && (
              <li className="record-list__empty">No audit entries recorded yet.</li>
            )}
          </ul>
        </section>
      </div>
    );
  };

  const renderFeatureDetail = () => {
    if (!selectedFeatureId) {
      return <div className="feature-detail feature-detail--empty">Select a feature to view insights.</div>;
    }

    if (loadingFeatureId === selectedFeatureId && !selectedFeature) {
      return <div className="feature-detail feature-detail--loading">Loading feature…</div>;
    }

    switch (selectedFeatureId) {
      case 'document-scanner':
        return renderDocumentScanner();
      case 'upload-scans':
        return renderUploadFeature();
      case 'medicine-stock-parser':
        return renderMedicineFeature();
      case 'opd-ipd-digitization':
        return renderOpdIpdFeature();
      case 'lab-reports-digitization':
        return renderLabFeature();
      case 'audit-logs':
        return renderAuditFeature();
      default:
        return <div className="feature-detail feature-detail--empty">Unsupported feature.</div>;
    }
  };

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <header className="hero card">
          <div className="hero__text">
            <p className="hero__eyebrow">DocuHealth AI</p>
            <h1>AI-powered document digitization for government medical institutions</h1>
            <p className="hero__subtitle">
              Automate intake, clinical, and pharmacy paperwork with confidence-backed OCR workflows.
            </p>
            <p className="hero__timestamp">
              {dashboard ? `Operations refreshed ${formatRelativeTime(dashboard.lastUpdated)}` : 'Loading metrics…'}
            </p>
          </div>
          <div className="hero__actions">
            <button type="button" className="cta" onClick={openRequestModal}>
              New digitization request
            </button>
            <div className="status-pill">
              <span aria-hidden>⚡</span>
              <span>{dashboard?.summary?.documentsScannedToday ?? 0} docs scanned today</span>
            </div>
          </div>
        </header>

        {bannerError && <div className="banner banner--error">{bannerError}</div>}

        <main className="layout">
          <div className="primary">{renderDashboard()}</div>
          <aside className="feature-hub card">
            <div className="feature-hub__head">
              <h2>Automation Cockpit</h2>
              <p>Select a module to explore performance and launch workflows.</p>
            </div>
            <div className="feature-hub__body">
              <nav className="feature-nav">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    className={`feature-nav__item ${feature.id === selectedFeatureId ? 'is-active' : ''}`}
                    onClick={() => handleFeatureSelect(feature)}
                  >
                    <span className="feature-nav__icon" aria-hidden>
                      {feature.icon ?? '•'}
                    </span>
                    <div className="feature-nav__text">
                      <span className="feature-nav__title">{feature.title}</span>
                      <span className="feature-nav__description">{feature.description}</span>
                    </div>
                    <div className="feature-nav__metrics">
                      {feature.metrics &&
                        Object.entries(feature.metrics)
                          .slice(0, 2)
                          .map(([label, value]) => {
                            const friendlyLabel = label
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (char) => char.toUpperCase())
                              .trim();
                            return (
                              <FeatureMetric key={label} label={friendlyLabel} value={value} />
                            );
                          })}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
          <section className="feature-area card">{renderFeatureDetail()}</section>
        </main>
      </div>

      {requestOpen && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__backdrop" onClick={closeRequestModal} role="presentation" />
          <div className="modal__card">
            <header>
              <h2>Request a workflow</h2>
              <p>Tell us what medical document flow you would like to automate next.</p>
            </header>
            <form onSubmit={handleSubmitRequest} className="modal__form">
              <label className="form-field">
                <span>Feature</span>
                <select
                  value={requestForm.featureId}
                  onChange={(event) => handleRequestField('featureId', event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select feature
                  </option>
                  {features.map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Requester name</span>
                <input
                  value={requestForm.requesterName}
                  onChange={(event) => handleRequestField('requesterName', event.target.value)}
                  placeholder="Dr. Ahuja"
                  required
                />
              </label>
              <label className="form-field">
                <span>Department</span>
                <input
                  value={requestForm.department}
                  onChange={(event) => handleRequestField('department', event.target.value)}
                  placeholder="Radiology"
                />
              </label>
              <label className="form-field">
                <span>Priority</span>
                <select
                  value={requestForm.priority}
                  onChange={(event) => handleRequestField('priority', event.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="form-field">
                <span>Notes</span>
                <textarea
                  value={requestForm.notes}
                  onChange={(event) => handleRequestField('notes', event.target.value)}
                  rows={4}
                  placeholder="Describe the workflow challenges, formats, and turnaround needs."
                />
              </label>
              <div className="modal__actions">
                <button type="button" className="ghost" onClick={closeRequestModal}>
                  Cancel
                </button>
                <button type="submit" className="cta" disabled={submittingRequest}>
                  {submittingRequest ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
