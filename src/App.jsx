import React, { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

const initialUploadState = {
  moduleSlug: '',
  documentType: '',
  title: '',
  notes: '',
  uploadedBy: '',
};

const gradientPalette = [
  'linear-gradient(135deg, #5E5CE6, #22D3EE)',
  'linear-gradient(135deg, #F97316, #F43F5E)',
  'linear-gradient(135deg, #8B5CF6, #6366F1)',
  'linear-gradient(135deg, #0EA5E9, #22D3EE)',
  'linear-gradient(135deg, #10B981, #22C55E)',
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

const StatCard = ({ stat }) => (
  <div className="card stat-card">
    <div className="stat-header">
      <span className="stat-icon">{stat.icon}</span>
      <span className="stat-label">{stat.label}</span>
    </div>
    <div className="stat-value">{stat.value}</div>
    <div className="stat-trend">{stat.trend}</div>
  </div>
);

const Pill = ({ children, tone = 'neutral' }) => (
  <span className={`pill pill-${tone}`}>{children}</span>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="section-header">
    <div>
      <h2>{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const ModuleCard = ({ module, onSelect, active }) => (
  <button
    className={`card module-card ${active ? 'active' : ''}`}
    onClick={() => onSelect(module.slug)}
    type="button"
  >
    <div className="module-icon" aria-hidden>
      {module.icon || '📄'}
    </div>
    <div className="module-meta">
      <div className="module-title">{module.name}</div>
      <div className="module-summary">{module.summary}</div>
      <div className="module-tags">
        <Pill tone={module.status === 'Operational' ? 'success' : 'warning'}>
          {module.status}
        </Pill>
        <Pill tone="neutral">{module.category || 'Uncategorized'}</Pill>
        <Pill tone="info">{module.documentTypes.length} doc types</Pill>
      </div>
    </div>
    <div className="module-side">
      <div className="module-number">{module.documentsToday}</div>
      <div className="module-caption">today</div>
    </div>
  </button>
);

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
    [selectedModuleSlug, moduleDetails],
  );

  const onFileChange = (file) => {
    setUploadFile(file);
    if (!file) {
      setUploadPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => setUploadPreview(event.target?.result ?? null);
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (event) => {
    event.preventDefault();
    if (!uploadFile) {
      setToast('Please add a scanned file first.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('moduleSlug', uploadForm.moduleSlug);
      formData.append('documentType', uploadForm.documentType);
      formData.append('title', uploadForm.title);
      formData.append('notes', uploadForm.notes);
      formData.append('uploadedBy', uploadForm.uploadedBy);

      await apiFetch('/documents', {
        method: 'POST',
        body: formData,
      });

      setToast('Document uploaded successfully');
      setUploadFile(null);
      setUploadPreview(null);
      setUploadForm((prev) => ({
        ...prev,
        title: '',
        notes: '',
        uploadedBy: '',
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refreshDashboard();
      refreshAuditLogs();
    } catch (error) {
      setToast(error.message);
    } finally {
      setUploading(false);
    }
  };

  const renderValidationTag = (item) => {
    if (item.priority === 'high') return <Pill tone="warning">High priority</Pill>;
    if (item.status === 'in-review') return <Pill tone="info">In review</Pill>;
    return <Pill tone="neutral">Pending</Pill>;
  };

  return (
    <div className="page">
      <div className="gradient" aria-hidden />
      {bannerError && <div className="banner-error">{bannerError}</div>}
      {toast && <div className="toast">{toast}</div>}

      <header className="hero">
        <div>
          <p className="eyebrow">DocuHealth AI</p>
          <h1>
            Health Record Automation <span>Control Room</span>
          </h1>
          <p className="lede">
            Monitor OCR ingestion, validate edge cases, and keep your HIS in sync with a refined, data-rich
            experience.
          </p>
          <div className="hero-actions">
            <button
              className="btn primary"
              type="button"
              onClick={() => document.getElementById('upload-panel')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Upload new scan
            </button>
            <button className="btn ghost" type="button" onClick={refreshDashboard}>
              Refresh data
            </button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-inner">
            <div className="hero-panel-title">System pulse</div>
            <div className="hero-panel-grid">
              {dashboard?.stats?.slice(0, 3).map((stat) => (
                <div key={stat.id} className="pulse-card">
                  <span className="pulse-icon">{stat.icon}</span>
                  <div>
                    <div className="pulse-label">{stat.label}</div>
                    <div className="pulse-value">{stat.value}</div>
                    <div className="pulse-trend">{stat.trend}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pulse-status">
              <span className={`status-dot ${dashboard?.status === 'Operational' ? 'ok' : 'warn'}`} />
              {dashboard?.status || 'Checking system status...'}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section>
          <SectionHeader title="Live metrics" subtitle="Fresh from the last scan cycle." />
          <div className="grid stats-grid">
            {(dashboard?.stats ?? []).map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Automation modules"
            subtitle="Drill into every pipeline and keep adoption on track."
          />
          <div className="module-grid">
            {modules.map((module) => (
              <ModuleCard
                key={module.slug}
                module={module}
                onSelect={setSelectedModuleSlug}
                active={module.slug === selectedModuleSlug}
              />
            ))}
          </div>
        </section>

        <section className="split">
          <div className="panel">
            <SectionHeader
              title="Module deep-dive"
              subtitle={selectedModule ? `Insights for ${selectedModule.name}` : 'Loading module insights...'}
              action={loadingModuleSlug ? <Pill tone="info">Loading</Pill> : null}
            />
            {selectedModule ? (
              <div className="module-detail">
                <div className="detail-meta">
                  <div className="detail-icon">{selectedModule.icon || '📁'}</div>
                  <div>
                    <h3>{selectedModule.name}</h3>
                    <p className="detail-desc">{selectedModule.description}</p>
                    <div className="module-tags">
                      <Pill tone={selectedModule.status === 'Operational' ? 'success' : 'warning'}>
                        {selectedModule.status}
                      </Pill>
                      <Pill tone="info">Accuracy {selectedModule.accuracy ?? '—'}%</Pill>
                      <Pill tone="neutral">{selectedModule.documentTypes.length} doc types</Pill>
                    </div>
                  </div>
                </div>
                <div className="detail-grid">
                  {selectedModule.metrics?.map((metric) => (
                    <div key={metric.label} className="card metric-card">
                      <div className="metric-label">{metric.label}</div>
                      <div className="metric-value">{metric.value}</div>
                      {metric.caption && <div className="metric-caption">{metric.caption}</div>}
                    </div>
                  ))}
                </div>
                <div className="detail-columns">
                  <div>
                    <h4>Recent activity</h4>
                    <ul className="timeline">
                      {selectedModule.recentActivity?.map((item, index) => (
                        <li key={`${item.time}-${index}`}>
                          <span className="dot" />
                          <div>
                            <div className="timeline-detail">{item.detail}</div>
                            <div className="timeline-time">{formatRelativeTime(item.time)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Next steps</h4>
                    <ul className="pill-list">
                      {selectedModule.nextSteps?.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Escalation matrix</h4>
                    <ul className="contacts">
                      {selectedModule.contacts?.map((contact) => (
                        <li key={contact.name}>
                          <div className="contact-name">{contact.name}</div>
                          <div className="contact-meta">{contact.role}</div>
                          <div className="contact-meta">{contact.email}</div>
                          {contact.phone && <div className="contact-meta">{contact.phone}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty">Select a module to view details.</div>
            )}
          </div>

          <div className="panel" id="upload-panel">
            <SectionHeader
              title="Upload scanner feed"
              subtitle="Drop in a scan and let DocuHealth AI route it into the HIS."
            />
            <form className="upload-form" onSubmit={handleUploadSubmit}>
              <div className="upload-drop" onClick={() => fileInputRef.current?.click()} role="presentation">
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Preview" className="upload-preview" />
                ) : (
                  <>
                    <div className="upload-icon">⬆️</div>
                    <p>Drop your scanned PDF or image here</p>
                    <small>Max 25MB • HIPAA-safe</small>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  hidden
                  onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                />
              </div>

              <div className="form-grid">
                <label>
                  Module
                  <select
                    value={uploadForm.moduleSlug}
                    onChange={(event) =>
                      setUploadForm((prev) => ({ ...prev, moduleSlug: event.target.value }))
                    }
                  >
                    {modules.map((module) => (
                      <option key={module.slug} value={module.slug}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Document type
                  <select
                    value={uploadForm.documentType}
                    onChange={(event) =>
                      setUploadForm((prev) => ({ ...prev, documentType: event.target.value }))
                    }
                  >
                    {availableDocumentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Friendly title
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="OPD Intake #42"
                />
              </label>

              <label>
                Operator notes
                <textarea
                  value={uploadForm.notes}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Field observations, patient ID, or hand-off instructions"
                />
              </label>

              <label>
                Uploaded by
                <input
                  type="text"
                  value={uploadForm.uploadedBy}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, uploadedBy: event.target.value }))}
                  placeholder="QA Nurse Team"
                />
              </label>

              <button className="btn primary full" type="submit" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Send to pipeline'}
              </button>
            </form>
          </div>
        </section>

        <section className="split">
          <div className="panel">
            <SectionHeader
              title="Validation queue"
              subtitle="Items needing human-in-the-loop review."
            />
            <div className="list">
              {pendingValidations.map((item, index) => (
                <div key={item.id} className="card list-item">
                  <div className="badge" style={{ background: gradientPalette[index % gradientPalette.length] }}>
                    {item.priority === 'high' ? '🔥' : '✅'}
                  </div>
                  <div className="list-meta">
                    <div className="list-title">{item.document.title}</div>
                    <div className="list-sub">{item.document.type}</div>
                    <div className="list-sub">{item.document.module?.name || 'Unassigned module'}</div>
                    <div className="list-tags">
                      {renderValidationTag(item)}
                      <Pill tone="neutral">Due {formatRelativeTime(item.dueAt)}</Pill>
                    </div>
                  </div>
                  <div className="list-side">
                    <div className="list-time">{formatRelativeTime(item.document.uploadedAt)}</div>
                    <div className="list-actor">{item.document.uploadedBy}</div>
                  </div>
                </div>
              ))}
              {pendingValidations.length === 0 && <div className="empty">No validations pending.</div>}
            </div>
          </div>

          <div className="panel">
            <SectionHeader
              title="Recent documents"
              subtitle="Fresh uploads from the field and hospital scanners."
            />
            <div className="list">
              {recentDocuments.map((doc, index) => (
                <div key={doc.id} className="card list-item">
                  <div className="badge" style={{ background: gradientPalette[(index + 2) % gradientPalette.length] }}>
                    {doc.module?.slug ? doc.module.slug.slice(0, 2).toUpperCase() : 'DH'}
                  </div>
                  <div className="list-meta">
                    <div className="list-title">{doc.title}</div>
                    <div className="list-sub">{doc.documentType}</div>
                    <div className="list-sub">{doc.module?.name || 'Unassigned module'}</div>
                    <div className="list-tags">
                      <Pill tone={doc.status === 'Validated' ? 'success' : 'warning'}>{doc.status}</Pill>
                      {doc.confidence && <Pill tone="info">{doc.confidence}%</Pill>}
                      <Pill tone={doc.hisSynced ? 'success' : 'warning'}>
                        {doc.hisSynced ? 'HIS synced' : 'Awaiting sync'}
                      </Pill>
                    </div>
                  </div>
                  <div className="list-side">
                    <div className="list-time">{formatRelativeTime(doc.uploadedAt)}</div>
                    <div className="list-actor">{doc.uploadedBy}</div>
                  </div>
                </div>
              ))}
              {recentDocuments.length === 0 && <div className="empty">No documents yet.</div>}
            </div>
          </div>
        </section>

        <section className="split">
          <div className="panel">
            <SectionHeader
              title="Inventory guardrails"
              subtitle="Monitor critical consumables for scanning stations."
            />
            <div className="table">
              <div className="table-head">
                <span>Item</span>
                <span>Status</span>
                <span>Quantity</span>
                <span>Updated</span>
              </div>
              {medicineStock.map((item) => (
                <div key={item.id} className="table-row">
                  <span>{item.itemName}</span>
                  <span>
                    <Pill tone={item.status === 'ok' ? 'success' : 'warning'}>
                      {item.status === 'ok' ? 'Healthy' : 'Reorder now'}
                    </Pill>
                  </span>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                  <span>{formatRelativeTime(item.lastUpdated)}</span>
                </div>
              ))}
              {medicineStock.length === 0 && <div className="empty">Inventory data not available.</div>}
            </div>
          </div>

          <div className="panel">
            <SectionHeader title="Audit trail" subtitle="Every action accounted for." />
            <div className="timeline vertical">
              {auditLogs.map((log) => (
                <div key={log.id} className="timeline-card">
                  <div className="dot" />
                  <div>
                    <div className="timeline-detail">{log.action}</div>
                    <div className="timeline-time">{formatRelativeTime(log.createdAt)}</div>
                    <div className="timeline-extra">{log.detail}</div>
                    <div className="timeline-extra">{log.module?.name || 'System'}</div>
                    <div className="timeline-extra">{log.actor || 'Automated pipeline'}</div>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && <div className="empty">No audit activity captured yet.</div>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
