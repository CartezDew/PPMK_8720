const PRIMARY_KPIS = [
  { key: "total_customers", label: "Total Customers", format: "number", hero: true },
  { key: "total_profit", label: "Total Profit", format: "currency", hero: true },
  { key: "avg_profit", label: "Avg Profit / Customer", format: "currency" },
  { key: "median_profit", label: "Median Profit", format: "currency" },
  { key: "total_receivers", label: "Total Receivers", format: "number" },
  { key: "total_ppv_orders", label: "PPV Orders (12 Mo)", format: "number" },
];

const REVENUE_KPIS = [
  { key: "receiver_revenue", label: "Receiver Revenue", unit: "$50/yr per receiver" },
  { key: "ppv_revenue", label: "PPV Revenue", unit: "$2/order" },
  { key: "dvr_revenue", label: "DVR Revenue", unit: "$20/yr per service" },
  { key: "hd_revenue", label: "HD Revenue", unit: "$10/yr per service" },
];

const ADOPTION_KPIS = [
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

function profitPct(value, total) {
  if (!total || !value) return "0.00";
  return ((value / total) * 100).toFixed(2);
}

function RevenueCard({ label, value, pct, unit }) {
  return (
    <div className="kpi-card kpi-card-revenue">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{fmt(value, "currency")}</span>
      <div className="kpi-profit-share">
        <div className="kpi-share-bar-track">
          <div
            className="kpi-share-bar-fill"
            style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
          />
        </div>
        <span className="kpi-share-pct">{pct}% of total profit</span>
      </div>
      <span className="kpi-unit">{unit}</span>
    </div>
  );
}

export default function KpiCards({ data }) {
  const totalProfit = data?.total_profit || 0;

  return (
    <section id="section-kpi" className="kpi-container">
      <div className="kpi-section">
        <h3 className="kpi-section-title">Customer Overview</h3>
        <div className="kpi-grid">
          {PRIMARY_KPIS.map(({ key, label, format, hero }) => (
            <div className={`kpi-card${hero ? " kpi-hero" : ""}`} key={key}>
              <span className="kpi-label">{label}</span>
              <span className="kpi-value">{data ? fmt(data[key], format) : "\u2014"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="kpi-section">
        <h3 className="kpi-section-title">Revenue by Service</h3>
        <div className="kpi-grid">
          {[...REVENUE_KPIS]
            .sort((a, b) => (data?.[b.key] || 0) - (data?.[a.key] || 0))
            .map(({ key, label, unit }) => (
            <RevenueCard
              key={key}
              label={label}
              value={data?.[key]}
              pct={data ? profitPct(data[key], totalProfit) : "0.00"}
              unit={unit}
            />
          ))}
          {ADOPTION_KPIS.map(({ key, label, format }) => (
            <div className="kpi-card" key={key}>
              <span className="kpi-label">{label}</span>
              <span className="kpi-value">{data ? fmt(data[key], format) : "\u2014"}</span>
              <span className="kpi-unit">% of customers with service</span>
            </div>
          ))}
        </div>
        <p className="kpi-footnote">
          <strong>Total Profit</strong> = Receiver Profit + PPV Order Profit + DVR Service Profit + HD Service Profit
        </p>
      </div>
    </section>
  );
}
