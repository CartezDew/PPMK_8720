const KPIS = [
  { key: "total_records", label: "Total Records", format: "number" },
  { key: "total_profit", label: "Total Profit", format: "currency" },
  { key: "average_profit", label: "Avg Profit", format: "currency" },
  { key: "median_profit", label: "Median Profit", format: "currency" },
  { key: "total_receivers", label: "Total Receivers", format: "number" },
  { key: "total_ppv_orders", label: "Total PPV Orders", format: "number" },
];

function fmt(value, format) {
  if (value == null) return "—";
  if (format === "currency") {
    return "$" + Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return Number(value).toLocaleString("en-US");
}

export default function KpiCards({ data }) {
  return (
    <section className="kpi-grid">
      {KPIS.map(({ key, label, format }) => (
        <div className="kpi-card" key={key}>
          <span className="kpi-label">{label}</span>
          <span className="kpi-value">{data ? fmt(data[key], format) : "—"}</span>
        </div>
      ))}
    </section>
  );
}
