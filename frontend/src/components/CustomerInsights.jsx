const DISPLAY_COLS = [
  { key: "Customer Code", label: "Cust. ID" },
  { key: "Total Profit", label: "Total Profit", format: "currency" },
  { key: "# of Receivers", label: "Receivers" },
  { key: "# of PPV Orders (last 12 Months)", label: "PPV Orders" },
  { key: "DVR Service Profit", label: "DVR Rev" },
  { key: "HD Service Profit", label: "HD Rev" },
  { key: "Age Group", label: "Age Group" },
  { key: "Gender", label: "Gender" },
  { key: "Homeowner", label: "Owner" },
  { key: "Dwelling Type Details", label: "Dwelling" },
  { key: "Cluster", label: "Segment" },
];

function fmt(val, format) {
  if (val == null) return "\u2014";
  if (format === "currency") return "$" + Number(val).toLocaleString("en-US");
  if (typeof val === "number") return val.toLocaleString("en-US");
  return val;
}

function MiniTable({ title, accent, rows, columns }) {
  const cols = DISPLAY_COLS.filter((c) => columns.includes(c.key));

  return (
    <div className={`insight-table-card ${accent}`}>
      <h4 className="insight-table-title">{title}</h4>
      <div className="table-wrapper">
        <table className="data-table insight-table">
          <thead>
            <tr>
              <th>#</th>
              {cols.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.key}>{fmt(row[c.key], c.format)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClusterTable({ clusters }) {
  if (!clusters?.length) return null;

  return (
    <div className="insight-table-card accent-blue">
      <h4 className="insight-table-title">Customer Segment Summary</h4>
      <p className="insight-table-desc">
        Strategic overview of each customer segment for targeting decisions.
      </p>
      <div className="table-wrapper">
        <table className="data-table insight-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Customers</th>
              <th>Total Profit</th>
              <th>Avg Profit</th>
              <th>Median Profit</th>
              <th>Avg Receivers</th>
              <th>Avg PPV</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((c) => (
              <tr key={c.cluster}>
                <td>{c.cluster}</td>
                <td>{c.customers.toLocaleString()}</td>
                <td>${c.total_profit.toLocaleString()}</td>
                <td>${c.avg_profit.toLocaleString()}</td>
                <td>${c.median_profit.toLocaleString()}</td>
                <td>{c.avg_receivers}</td>
                <td>{c.avg_ppv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CustomerInsights({ data }) {
  if (!data) return null;

  return (
    <section className="insights-section">
      <h2 className="section-heading">Customer Profitability Analysis</h2>

      <div className="insights-grid">
        <MiniTable
          title="Top 10 Most Profitable Customers"
          accent="accent-green"
          rows={data.top10}
          columns={data.columns}
        />
        <MiniTable
          title="Bottom 10 Least Profitable Customers"
          accent="accent-red"
          rows={data.bottom10}
          columns={data.columns}
        />
      </div>

      <ClusterTable clusters={data.cluster_summary} />
    </section>
  );
}
