import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

const initialUploadState = {
  moduleSlug: '',
  documentType: '',
  title: '',
  notes: '',
  uploadedBy: '',
};

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = date.getTime() - Date.now();
  const tense = diffMs < 0 ? 'ago' : 'from now';
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return 'just now';
  if (absMs < hour) {
    const minutes = Math.round(absMs / minute);
    return `${minutes} min ${tense}`;
  }
  if (absMs < day) {
    const hours = Math.round(absMs / hour);
    return `${hours} hr ${tense}`;
  }
  const days = Math.round(absMs / day);
  return `${days} day${days === 1 ? '' : 's'} ${tense}`;
};

const apiFetch = async (path, options = {}) => {
  const isFormData = options?.body instanceof FormData;
  const headers = isFormData
    ? options.headers ?? {}
    : {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error('[client] Failed to parse JSON', { path, text });
      throw new Error('Unexpected server response. Please try again later.');
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [modules, setModules] = useState([]);
  const [moduleDetails, setModuleDetails] = useState({});
  const [selectedModuleSlug, setSelectedModuleSlug] = useState('');
  const [loadingModuleSlug, setLoadingModuleSlug] = useState('');
  const [pendingValidations, setPendingValidations] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [medicineStock, setMedicineStock] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [uploadForm, setUploadForm] = useState(initialUploadState);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [toast, setToast] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const refreshDashboard = async () => {
    try {
      const payload = await apiFetch('/dashboard');
      setDashboard(payload);
      setPendingValidations(payload?.pendingValidations ?? []);
      setRecentDocuments(payload?.recentDocuments ?? []);
      setMedicineStock(payload?.medicineStock ?? []);
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    }
  };

  const refreshModules = async () => {
    try {
      const payload = await apiFetch('/modules');
      setModules(payload?.modules ?? []);
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    }
  };

  const refreshAuditLogs = async () => {
    try {
      const payload = await apiFetch('/audit-logs');
      setAuditLogs(payload?.logs ?? []);
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    }
  };

  useEffect(() => {
    refreshDashboard();
    refreshModules();
    refreshAuditLogs();
  }, []);

  useEffect(() => {
    if (!modules.length) return;

    setUploadForm((prev) => {
      const existingModule = modules.find((item) => item.slug === prev.moduleSlug);
      const resolvedModule = existingModule ?? modules[0];
      const documentTypes = resolvedModule.documentTypes ?? [];
      const currentType = documentTypes.includes(prev.documentType)
        ? prev.documentType
        : documentTypes[0] ?? '';

      return {
        ...prev,
        moduleSlug: resolvedModule.slug,
        documentType: currentType,
      };
    });

    if (!selectedModuleSlug) {
      setSelectedModuleSlug(modules[0].slug);
    }
  }, [modules, selectedModuleSlug]);

  useEffect(() => {
    if (!selectedModuleSlug) return;
    if (moduleDetails[selectedModuleSlug]) return;

    let active = true;
    setLoadingModuleSlug(selectedModuleSlug);

    apiFetch(`/modules/${selectedModuleSlug}`)
      .then((payload) => {
        if (!active) return;
        setModuleDetails((prev) => ({ ...prev, [selectedModuleSlug]: payload }));
        setBannerError('');
      })
      .catch((error) => {
        if (!active) return;
        setBannerError(error.message);
      })
      .finally(() => {
        if (active) {
          setLoadingModuleSlug('');
        }
      });

    return () => {
      active = false;
    };
  }, [selectedModuleSlug, moduleDetails]);

  const availableDocumentTypes = useMemo(() => {
    const module = modules.find((item) => item.slug === uploadForm.moduleSlug);
    return module?.documentTypes ?? [];
  }, [modules, uploadForm.moduleSlug]);

  const selectedModule = useMemo(
    () => (selectedModuleSlug ? moduleDetails[selectedModuleSlug] ?? null : null),
    [moduleDetails, selectedModuleSlug],
  );

  const handleModuleSelect = (slug) => {
    setSelectedModuleSlug(slug);
    const module = modules.find((item) => item.slug === slug);
    const documentTypes = module?.documentTypes ?? [];
    setUploadForm((prev) => ({
      ...prev,
      moduleSlug: slug,
      documentType: documentTypes.includes(prev.documentType)
        ? prev.documentType
        : documentTypes[0] ?? '',
    }));
  };

  const handleUploadField = (field, value) => {
    setUploadForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setUploadFile(file || null);

    if (file && !uploadForm.title) {
      const cleaned = file.name.replace(/\.[^./]+$/, '').replace(/[_-]+/g, ' ');
      setUploadForm((prev) => ({ ...prev, title: cleaned }));
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = async (event) => {
    event.preventDefault();

    if (!uploadFile) {
      setBannerError('Please attach a scan to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('moduleSlug', uploadForm.moduleSlug);
    formData.append('documentType', uploadForm.documentType || 'Document');
    if (uploadForm.title) formData.append('title', uploadForm.title);
    if (uploadForm.notes) formData.append('notes', uploadForm.notes);
    if (uploadForm.uploadedBy) formData.append('uploadedBy', uploadForm.uploadedBy);

    setUploading(true);

    try {
      const payload = await apiFetch('/documents', {
        method: 'POST',
        body: formData,
      });

      setUploadPreview(payload?.document ?? null);
      setToast(payload?.message ?? 'Document uploaded');
      setBannerError('');
      setUploadForm((prev) => ({
        ...prev,
        notes: '',
        title: '',
      }));
      setUploadFile(null);
      resetFileInput();
      await Promise.all([refreshDashboard(), refreshAuditLogs()]);
    } catch (error) {
      setBannerError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const accuracyStat = dashboard?.stats?.find((item) => item.id === 'accuracy');
  const systemLatency = dashboard?.latency ?? '42 ms';
  const selectedModuleSummary = modules.find((item) => item.slug === selectedModuleSlug);

  return (
    <div className="page-shell">
      {bannerError && (
        <div className="banner banner--error" role="alert">
          <span>{bannerError}</span>
          <button type="button" onClick={() => setBannerError('')} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <header className="topbar">
        <div>
          <p className="topbar__eyebrow">DocuHealth AI</p>
          <div className="topbar__titles">
            <h1>AI-Powered Document Digitization for Medical Institutions</h1>
            <p>Clean, calm, and reliable oversight for every scan, validation, and sync.</p>
          </div>
        </div>
        <div className="topbar__status">
          <span className="pill pill--success">Online · Connected to HIS</span>
          <span className="pill pill--ghost">{dashboard?.status ?? 'Loading'} · {systemLatency}</span>
        </div>
      </header>

      <main className="page-content">
        <section className="hero-card card">
          <div>
            <p className="hero-card__eyebrow">Medical Document Processing Dashboard</p>
            <h2>Monitor throughput, validation queues, and digitization accuracy in real time.</h2>
            {dashboard?.lastUpdated && (
              <p className="hero-card__meta">Updated {formatRelativeTime(dashboard.lastUpdated)}</p>
            )}
          </div>
          <div className="hero-card__metrics">
            {(dashboard?.stats ?? []).slice(0, 3).map((stat) => (
              <div key={stat.id} className="mini-metric">
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
              </div>
            ))}
            {accuracyStat && (
              <div className="mini-metric mini-metric--accent">
                <p>Avg OCR Accuracy</p>
                <strong>{accuracyStat.value}</strong>
                <span className="mini-metric__caption">Powered by Google Document AI</span>
              </div>
            )}
          </div>
        </section>

        <section className="stats-row">
          {(dashboard?.stats ?? []).map((item) => (
            <article key={item.id} className="stat-tile card">
              <div className="stat-tile__header">
                <span className="stat-tile__label">{item.label}</span>
                <span className="stat-tile__icon" aria-hidden="true">
                  {item.icon}
                </span>
              </div>
              <p className="stat-tile__value">{item.value}</p>
              {item.trend && <span className="stat-tile__trend">{item.trend}</span>}
            </article>
          ))}
        </section>

        <section className="modules card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Modules</p>
              <h3>Choose a digitization flow</h3>
              <p className="muted">Tap a module to route uploads and view live telemetry.</p>
            </div>
            {selectedModuleSummary && (
              <div className="section-heading__meta">
                <span className="pill pill--ghost">{selectedModuleSummary.status}</span>
                {selectedModuleSummary.lastRun && (
                  <small>Last run {formatRelativeTime(selectedModuleSummary.lastRun)}</small>
                )}
              </div>
            )}
          </div>

          <div className="modules__grid">
            {modules.map((module) => {
              const isActive = module.slug === selectedModuleSlug;
              return (
                <button
                  key={module.slug}
                  type="button"
                  className={`module-tile${isActive ? ' is-selected' : ''}`}
                  onClick={() => handleModuleSelect(module.slug)}
                >
                  <div className="module-tile__icon" aria-hidden="true">
                    {module.icon}
                  </div>
                  <div className="module-tile__body">
                    <div className="module-tile__title">{module.name}</div>
                    <div className="module-tile__subtitle">{module.summary}</div>
                  </div>
                  <div className="module-tile__status">
                    <span className={`pill pill--${module.status === 'Operational' ? 'success' : 'warning'}`}>
                      {module.status}
                    </span>
                    {module.lastRun && <small>{formatRelativeTime(module.lastRun)}</small>}
                  </div>
                </button>
              );
            })}
            {!modules.length && <p className="empty-state">No modules configured.</p>}
          </div>
        </section>

        <section className="workspace">
          <article className="upload card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Upload Panel</p>
                <h3>Upload PDFs or Images</h3>
                <p className="muted">Drop PDFs, JPG, PNG, or WEBP up to 200MB and process with Google Document AI.</p>
              </div>
              <span className="pill pill--ghost">Calm processing</span>
            </div>

            <form className="upload__form" onSubmit={handleUploadSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>Module</span>
                  <select
                    value={uploadForm.moduleSlug}
                    onChange={(event) => handleModuleSelect(event.target.value)}
                    required
                  >
                    {modules.map((module) => (
                      <option key={module.slug} value={module.slug}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Document type</span>
                  <select
                    value={uploadForm.documentType}
                    onChange={(event) => handleUploadField('documentType', event.target.value)}
                    required
                    disabled={!availableDocumentTypes.length}
                  >
                    {availableDocumentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    {!availableDocumentTypes.length && <option value="">No templates</option>}
                  </select>
                </label>
              </div>

              <div className="dropzone">
                <div className="dropzone__content">
                  <p className="dropzone__title">Drag & drop files here</p>
                  <p className="dropzone__subtitle">PDF, JPG, PNG, WEBP up to 200MB</p>
                  <div className="dropzone__actions">
                    <label className="button button--primary" htmlFor="file-input">
                      Browse files
                      <input
                        id="file-input"
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.csv,.zip,.webp"
                        onChange={handleFileChange}
                        required
                      />
                    </label>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setBannerError('Use sample file is not connected yet')}
                    >
                      Use sample file
                    </button>
                  </div>
                  {uploadFile && <small className="field__hint">{uploadFile.name}</small>}
                  <span className="pill pill--ghost">Powered by Google Document AI</span>
                </div>
                {uploading && (
                  <div className="dropzone__overlay" role="status">
                    <div className="spinner" aria-hidden="true" />
                    <p>Processing with Google Document AI…</p>
                  </div>
                )}
              </div>

              <div className="form-grid form-grid--stacked">
                <label className="field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(event) => handleUploadField('title', event.target.value)}
                    placeholder="e.g. OPD Intake - Aditi Sharma"
                  />
                </label>
                <label className="field">
                  <span>Uploaded by</span>
                  <input
                    type="text"
                    value={uploadForm.uploadedBy}
                    onChange={(event) => handleUploadField('uploadedBy', event.target.value)}
                    placeholder="e.g. Nurse Radhika"
                  />
                </label>
              </div>

              <label className="field">
                <span>Operator notes</span>
                <textarea
                  rows="3"
                  value={uploadForm.notes}
                  onChange={(event) => handleUploadField('notes', event.target.value)}
                  placeholder="Add context for the validation team"
                />
              </label>

              <div className="upload__actions">
                <button type="submit" className="button button--primary" disabled={uploading}>
                  {uploading ? 'Processing…' : 'Run OCR'}
                </button>
                <span className="muted">Files stay private and encrypted in transit.</span>
              </div>
            </form>
          </article>

          <article className="results card" aria-live="polite">
            <div className="section-heading">
              <div>
                <p className="eyebrow">OCR Result Viewer</p>
                <h3>{uploadPreview ? uploadPreview.title ?? 'Processed file' : 'Awaiting upload'}</h3>
                <p className="muted">Review extracted text and export into your HIS workflows.</p>
              </div>
              {uploadPreview?.method && <span className="pill pill--ghost">{uploadPreview.method}</span>}
            </div>

            {uploadPreview ? (
              <div className="result__body">
                <div className="result__meta">
                  {uploadPreview.fileName && (
                    <div>
                      <p className="muted">File name</p>
                      <strong>{uploadPreview.fileName}</strong>
                    </div>
                  )}
                  {uploadPreview.timeTaken && (
                    <div>
                      <p className="muted">Time taken</p>
                      <strong>{uploadPreview.timeTaken}</strong>
                    </div>
                  )}
                  {uploadPreview.method && (
                    <div>
                      <p className="muted">Method</p>
                      <strong>{uploadPreview.method}</strong>
                    </div>
                  )}
                </div>
                <div className="result__text" role="textbox">
                  <pre>{uploadPreview.text ?? uploadPreview.summary ?? 'Result ready for review.'}</pre>
                </div>
                <div className="result__actions">
                  <button type="button" className="button button--primary">Download as .txt</button>
                  <button type="button" className="button button--ghost">Download as .md</button>
                </div>
              </div>
            ) : (
              <div className="result__empty">
                <p>No OCR results yet. Upload a file to see extracted content.</p>
              </div>
            )}

            <div className="recent-documents">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent uploads</p>
                  <h4>Validation queue</h4>
                </div>
              </div>
              <ul className="document-list">
                {recentDocuments.map((document) => (
                  <li key={document.id}>
                    <div>
                      <span className="document-list__title">{document.title}</span>
                      <span className="document-list__meta">
                        {document.documentType}
                        {document.module?.name ? ` • ${document.module.name}` : ''}
                        {document.uploadedAt && ` • ${formatRelativeTime(document.uploadedAt)}`}
                      </span>
                    </div>
                    <div className="document-list__status">
                      <span
                        className={`pill pill--${
                          document.status === 'Validated'
                            ? 'success'
                            : document.status === 'Pending Validation'
                            ? 'warning'
                            : 'info'
                        }`}
                      >
                        {document.status}
                      </span>
                      {document.confidence !== null && (
                        <span className="document-list__confidence">
                          {`${Number(document.confidence).toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
                {!recentDocuments.length && <li className="empty-state">No documents available yet.</li>}
              </ul>
            </div>
          </article>
        </section>

        <section className="module-detail card" aria-live="polite">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live telemetry</p>
              <h3>{selectedModule?.name ?? 'Select a module to inspect'}</h3>
              <p className="muted">Peek into throughput, syncs, and recent activity.</p>
            </div>
            <div className="module-detail__status">
              {selectedModule && (
                <span className={`pill pill--${selectedModule.status === 'Operational' ? 'success' : 'warning'}`}>
                  {selectedModule.status}
                </span>
              )}
              {selectedModule?.lastSynced && (
                <span className="muted">Last sync {formatRelativeTime(selectedModule.lastSynced)}</span>
              )}
            </div>
          </div>

          {loadingModuleSlug && !selectedModule ? (
            <div className="module-detail__empty">
              <p>Loading module details…</p>
            </div>
          ) : selectedModule ? (
            <>
              <p className="module-detail__description">{selectedModule.description}</p>

              {(selectedModule.metrics ?? []).length > 0 && (
                <div className="module-detail__metrics">
                  {selectedModule.metrics.map((metric) => (
                    <div key={metric.label} className="module-detail__metric">
                      <span className="module-detail__metric-value">{metric.value}</span>
                      <span className="module-detail__metric-label">{metric.label}</span>
                      {metric.caption && (
                        <span className="module-detail__metric-caption">{metric.caption}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(selectedModule.recentActivity ?? []).length > 0 && (
                <div className="module-detail__section">
                  <h4>Recent activity</h4>
                  <ul className="timeline">
                    {selectedModule.recentActivity.map((activity, index) => (
                      <li key={`${activity.time}-${index}`}>
                        <span className="timeline__time">{formatRelativeTime(activity.time)}</span>
                        <span className="timeline__text">{activity.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(selectedModule.nextSteps ?? []).length > 0 && (
                <div className="module-detail__section">
                  <h4>Next steps</h4>
                  <ul className="checklist">
                    {selectedModule.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(selectedModule.contacts ?? []).length > 0 && (
                <div className="module-detail__section">
                  <h4>Points of contact</h4>
                  <ul className="contact-list">
                    {selectedModule.contacts.map((contact) => (
                      <li key={contact.email ?? contact.name}>
                        <span className="contact-list__name">{contact.name}</span>
                        <span className="contact-list__role">{contact.role}</span>
                        {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                        {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="module-detail__empty">
              <p>Select a module to inspect live telemetry.</p>
            </div>
          )}
        </section>

        <section className="audit card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Audit Logs</p>
              <h3>Trace every document event</h3>
              <p className="muted">Time, filename, module, status, and duration at a glance.</p>
            </div>
          </div>
          <div className="audit__table" role="table">
            <div className="audit__row audit__row--header" role="row">
              <span role="columnheader">Time</span>
              <span role="columnheader">Filename</span>
              <span role="columnheader">Module</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Duration</span>
            </div>
            {(auditLogs ?? []).map((log, index) => (
              <div key={log.id ?? index} className="audit__row" role="row">
                <span role="cell">{formatRelativeTime(log.time)}</span>
                <span role="cell">{log.filename}</span>
                <span role="cell">{log.module}</span>
                <span role="cell">
                  <span className={`pill pill--${log.status === 'success' ? 'success' : 'danger'}`}>
                    {log.status}
                  </span>
                </span>
                <span role="cell">{log.duration}</span>
              </div>
            ))}
            {!auditLogs.length && (
              <div className="audit__row audit__row--empty" role="row">
                <span role="cell">No audit logs yet.</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
