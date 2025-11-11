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

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        {bannerError && (
          <div className="banner banner--error" role="alert">
            <span>{bannerError}</span>
            <button type="button" onClick={() => setBannerError('')} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <header className="hero card">
          <div className="hero__text">
            <p className="hero__eyebrow">DocuHealth AI</p>
            <h1>AI-Powered Document Digitization for Government Medical Institutions</h1>
            <p className="hero__subtitle">
              Monitor digitization throughput, validation queues, and HIS sync readiness across your facilities in real time.
            </p>
            {dashboard?.lastUpdated && (
              <p className="hero__timestamp">Updated {formatRelativeTime(dashboard.lastUpdated)}</p>
            )}
          </div>
          <div className="hero__actions">
            <span className={`status-pill status-pill--${dashboard?.status === 'Operational' ? 'success' : 'warning'}`}>
              {dashboard?.status ?? 'Loading'}
            </span>
            {accuracyStat && <span className="hero__accuracy">Accuracy {accuracyStat.value}</span>}
          </div>
        </header>

        <main className="layout">
          <section className="primary">
            <section className="dashboard card">
              <div className="dashboard__head">
                <div>
                  <h2>Dashboard</h2>
                  <p>Track the daily pulse of DocuHealth AI across your campuses.</p>
                </div>
              </div>
              <div className="stats-grid">
                {(dashboard?.stats ?? []).map((item) => (
                  <article key={item.id} className="stat-card">
                    <div className="stat-card__icon" aria-hidden="true">
                      {item.icon}
                    </div>
                    <div className="stat-card__content">
                      <p className="stat-card__label">{item.label}</p>
                      <p className="stat-card__value">{item.value}</p>
                    </div>
                    {item.trend && <p className="stat-card__trend">{item.trend}</p>}
                  </article>
                ))}
              </div>
            </section>

            <section className="workflow-grid">
              <article className="workflow-card workflow-card--scanner card">
                <header>
                  <h3>Document Scanner</h3>
                  <p>Upload new scans for OCR and immediate routing into the HIS.</p>
                </header>
                <form className="scanner-form" onSubmit={handleUploadSubmit}>
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

                  <label className="field">
                    <span>Scan</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.csv,.zip"
                      onChange={handleFileChange}
                      required
                    />
                    {uploadFile && <small className="field__hint">{uploadFile.name}</small>}
                  </label>

                  <label className="field">
                    <span>Title</span>
                    <input
                      type="text"
                      value={uploadForm.title}
                      onChange={(event) => handleUploadField('title', event.target.value)}
                      placeholder="e.g. OPD Intake - Aditi Sharma"
                    />
                  </label>

                  <div className="form-grid">
                    <label className="field">
                      <span>Operator notes</span>
                      <textarea
                        rows="3"
                        value={uploadForm.notes}
                        onChange={(event) => handleUploadField('notes', event.target.value)}
                        placeholder="Add context for the validation team"
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

                  <button type="submit" className="cta" disabled={uploading}>
                    {uploading ? 'Processing…' : 'Run OCR' }
                  </button>
                </form>

                {uploadPreview && (
                  <section className="scanner-preview">
                    <div>
                      <h4>Latest OCR result</h4>
                      <p>{uploadPreview.summary}</p>
                      <dl className="preview-fields">
                        {(uploadPreview.extractedFields ?? []).map((field) => (
                          <div key={field.label}>
                            <dt>{field.label}</dt>
                            <dd>{field.value}</dd>
                          </div>
                        ))}
                      </dl>
                      {uploadPreview.validation && (
                        <p className="preview-validation">
                          Validation ticket #{uploadPreview.validation.id} assigned — priority {uploadPreview.validation.priority}.
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </article>

              <article className="workflow-card card">
                <header>
                  <h3>Upload Scans</h3>
                  <p>Monitor recent ingestion batches and OCR confidence.</p>
                </header>
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
                          className={`badge badge--${
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
              </article>

              <article className="workflow-card card">
                <header>
                  <h3>Medicine Stock Parser</h3>
                  <p>Digitized pharmacy inventory with automatic low stock alerts.</p>
                </header>
                <div className="stock-table__wrapper">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Quantity</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicineStock.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="stock-item__name">{item.itemName}</span>
                            <span className="stock-item__time">Updated {formatRelativeTime(item.lastUpdated)}</span>
                          </td>
                          <td>
                            {item.quantity} {item.unit}
                            <span className="stock-item__threshold">Threshold {item.threshold}</span>
                          </td>
                          <td>
                            <span className={`badge badge--${item.status === 'low' ? 'warning' : 'success'}`}>
                              {item.status === 'low' ? 'Reorder' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!medicineStock.length && (
                        <tr>
                          <td colSpan="3" className="empty-state">
                            No stock updates yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="workflow-card card">
                <header>
                  <h3>Pending Validations</h3>
                  <p>Keep critical documents on track for HIS synchronization.</p>
                </header>
                <ul className="validation-list">
                  {pendingValidations.map((item) => (
                    <li key={item.id}>
                      <div>
                        <span className="validation-list__title">{item.document.title}</span>
                        <span className="validation-list__meta">
                          {item.document.type}
                          {item.document.module?.name ? ` • ${item.document.module.name}` : ''}
                          {item.document.uploadedAt && ` • ${formatRelativeTime(item.document.uploadedAt)}`}
                        </span>
                      </div>
                      <div className="validation-list__status">
                        <span className={`badge badge--${item.priority === 'high' ? 'warning' : 'info'}`}>
                          {item.priority === 'high' ? 'High priority' : 'Normal'}
                        </span>
                        {item.dueAt && <span>Due {formatRelativeTime(item.dueAt)}</span>}
                      </div>
                    </li>
                  ))}
                  {!pendingValidations.length && <li className="empty-state">No validations pending 🎉</li>}
                </ul>
              </article>

              <article className="workflow-card card">
                <header>
                  <h3>Audit Logs</h3>
                  <p>Trace overrides, HIS syncs, and compliance exports.</p>
                </header>
                <ul className="audit-list">
                  {auditLogs.map((log) => (
                    <li key={log.id}>
                      <div>
                        <span className="audit-list__title">{log.action}</span>
                        <span className="audit-list__meta">
                          {log.module?.name ? `${log.module.name} • ` : ''}
                          {log.actor}
                          {log.createdAt && ` • ${formatRelativeTime(log.createdAt)}`}
                        </span>
                      </div>
                      <p>{log.detail}</p>
                    </li>
                  ))}
                  {!auditLogs.length && <li className="empty-state">No audit activity recorded.</li>}
                </ul>
              </article>
            </section>
          </section>

          <aside className="module-panel">
            <section className="module-list card" aria-label="DocuHealth modules">
              <header className="module-list__head">
                <h2>Modules</h2>
                <p>Select a workflow to view telemetry and contacts.</p>
              </header>
              <div className="module-list__items">
                {modules.map((module) => {
                  const isActive = module.slug === selectedModuleSlug;
                  return (
                    <button
                      key={module.slug}
                      type="button"
                      className={`module-item${isActive ? ' is-active' : ''}`}
                      onClick={() => handleModuleSelect(module.slug)}
                    >
                      <span className="module-item__icon" aria-hidden="true">
                        {module.icon}
                      </span>
                      <span className="module-item__body">
                        <span className="module-item__name">{module.name}</span>
                        <span className="module-item__summary">{module.summary}</span>
                      </span>
                      <span className="module-item__meta">
                        <span className={`badge badge--${module.status === 'Operational' ? 'success' : 'warning'}`}>
                          {module.status}
                        </span>
                        {module.lastRun && (
                          <span className="module-item__time">{formatRelativeTime(module.lastRun)}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {!modules.length && <p className="empty-state">No modules configured.</p>}
              </div>
            </section>

            <section className="module-detail card" aria-live="polite">
              {loadingModuleSlug && !selectedModule ? (
                <div className="module-detail__empty">
                  <p>Loading module details…</p>
                </div>
              ) : selectedModule ? (
                <>
                  <header className="module-detail__header">
                    <div>
                      <p className="module-detail__eyebrow">Workflow detail</p>
                      <h2>{selectedModule.name}</h2>
                    </div>
                    <div className="module-detail__status">
                      <span
                        className={`badge badge--${selectedModule.status === 'Operational' ? 'success' : 'warning'}`}
                      >
                        {selectedModule.status}
                      </span>
                      {selectedModule.lastSynced && (
                        <span className="module-detail__time">Last sync {formatRelativeTime(selectedModule.lastSynced)}</span>
                      )}
                    </div>
                  </header>
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
                      <h3>Recent activity</h3>
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
                      <h3>Next steps</h3>
                      <ul className="checklist">
                        {selectedModule.nextSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(selectedModule.contacts ?? []).length > 0 && (
                    <div className="module-detail__section">
                      <h3>Points of contact</h3>
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
          </aside>
        </main>

        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

