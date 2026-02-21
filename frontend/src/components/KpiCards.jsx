const PRIMARY_KPIS = [
  { key: "total_customers", label: "Total Customers", format: "number" },
  { key: "total_profit", label: "Total Profit", format: "currency" },
  { key: "avg_profit", label: "Avg Profit / Customer", format: "currency" },
  { key: "median_profit", label: "Median Profit", format: "currency" },
  { key: "total_receivers", label: "Total Receivers", format: "number" },
  { key: "total_ppv_orders", label: "PPV Orders (12 Mo)", format: "number" },
];

const SERVICE_KPIS = [
  { key: "receiver_revenue", label: "Receiver Revenue", format: "currency" },
  { key: "ppv_revenue", label: "PPV Revenue", format: "currency" },
  { key: "dvr_revenue", label: "DVR Revenue", format: "currency" },
  { key: "hd_revenue", label: "HD Revenue", format: "currency" },
  { key: "dvr_adoption", label: "DVR Adoption", format: "percent" },
  { key: "hd_adoption", label: "HD Adoption", format: "percent" },
];

function fmt(value, format) {
  if (value == null) return "\u2014";
  if (format === "currency") {
    return "$" + Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  if (format === "percent") return `${value}%`;
  return Number(value).toLocaleString("en-US");
}

function KpiRow({ title, kpis, data }) {
  return (
    <div className="kpi-section">
      <h3 className="kpi-section-title">{title}</h3>
      <div className="kpi-grid">
        {kpis.map(({ key, label, format }) => (
          <div className="kpi-card" key={key}>
            <span className="kpi-label">{label}</span>
            <span className="kpi-value">{data ? fmt(data[key], format) : "\u2014"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KpiCards({ data }) {
  return (
    <section className="kpi-container">
      <KpiRow title="Customer Overview" kpis={PRIMARY_KPIS} data={data} />
      <KpiRow title="Revenue by Service" kpis={SERVICE_KPIS} data={data} />
    </section>
  );
}
