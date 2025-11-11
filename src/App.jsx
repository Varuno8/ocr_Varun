import React from 'react';

const stats = [
  { label: 'Documents scanned today', value: '120', icon: '🗂️' },
  { label: 'Pending validations', value: '10', icon: '⏳' },
  { label: 'Accuracy score', value: '95%', icon: '📈' },
  { label: 'Synced to HIS', value: 'Yes', icon: '🔄' },
];

const features = [
  'Document Scanner',
  'Upload Scans',
  'Medicine Stock Parser',
  'OPD/IPD Form Digitization',
  'Lab Reports Digitization',
  'Audit Logs',
];

function App() {
  return (
    <div className="page">
      <div className="panel">
        <header className="panel__header">
          <div>
            <h1>DocuHealth AI</h1>
            <p>AI-Powered Document Digitization for Government Medical Institutions</p>
          </div>
          <button className="cta">New Request</button>
        </header>

        <section className="dashboard">
          <div className="dashboard__head">
            <h2>Dashboard</h2>
            <span className="status-pill">Live</span>
          </div>
          <div className="stats-grid">
            {stats.map((item) => (
              <article key={item.label} className="stat-card">
                <div className="stat-card__icon" aria-hidden="true">{item.icon}</div>
                <p className="stat-card__label">{item.label}</p>
                <p className="stat-card__value">{item.value}</p>
              </article>
            ))}
          </div>
        </section>

        <nav className="feature-list">
          {features.map((feature) => (
            <button key={feature} className="feature-list__item">
              <span className="feature-list__icon" aria-hidden="true">📄</span>
              <span>{feature}</span>
              <span className="feature-list__chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default App;
