import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

const initialRequestState = {
  featureId: '',
  requesterName: '',
  department: '',
  priority: 'normal',
  notes: '',
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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
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

  useEffect(() => {
    let active = true;

    apiFetch('/dashboard')
      .then((payload) => {
        if (active) {
          setDashboard(payload);
          setBannerError('');
        }
      })
      .catch((error) => {
        if (active) {
          setBannerError(error.message);
        }
      });

    apiFetch('/features')
      .then((payload) => {
        if (active) {
          setFeatures(payload.features ?? []);
          setBannerError('');
        }
      })
      .catch((error) => {
        if (active) {
          setBannerError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFeatureId && features.length > 0) {
      handleFeatureSelect(features[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedFeature = useMemo(
    () => (selectedFeatureId ? featureDetails[selectedFeatureId] : null),
    [featureDetails, selectedFeatureId],
  );

  const handleFeatureSelect = async (feature) => {
    if (!feature) return;
    if (feature.id === selectedFeatureId && featureDetails[feature.id]) {
      return;
    }

    setSelectedFeatureId(feature.id);

    if (featureDetails[feature.id]) {
      return;
    }

    setLoadingFeatureId(feature.id);
    try {
      const payload = await apiFetch(`/features/${feature.id}`);
      setFeatureDetails((prev) => ({ ...prev, [feature.id]: payload }));
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
      setSelectedFeatureId(null);
    } finally {
      setLoadingFeatureId(null);
    }
  };

  const handleLaunchFeature = async () => {
    if (!selectedFeatureId) return;
    try {
      const payload = await apiFetch(`/features/${selectedFeatureId}/actions/launch`, {
        method: 'POST',
      });
      setToast(payload?.message ?? 'Action completed');
      setBannerError('');
    } catch (error) {
      setBannerError(error.message);
    }
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
      const payload = await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify(requestForm),
      });
      setToast(payload?.message ?? 'Request submitted');
      setBannerError('');
      setRequestOpen(false);
      setRequestForm(initialRequestState);
    } catch (error) {
      setBannerError(error.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

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
              Monitor document throughput, validation queues, and integration health across facilities in real time.
            </p>
            {dashboard?.lastUpdated && (
              <p className="hero__timestamp">Updated {formatRelativeTime(dashboard.lastUpdated)}</p>
            )}
          </div>
          <div className="hero__actions">
            {dashboard?.status && <span className="status-pill">{dashboard.status}</span>}
            <button
              type="button"
              className="cta"
              onClick={openRequestModal}
              disabled={!features.length}
            >
              New Request
            </button>
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
                  <article key={item.id ?? item.label} className="stat-card">
                    <div className="stat-card__icon" aria-hidden="true">
                      {item.icon}
                    </div>
                    <div>
                      <p className="stat-card__label">{item.label}</p>
                      <p className="stat-card__value">{item.value}</p>
                    </div>
                    {item.trend && <p className="stat-card__trend">{item.trend}</p>}
                  </article>
                ))}
              </div>
              {(dashboard?.operations ?? []).length > 0 && (
                <div className="dashboard__operations">
                  <h3>Operations</h3>
                  <ul>
                    {dashboard.operations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <nav className="feature-list card" aria-label="DocuHealth modules">
              <div className="feature-list__head">
                <h2>Modules</h2>
                <p>Select a workflow to view live status and run history.</p>
              </div>
              <div className="feature-list__items">
                {features.map((feature) => {
                  const isActive = selectedFeatureId === feature.id;
                  const isLoading = loadingFeatureId === feature.id;
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      className={`feature-list__item${isActive ? ' is-active' : ''}`}
                      onClick={() => handleFeatureSelect(feature)}
                    >
                      <span className="feature-list__icon" aria-hidden="true">
                        {feature.icon}
                      </span>
                      <span className="feature-list__content">
                        <span className="feature-list__name">{feature.name}</span>
                        <span className="feature-list__description">{feature.summary}</span>
                      </span>
                      <span className="feature-list__meta">
                        <span className={`badge badge--${feature.status === 'Operational' ? 'success' : 'warning'}`}>
                          {feature.status}
                        </span>
                        <span className="feature-list__time">{isLoading ? 'Loading…' : feature.lastRun}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </section>

          <aside className={`detail card${selectedFeature ? ' is-active' : ''}`} aria-live="polite">
            {selectedFeature ? (
              <>
                <header className="detail__header">
                  <div>
                    <p className="detail__eyebrow">Workflow detail</p>
                    <h2>{selectedFeature.name}</h2>
                  </div>
                  <div className="detail__status">
                    <span className={`badge badge--${selectedFeature.status === 'Operational' ? 'success' : 'warning'}`}>
                      {selectedFeature.status}
                    </span>
                    {selectedFeature.lastRun && (
                      <span className="detail__time">Last run {selectedFeature.lastRun}</span>
                    )}
                  </div>
                </header>
                <p className="detail__description">{selectedFeature.description}</p>

                {(selectedFeature.metrics ?? []).length > 0 && (
                  <div className="detail__metrics">
                    {selectedFeature.metrics.map((metric) => (
                      <div key={metric.label} className="detail__metric">
                        <span className="detail__metric-label">{metric.label}</span>
                        <span className="detail__metric-value">{metric.value}</span>
                        {metric.caption && <span className="detail__metric-caption">{metric.caption}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {(selectedFeature.recentActivity ?? []).length > 0 && (
                  <div className="detail__section">
                    <h3>Recent activity</h3>
                    <ul className="timeline">
                      {selectedFeature.recentActivity.map((item, index) => (
                        <li key={`${item.time}-${index}`}>
                          <span className="timeline__time">{item.time}</span>
                          <span className="timeline__text">{item.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedFeature.nextSteps ?? []).length > 0 && (
                  <div className="detail__section">
                    <h3>Next steps</h3>
                    <ul className="checklist">
                      {selectedFeature.nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedFeature.contacts ?? []).length > 0 && (
                  <div className="detail__section">
                    <h3>Points of contact</h3>
                    <ul className="contact-list">
                      {selectedFeature.contacts.map((contact) => (
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

                <div className="detail__actions">
                  <button type="button" className="secondary" onClick={handleLaunchFeature}>
                    {selectedFeature.cta ?? 'Launch module'}
                  </button>
                  <button type="button" className="ghost" onClick={openRequestModal}>
                    Raise support ticket
                  </button>
                </div>
              </>
            ) : (
              <div className="detail__empty">
                <h2>Select a module to inspect its live telemetry</h2>
                <p>The panel will populate with run history, performance metrics, and support contacts.</p>
              </div>
            )}
          </aside>
        </main>
      </div>

      {requestOpen && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__backdrop" onClick={closeRequestModal} aria-hidden="true" />
          <div className="modal__body card">
            <header className="modal__header">
              <h2>Submit a workflow request</h2>
              <button type="button" onClick={closeRequestModal} aria-label="Close">
                ×
              </button>
            </header>
            <form className="modal__form" onSubmit={handleSubmitRequest}>
              <label className="field">
                <span>Module</span>
                <select
                  value={requestForm.featureId}
                  onChange={(event) => handleRequestField('featureId', event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a module
                  </option>
                  {features.map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Requester name</span>
                  <input
                    type="text"
                    value={requestForm.requesterName}
                    onChange={(event) => handleRequestField('requesterName', event.target.value)}
                    placeholder="e.g. Dr. Ananya Kulkarni"
                    required
                  />
                </label>
                <label className="field">
                  <span>Department</span>
                  <input
                    type="text"
                    value={requestForm.department}
                    onChange={(event) => handleRequestField('department', event.target.value)}
                    placeholder="Radiology"
                    required
                  />
                </label>
              </div>

              <label className="field">
                <span>Priority</span>
                <select
                  value={requestForm.priority}
                  onChange={(event) => handleRequestField('priority', event.target.value)}
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>

              <label className="field">
                <span>Notes</span>
                <textarea
                  rows="3"
                  value={requestForm.notes}
                  onChange={(event) => handleRequestField('notes', event.target.value)}
                  placeholder="Share additional context so the DocuHealth team can assist quickly."
                />
              </label>

              <button type="submit" className="cta" disabled={submittingRequest}>
                {submittingRequest ? 'Sending…' : 'Submit request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
