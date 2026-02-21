import { useState } from "react";

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next);
  };

  return (
    <div className="filter-group">
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="filter-label">{label}</span>
        <span className="filter-badge">
          {selected.length ? selected.length : "All"}
        </span>
        <span className={`filter-arrow ${open ? "open" : ""}`}>&#x25BE;</span>
      </button>

      {open && (
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

export default function Filters({ metadata, filters, onChange, onReset }) {
  const hasActive = Object.values(filters).some((v) => v.length > 0);

  return (
    <div className="filters-panel">
      <div className="filters-header">
        <h2>Segment Filters</h2>
        {hasActive && (
          <button className="reset-btn" type="button" onClick={onReset}>
            Reset All
          </button>
        )}
      </div>

      {FILTER_DEFS.map(({ key, label }) => (
        <MultiSelect
          key={key}
          label={label}
          options={metadata[key] || []}
          selected={filters[key]}
          onChange={(vals) => onChange(key, vals)}
        />
      ))}
    </div>
  );
}
