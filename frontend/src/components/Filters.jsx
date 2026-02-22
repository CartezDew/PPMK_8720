import { useState } from "react";

function SectionIcon({ type }) {
  const icons = {
    filters: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 2h13l-5 5.5V12l-3 2V7.5L1.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    insights: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5a4.5 4.5 0 0 1 2.5 8.2V12a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V9.7A4.5 4.5 0 0 1 8 1.5z" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    campaign: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="3.5" y="2.5" width="9" height="3" rx="0.5" fill="currentColor" opacity="0.2"/>
        <path d="M4.5 7.5h2M9.5 7.5h2M4.5 9.5h2M9.5 9.5h2M4.5 11.5h2M9.5 11.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    personas: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  };
  return <span className="sidebar-section-icon">{icons[type]}</span>;
}

const TABS = [
  { id: "filters", icon: "filters", label: "Filters", shortLabel: "Filters" },
  { id: "insights", icon: "insights", label: "Key Insights", shortLabel: "Insights" },
  { id: "campaign", icon: "campaign", label: "Campaign Simulator", shortLabel: "Simulator" },
  { id: "personas", icon: "personas", label: "Persona (Cluster 3)", shortLabel: "Persona" },
];

function InsightLink({ label, targetId, icon, onClick, badge }) {
  const iconMap = {
    cluster: "📊",
    top: "▲",
    bottom: "▼",
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button className="insight-nav-item" type="button" onClick={handleClick}>
      <span className={`insight-nav-icon insight-nav-icon--${icon}`}>{iconMap[icon]}</span>
      <span className="insight-nav-label">{label}</span>
      {badge && <span className="insight-rank-badge" title={badge.title}>{badge.emoji}</span>}
      <span className="insight-nav-arrow">→</span>
    </button>
  );
}

function MultiSelect({ label, options, selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const toggle = (val) => {
    if (disabled) return;
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next);
  };

  return (
    <div className={`filter-group ${disabled ? "filter-group--disabled" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="filter-label">{label}</span>
        <span className="filter-badge">
          {selected.length ? selected.length : "All"}
        </span>
        <span className={`filter-arrow ${open ? "open" : ""}`}>&#x25BE;</span>
      </button>

      {open && !disabled && (
        <div className="filter-options">
          {options.map((opt) => (
            <label key={opt} className="filter-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const FILTER_DEFS = [
  { key: "cluster", label: "Customer Segment" },
  { key: "age_group", label: "Age Group" },
  { key: "dwelling", label: "Dwelling Type" },
  { key: "education", label: "Education Level" },
  { key: "gender", label: "Gender" },
  { key: "homeowner", label: "Homeownership" },
];

export default function Filters({ metadata, filters, onChange, onReset, onSelectCluster, onSelectRanking, onSelectBucket, onLaunchSimulator, onSelectPersona, filtersDisabled }) {
  const [activeTab, setActiveTab] = useState("filters");
  const hasActive = Object.values(filters).some((v) => v.length > 0);

  const toggleTab = (id) => setActiveTab((prev) => (prev === id ? null : id));

  const sectionContent = {
    filters: (
      <>
        <p className="mobile-panel-title">Segment Filters</p>
        {filtersDisabled && hasActive && (
          <div className="filter-disabled-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Clear filters to view this section</span>
            <button className="filter-disabled-clear" type="button" onClick={onReset}>Clear Filters</button>
          </div>
        )}
        {filtersDisabled && !hasActive && (
          <p className="filter-disabled-hint">Filters are not applicable to this view.</p>
        )}
        {hasActive && !filtersDisabled && (
          <button className="reset-btn" type="button" onClick={onReset}>
            Reset All
          </button>
        )}
        {FILTER_DEFS.map(({ key, label }) => (
          <MultiSelect
            key={key}
            label={label}
            options={metadata[key] || []}
            selected={filters[key]}
            onChange={(vals) => onChange(key, vals)}
            disabled={filtersDisabled}
          />
        ))}
      </>
    ),
    insights: (
      <nav className="insights-nav">
        <p className="mobile-panel-title">Key Insights</p>
        <p className="insights-nav-group-label">Customer Segments</p>
        <InsightLink label="Cluster 1" icon="cluster" onClick={() => onSelectCluster?.("1")} badge={{ emoji: "🥈", title: "#2 by Total Profit" }} />
        <InsightLink label="Cluster 2" icon="cluster" onClick={() => onSelectCluster?.("2")} badge={{ emoji: "🥇", title: "#1 Profit Leader" }} />
        <InsightLink label="Cluster 3" icon="cluster" onClick={() => onSelectCluster?.("3")} badge={{ emoji: "🥉", title: "#3 by Total Profit" }} />

        <p className="insights-nav-group-label">Customer Rankings</p>
        <InsightLink label="Top 10 Customers" icon="top" onClick={() => onSelectRanking?.("top10")} />
        <InsightLink label="Bottom 10 Customers" icon="bottom" onClick={() => onSelectRanking?.("bottom10")} />

        <p className="insights-nav-group-label">Value Tiers</p>
        <InsightLink label="Top 10 Highest Value Tiers" icon="top" onClick={() => onSelectBucket?.("top10")} />
        <InsightLink label="Bottom 10 Lowest Value Tiers" icon="bottom" onClick={() => onSelectBucket?.("bottom10")} />
      </nav>
    ),
    campaign: (
      <div className="insights-nav mobile-action-panel">
        <p className="mobile-panel-title">Campaign Simulator</p>
        <p className="sidebar-sim-desc">Model ROI, NPV, payback period, and breakeven for marketing campaigns.</p>
        <button className="sim-launch-btn" type="button" onClick={() => onLaunchSimulator?.()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
          </svg>
          <span>Launch Campaign Simulator</span>
          <svg className="sim-launch-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    ),
    personas: (
      <div className="insights-nav mobile-action-panel">
        <p className="mobile-panel-title">Persona — Cluster 3</p>
        <p className="sidebar-sim-desc">View a detailed customer persona built from real Cluster 3 data — the Premium Segment.</p>
        <button className="sim-launch-btn persona-launch-btn" type="button" onClick={() => onSelectPersona?.()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
          </svg>
          <span>View Cluster 3 Persona</span>
          <svg className="sim-launch-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    ),
  };

  return (
    <div className="filters-panel">
      <div className="mobile-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-tab ${activeTab === tab.id ? "mobile-tab--active" : ""}`}
            type="button"
            onClick={() => toggleTab(tab.id)}
          >
            <SectionIcon type={tab.icon} />
            <span className="mobile-tab-label">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {TABS.map((tab) => {
        const isOpen = activeTab === tab.id;
        return (
          <div key={tab.id} className={`sidebar-section ${isOpen ? "sidebar-section--open" : ""}`}>
            <button
              className="sidebar-section-header"
              type="button"
              onClick={() => toggleTab(tab.id)}
            >
              <SectionIcon type={tab.icon} />
              <span className="sidebar-section-title">{tab.label}</span>
              <span className="sidebar-section-toggle">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="sidebar-section-body">{sectionContent[tab.id]}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
