import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

const initialUploadState = {
  moduleSlug: '',
  documentType: '',
  title: '',
  notes: '',
  uploadedBy: '',
};

const gradientPalette = [
  'linear-gradient(135deg, #6366F1, #EC4899)',
  'linear-gradient(135deg, #22D3EE, #6366F1)',
  'linear-gradient(135deg, #F472B6, #60A5FA)',
  'linear-gradient(135deg, #84CC16, #22D3EE)',
  'linear-gradient(135deg, #A78BFA, #EC4899)',
];

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
    <div className="canvas">
      <div className="backdrop">{/* background haze */}</div>

      {bannerError && (
        <div className="banner banner--error" role="alert">
          <span>{bannerError}</span>
          <button type="button" onClick={() => setBannerError('')} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <header className="nav">
        <div className="nav__brand">
          <div className="logo">DocuHealth</div>
          <div>
            <p className="eyebrow">DocuHealth AI</p>
            <h1>Vibrant intelligence for every clinical document</h1>
          </div>
        </div>
        <div className="nav__status">
          <span className="pill pill--success">Live</span>
          <span className="pill pill--ghost">Latency {systemLatency}</span>
        </div>
      </header>

      <main className="layout">
        <section className="hero">
          <div className="hero__content">
            <p className="badge">Premium HealthTech — powered by Google Document AI</p>
            <h2>
              A colorful cockpit for <span>DocuHealth</span> automations.
            </h2>
            <p className="lede">
              Track OCR accuracy, orchestrate uploads, and monitor validation with a playful yet premium
              dashboard. Crafted with neon gradients, glass layers, and lively micro-interactions.
            </p>
            <div className="hero__actions">
              <button type="button" className="button button--primary">
                Launch DocuHealth
              </button>
              <button type="button" className="button button--ghost">
                View automation flows
              </button>
            </div>
            {dashboard?.lastUpdated && (
              <div className="hero__meta">Synced {formatRelativeTime(dashboard.lastUpdated)}</div>
            )}
          </div>
          <div className="hero__visual">
            <div className="halo" aria-hidden="true" />
            <div className="glass board">
              <div className="board__wave" aria-hidden="true">
                <div className="wave" />
                <div className="wave wave--delay" />
              </div>
              <div className="metrics">
                {(dashboard?.stats ?? []).slice(0, 3).map((stat) => (
                  <div key={stat.id} className="metric">
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                    {stat.trend && <small>{stat.trend}</small>}
                  </div>
                ))}
                {accuracyStat && (
                  <div className="metric metric--accent">
                    <p>Avg OCR Accuracy</p>
                    <strong>{accuracyStat.value}</strong>
                    <small>Real-time quality</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid stats">
          {(dashboard?.stats ?? []).map((item, index) => (
            <article
              key={item.id}
              className="stat-card glass"
              style={{ backgroundImage: gradientPalette[index % gradientPalette.length] }}
            >
              <div className="stat-card__top">
                <span className="stat-card__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="pill pill--light">{item.label}</span>
              </div>
              <div className="stat-card__value">{item.value}</div>
              {item.trend && <div className="stat-card__trend">{item.trend}</div>}
            </article>
          ))}
        </section>

        <section className="panel modules glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Automation modules</p>
              <h3>Colorful lanes for DocuHealth</h3>
              <p className="muted">Tap a tile to inspect its live telemetry and validation steps.</p>
            </div>
            {selectedModuleSummary && (
              <div className="panel__meta">
                <span className="pill pill--ghost">{selectedModuleSummary.status}</span>
                {selectedModuleSummary.lastRun && (
                  <small>Last run {formatRelativeTime(selectedModuleSummary.lastRun)}</small>
                )}
              </div>
            )}
          </div>

          <div className="module-grid">
            {modules.map((module, index) => {
              const isActive = module.slug === selectedModuleSlug;
              return (
                <button
                  key={module.slug}
                  type="button"
                  className={`module-card ${isActive ? 'is-active' : ''}`}
                  style={{ backgroundImage: gradientPalette[index % gradientPalette.length] }}
                  onClick={() => handleModuleSelect(module.slug)}
                >
                  <div className="module-card__icon" aria-hidden="true">
                    {module.icon}
                  </div>
                  <div className="module-card__body">
                    <div className="module-card__title">{module.name}</div>
                    <p className="module-card__subtitle">{module.summary}</p>
                  </div>
                  <div className="module-card__status">
                    <span
                      className={`pill pill--${module.status === 'Operational' ? 'success' : 'warning'}`}
                    >
                      {module.status}
                    </span>
                    {module.lastRun && <small>{formatRelativeTime(module.lastRun)}</small>}
                  </div>
                </button>
              );
            })}
            {!modules.length && <p className="empty">No modules configured.</p>}
          </div>
        </section>

        <section className="workspace">
          <article className="panel uploader glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Upload system</p>
                <h3>Neon-grade document ingress</h3>
                <p className="muted">Pastel gradients, dotted borders, and lively progress rings.</p>
              </div>
              <span className="pill pill--ghost">Secure transit</span>
            </div>

            <form className="form" onSubmit={handleUploadSubmit}>
              <div className="form__row">
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

              <div className={`dropzone ${uploading ? 'is-uploading' : ''}`}>
                <div className="dropzone__shell">
                  <p className="dropzone__title">Drag & drop files</p>
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
                  <span className="pill pill--light">Google Document AI</span>
                </div>
                {uploading && (
                  <div className="dropzone__overlay" role="status">
                    <div className="progress">
                      <div className="progress__ring" />
                    </div>
                    <p>Processing…</p>
                  </div>
                )}
              </div>

              <div className="form__row form__row--stacked">
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

              <div className="form__actions">
                <button type="submit" className="button button--primary" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload document'}
                </button>
                {uploadPreview && (
                  <div className="chip">Latest: {uploadPreview.title ?? uploadPreview.filename}</div>
                )}
              </div>
            </form>
          </article>

          <article className="panel details glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Module details</p>
                <h3>Live telemetry & insights</h3>
              </div>
              {selectedModule?.lastSynced && (
                <span className="muted">Last sync {formatRelativeTime(selectedModule.lastSynced)}</span>
              )}
            </div>

            {loadingModuleSlug && !selectedModule ? (
              <div className="empty">Loading module details…</div>
            ) : selectedModule ? (
              <div className="detail-grid">
                <p className="muted">{selectedModule.description}</p>

                {(selectedModule.metrics ?? []).length > 0 && (
                  <div className="pill-grid">
                    {selectedModule.metrics.map((metric) => (
                      <div key={metric.label} className="pill-tile">
                        <span className="pill-tile__value">{metric.value}</span>
                        <span className="pill-tile__label">{metric.label}</span>
                        {metric.caption && <span className="pill-tile__caption">{metric.caption}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {(selectedModule.recentActivity ?? []).length > 0 && (
                  <div className="section-block">
                    <div className="section-block__title">Recent activity</div>
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
                  <div className="section-block">
                    <div className="section-block__title">Next steps</div>
                    <ul className="checklist">
                      {selectedModule.nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedModule.contacts ?? []).length > 0 && (
                  <div className="section-block">
                    <div className="section-block__title">Points of contact</div>
                    <ul className="contacts">
                      {selectedModule.contacts.map((contact) => (
                        <li key={contact.email ?? contact.name}>
                          <span className="contacts__name">{contact.name}</span>
                          <span className="contacts__role">{contact.role}</span>
                          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty">Select a module to inspect live telemetry.</div>
            )}
          </article>
        </section>

        <section className="panel grid glass insight-grid">
          <div>
            <p className="eyebrow">Pending validations</p>
            <h3>Keep validators focused</h3>
            <ul className="tile-list">
              {(pendingValidations ?? []).map((item) => (
                <li key={item.id} className="tile">
                  <div>
                    <p className="tile__title">{item.title}</p>
                    <p className="tile__meta">{item.module}</p>
                  </div>
                  <span className="pill pill--warning">Pending</span>
                </li>
              ))}
              {!pendingValidations.length && <p className="empty">All validations are clear.</p>}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Recent documents</p>
            <h3>Freshly ingested</h3>
            <ul className="tile-list">
              {(recentDocuments ?? []).map((doc) => (
                <li key={doc.id} className="tile">
                  <div>
                    <p className="tile__title">{doc.title}</p>
                    <p className="tile__meta">{doc.module}</p>
                  </div>
                  <span className="pill pill--success">{doc.status}</span>
                </li>
              ))}
              {!recentDocuments.length && <p className="empty">No recent documents yet.</p>}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Medicine stock</p>
            <h3>Inventory pulse</h3>
            <ul className="tile-list">
              {(medicineStock ?? []).map((item) => (
                <li key={item.name} className="tile">
                  <div>
                    <p className="tile__title">{item.name}</p>
                    <p className="tile__meta">{item.category}</p>
                  </div>
                  <span className="pill pill--light">{item.status}</span>
                </li>
              ))}
              {!medicineStock.length && <p className="empty">Inventory data unavailable.</p>}
            </ul>
          </div>
        </section>

        <section className="panel audit glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Audit logs</p>
              <h3>Color-coded traceability</h3>
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
                  <span
                    className={`pill pill--${
                      log.status === 'success'
                        ? 'success'
                        : log.status === 'pending'
                          ? 'warning'
                          : 'danger'
                    }`}
                  >
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
