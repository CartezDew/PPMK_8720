import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import aiIcon from "../images/ai-icon.webp";

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1v9m0 0L5 7m3 3 3-3M2 12v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExportButtons({ onExcel, onPdf }) {
  return (
    <div className="card-export-buttons">
      <button className="card-export-btn card-export-btn--csv" onClick={onExcel} title="Download Excel">
        <DownloadIcon /> <span>CSV</span>
      </button>
      <button className="card-export-btn card-export-btn--pdf" onClick={onPdf} title="Download PDF">
        <DownloadIcon /> <span>PDF</span>
      </button>
    </div>
  );
}

function exportSheetAsExcel(sheetData, headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

function exportTableAsPdf(title, headers, bodyRows, filename) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text(title, 40, 40);
  autoTable(doc, {
    startY: 56,
    head: [headers],
    body: bodyRows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });
  doc.save(filename);
}

const DISPLAY_COLS = [
  { key: "Customer Code", label: "Cust. ID", type: "id" },
  { key: "Total Profit", label: "Total Profit", type: "currency" },
  { key: "# of Receivers", label: "Receivers", type: "number", summary: "sum" },
  { key: "# of PPV Orders (last 12 Months)", label: "PPV Orders", type: "number", summary: "sum" },
  { key: "DVR Service Profit", label: "DVR Rev", type: "currency", summary: "sum" },
  { key: "HD Service Profit", label: "HD Rev", type: "currency", summary: "sum" },
  { key: "Age Group", label: "Age Group", type: "text" },
  { key: "Gender", label: "Gender", type: "text" },
  { key: "Homeowner", label: "Owner", type: "text" },
  { key: "Dwelling Type Details", label: "Dwelling", type: "text" },
  { key: "Cluster", label: "Segment", type: "text" },
];

function fmtCell(val, type) {
  if (val == null) return "\u2014";
  if (type === "id") return String(val);
  if (type === "currency") return "$" + Number(val).toLocaleString("en-US");
  if (type === "number") return Number(val).toLocaleString("en-US");
  return val;
}

function numericVal(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function MiniTable({ title, accent, rows, columns, onExportExcel, onExportPdf }) {
  const cols = DISPLAY_COLS.filter((c) => columns.includes(c.key));

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = rows;

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = cols.find((c) => c.key === sortKey);
    const isNum = col && (col.type === "currency" || col.type === "number" || col.type === "id");
    return [...filtered].sort((a, b) => {
      const av = isNum ? numericVal(a[sortKey]) : String(a[sortKey] ?? "");
      const bv = isNum ? numericVal(b[sortKey]) : String(b[sortKey] ?? "");
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir, cols]);

  const summaryRow = useMemo(() => {
    const summary = {};
    cols.forEach((c) => {
      if (c.key === "Total Profit" || c.summary === "sum") {
        summary[c.key] = sorted.reduce((s, row) => s + numericVal(row[c.key]), 0);
      }
    });
    summary._count = sorted.length;
    return summary;
  }, [sorted, cols]);

  return (
    <div className={`insight-table-card ${accent}`}>
      <div className="insight-table-header">
        <h4 className="insight-table-title">{title}</h4>
        {onExportExcel && onExportPdf && <ExportButtons onExcel={onExportExcel} onPdf={onExportPdf} />}
      </div>
      <div className="table-wrapper">
        <table className="data-table insight-table">
          <thead>
            <tr>
              <th>#</th>
              {cols.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    className="sortable"
                    onClick={() => handleSort(c.key)}
                  >
                    {c.label}
                    {active && (
                      <span className="sort-arrow">
                        {sortDir === "asc" ? " \u2191" : " \u2193"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.key}>{fmtCell(row[c.key], c.type)}</td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="empty-row">
                  No matching records.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td className="summary-label">{summaryRow._count}</td>
              {cols.map((c, ci) => (
                <td key={c.key}>
                  {ci === 0 && !(c.key === "Total Profit" || c.summary === "sum")
                    ? "Grand Total"
                    : ""}
                  {c.key === "Total Profit" || c.summary === "sum"
                    ? fmtCell(summaryRow[c.key], c.type)
                    : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const DETAIL_COLS = [
  { key: "Customer Code", label: "Cust. ID", fmt: (v) => String(v) },
  { key: "Total Profit", label: "Profit", fmt: (v) => `$${Number(v).toLocaleString("en-US")}` },
  { key: "# of Receivers", label: "Receivers", fmt: (v) => Number(v).toLocaleString("en-US") },
  { key: "DVR Service Profit", label: "DVR Rev", fmt: (v) => `$${Number(v).toLocaleString("en-US")}` },
  { key: "HD Service Profit", label: "HD Rev", fmt: (v) => `$${Number(v).toLocaleString("en-US")}` },
  { key: "Age Group", label: "Age", fmt: (v) => v },
  { key: "Gender", label: "Gender", fmt: (v) => v },
  { key: "Cluster", label: "Seg.", fmt: (v) => v },
];

function BucketTable({ title, accent, rows, variant, onExportExcel, onExportPdf }) {
  const isTop = variant === "top";
  const [sortKey, setSortKey] = useState("profit");
  const [sortDir, setSortDir] = useState(isTop ? "desc" : "asc");
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (profit) => {
    setExpanded((prev) => ({ ...prev, [profit]: !prev[profit] }));
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => {
    if (!sorted.length) return { count: 0, sum_profit: 0 };
    return {
      count: sorted.reduce((s, r) => s + (r.count || 0), 0),
      sum_profit: sorted.reduce((s, r) => s + (r.sum_profit || 0), 0),
    };
  }, [sorted]);

  if (!rows?.length) return null;

  const cols = [
    { key: "profit", label: "Profit Bucket" },
    { key: "count", label: "Customers" },
    { key: isTop ? "max_profit" : "min_profit", label: isTop ? "Max Profit" : "Min Profit" },
    { key: "sum_profit", label: "Sum of Profit" },
  ];

  const colSpan = cols.length + 1;

  return (
    <div className={`insight-table-card ${accent}`}>
      <div className="insight-table-header">
        <h4 className="insight-table-title">{title}</h4>
        {onExportExcel && onExportPdf && <ExportButtons onExcel={onExportExcel} onPdf={onExportPdf} />}
      </div>
      <div className="table-wrapper">
        <table className="data-table insight-table">
          <thead>
            <tr>
              <th></th>
              {cols.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th key={c.key} className="sortable" onClick={() => handleSort(c.key)}>
                    {c.label}
                    {active && <span className="sort-arrow">{sortDir === "asc" ? " ↑" : " ↓"}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const canExpand = row.count > 1;
              const isOpen = canExpand && expanded[row.profit];
              const customers = row.customers || [];
              return (
                <>
                  <tr
                    key={`b-${i}`}
                    className={`bucket-row ${isOpen ? "bucket-row-open" : ""} ${canExpand ? "" : "bucket-row-static"}`}
                    onClick={canExpand ? () => toggleExpand(row.profit) : undefined}
                  >
                    <td className="bucket-toggle">
                      {canExpand && (
                        <span className={`bucket-arrow ${isOpen ? "open" : ""}`}>&#x25B6;</span>
                      )}
                    </td>
                    <td>${Number(row.profit).toLocaleString("en-US")}</td>
                    <td>{Number(row.count).toLocaleString("en-US")}</td>
                    <td>${Number(row[isTop ? "max_profit" : "min_profit"]).toLocaleString("en-US")}</td>
                    <td>${Number(row.sum_profit).toLocaleString("en-US")}</td>
                  </tr>
                  {isOpen && customers.length > 0 && (
                    <tr key={`d-${i}`} className="bucket-detail-row">
                      <td colSpan={colSpan} className="bucket-detail-cell">
                        <div className="bucket-detail-wrap">
                          <table className="bucket-detail-table">
                            <thead>
                              <tr>
                                {DETAIL_COLS.map((c) => (
                                  <th key={c.key}>{c.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {customers.map((cust, ci) => (
                                <tr key={ci}>
                                  {DETAIL_COLS.map((c) => (
                                    <td key={c.key}>{c.fmt(cust[c.key])}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {row.count > customers.length && (
                            <p className="bucket-detail-more">
                              Showing {customers.length} of {row.count.toLocaleString()} customers
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td className="summary-label"></td>
              <td>Grand Total</td>
              <td>{totals.count.toLocaleString("en-US")}</td>
              <td></td>
              <td>${totals.sum_profit.toLocaleString("en-US")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ClusterTable({ clusters, onExportExcel, onExportPdf }) {
  const totals = useMemo(() => {
    if (!clusters?.length) return { customers: 0, total_profit: 0 };
    return {
      customers: clusters.reduce((s, c) => s + c.customers, 0),
      total_profit: clusters.reduce((s, c) => s + c.total_profit, 0),
    };
  }, [clusters]);

  if (!clusters?.length) return null;

  return (
    <div className="insight-table-card accent-blue">
      <div className="insight-table-header">
        <div>
          <h4 className="insight-table-title">Customer Segment Summary</h4>
          <p className="insight-table-desc">
            Strategic overview of each customer segment for targeting decisions.
          </p>
        </div>
        {onExportExcel && onExportPdf && <ExportButtons onExcel={onExportExcel} onPdf={onExportPdf} />}
      </div>
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
          <tfoot>
            <tr className="summary-row">
              <td className="summary-label">Grand Total</td>
              <td>{totals.customers.toLocaleString()}</td>
              <td>${totals.total_profit.toLocaleString()}</td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


function fmt$(v) {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 10_000) return "$" + (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function deriveCustomerInsights(data, charts) {
  if (!data) return { takeaways: [], aiRecs: [] };
  const takeaways = [];
  const { top10, bottom10, cluster_summary } = data;

  // Gender analysis from charts
  if (charts?.profit_by_gender?.length) {
    const genders = charts.profit_by_gender;
    const total = genders.reduce((s, g) => s + g.count, 0);
    const female = genders.find((g) => g.name === "Female");
    const male = genders.find((g) => g.name === "Male");
    if (female && male) {
      const fPct = ((female.count / total) * 100).toFixed(0);
      takeaways.push(`${fPct}% of customers are Female (${female.count.toLocaleString()}) but Males average ${fmt$(male.avg_profit)} profit vs ${fmt$(female.avg_profit)} — ${((male.avg_profit / female.avg_profit - 1) * 100).toFixed(0)}% more per customer`);
    }
  }

  // Age analysis
  if (charts?.avg_profit_by_age?.length) {
    const ages = charts.avg_profit_by_age;
    const totalCust = ages.reduce((s, a) => s + a.count, 0);
    const biggest = ages.reduce((a, b) => (a.count > b.count ? a : b));
    const mostProfitable = ages.reduce((a, b) => (a.value > b.value ? a : b));
    const bigPct = ((biggest.count / totalCust) * 100).toFixed(0);
    if (biggest.name === mostProfitable.name) {
      takeaways.push(`${biggest.name} is the largest age group (${bigPct}%, ${biggest.count.toLocaleString()} customers) and most profitable at ${fmt$(biggest.value)} avg`);
    } else {
      takeaways.push(`${biggest.name} is the largest age group (${bigPct}%) but ${mostProfitable.name} is most profitable at ${fmt$(mostProfitable.value)} avg`);
    }
  }

  // Lifestyle interests
  if (charts?.lifestyle_data?.length) {
    const top3 = charts.lifestyle_data.slice(0, 3);
    const names = top3.map((l) => `${l.name} (${l.pct}%)`);
    takeaways.push(`Top interests: ${names.join(", ")} — use these for content & ad targeting`);
  }

  // Education vs profit
  if (charts?.profit_by_education?.length) {
    const edu = charts.profit_by_education;
    const hs = edu.find((e) => e.name === "High School");
    const college = edu.find((e) => e.name === "Completed College");
    if (hs && college) {
      const totalCust = edu.reduce((s, e) => s + e.count, 0);
      const hsPct = ((hs.count / totalCust) * 100).toFixed(0);
      takeaways.push(`${hsPct}% have a High School education (${fmt$(hs.avg_profit)} avg) — College grads earn ${fmt$(college.avg_profit)} avg, ${((college.avg_profit / hs.avg_profit - 1) * 100).toFixed(0)}% more`);
    }
  }

  // Homeownership
  if (charts?.profit_by_homeowner?.length) {
    const ho = charts.profit_by_homeowner;
    const total = ho.reduce((s, h) => s + h.count, 0);
    const renters = ho.find((h) => h.name === "Renter");
    const owners = ho.find((h) => h.name === "Homeowner");
    if (renters && owners) {
      const rPct = ((renters.count / total) * 100).toFixed(0);
      takeaways.push(`${rPct}% are Renters but Homeowners average ${fmt$(owners.avg_profit)} vs ${fmt$(renters.avg_profit)} — ownership signals higher value`);
    }
  }

  // Cluster gap
  if (cluster_summary?.length) {
    const best = cluster_summary.reduce((a, b) => (a.avg_profit > b.avg_profit ? a : b));
    const worst = cluster_summary.reduce((a, b) => (a.avg_profit < b.avg_profit ? a : b));
    const multiplier = (best.avg_profit / worst.avg_profit).toFixed(1);
    takeaways.push(`${best.cluster} customers average ${fmt$(best.avg_profit)} — ${multiplier}x more than ${worst.cluster} (${fmt$(worst.avg_profit)}) driven by receiver count`);
  }

  // Revenue composition
  if (charts?.profit_components?.length) {
    const comps = charts.profit_components;
    const total = comps.reduce((s, c) => s + c.value, 0);
    const top = comps.reduce((a, b) => (a.value > b.value ? a : b));
    const topPct = ((top.value / total) * 100).toFixed(0);
    takeaways.push(`${topPct}% of all revenue comes from ${top.name} — PPV, DVR, and HD are underutilized growth channels`);
  }

  const aiRecs = [
    "Male customers are fewer but 24% more profitable — develop male-targeted premium bundles and sports/entertainment packages to amplify this advantage",
    "25–34 age group is the sweet spot — invest in acquisition campaigns targeting young professionals with multi-device household packages",
    "41% of customers are Computer enthusiasts and 36% are Readers — partner with streaming tech and digital content platforms for bundled offers",
    "Receiver count is the strongest profit driver — incentivize multi-room setups with discounted additional receivers to move mid-tier customers up",
  ];

  return { takeaways, aiRecs };
}

function ProfitabilityInsightsPanel({ data, charts }) {
  const { takeaways, aiRecs } = useMemo(() => deriveCustomerInsights(data, charts), [data, charts]);

  if (!takeaways.length && !aiRecs.length) return null;

  return (
    <div className="profitability-insights-panel">
      {takeaways.length > 0 && (
        <div className="profitability-takeaways">
          <div className="profitability-section-header">
            <svg className="profitability-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C9.2 2 7 4.2 7 7c0 1.4.6 2.7 1.5 3.6.3.3.5.7.5 1.1V13a1 1 0 001 1h4a1 1 0 001-1v-1.3c0-.4.2-.8.5-1.1C16.4 9.7 17 8.4 17 7c0-2.8-2.2-5-5-5z" />
              <path d="M12 2c2.8 0 5 2.2 5 5 0 1.4-.6 2.7-1.5 3.6" />
              <path d="M9.5 7C9.5 5.6 10.6 4.5 12 4.5" />
              <path d="M12 22v-8" />
              <path d="M8 18h8" />
              <path d="M9 21h6" />
            </svg>
            <h4 className="profitability-section-title">Key Takeaways</h4>
          </div>
          <div className="profitability-callouts">
            {takeaways.map((text, i) => (
              <div key={i} className="profitability-callout">
                <span className="profitability-callout-icon">💡</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {aiRecs.length > 0 && (
        <div className="profitability-ai-section">
          <div className="cluster-ai-header">
            <img src={aiIcon} alt="AI" className="cluster-ai-icon" />
            <h4 className="cluster-ai-title">AI-Powered Recommendations</h4>
            <span className="cluster-ai-badge">AI</span>
          </div>
          <div className="cluster-ai-recs">
            {aiRecs.map((text, i) => (
              <div key={i} className="cluster-ai-rec">
                <span className="cluster-ai-rec-num">{i + 1}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerInsights({ data, charts }) {
  const [expanded, setExpanded] = useState(true);

  const cols = DISPLAY_COLS.filter((c) => (data?.columns || []).includes(c.key));
  const miniHeaders = cols.map((c) => c.label);
  const miniToRows = (rows) => rows.map((r) => cols.map((c) => fmtCell(r[c.key], c.type)));

  const exportMiniExcel = useCallback((rows, filename) => {
    exportSheetAsExcel(miniToRows(rows), miniHeaders, filename);
  }, [data]);

  const exportMiniPdf = useCallback((title, rows, filename) => {
    exportTableAsPdf(title, miniHeaders, miniToRows(rows), filename);
  }, [data]);

  if (!data) return null;

  const bucketHeaders = ["Profit Bucket", "Customers", "Max/Min Profit", "Sum of Profit"];
  const bucketToRows = (buckets, profitKey) =>
    (buckets || []).map((r) => [
      `$${Number(r.profit).toLocaleString()}`, r.count,
      `$${Number(r[profitKey]).toLocaleString()}`, `$${Number(r.sum_profit).toLocaleString()}`,
    ]);

  const clusterHeaders = ["Segment", "Customers", "Total Profit", "Avg Profit", "Median Profit", "Avg Receivers", "Avg PPV"];
  const clusterToRows = () =>
    (data.cluster_summary || []).map((c) => [
      c.cluster, c.customers, `$${c.total_profit.toLocaleString()}`,
      `$${c.avg_profit.toLocaleString()}`, `$${c.median_profit.toLocaleString()}`,
      c.avg_receivers, c.avg_ppv,
    ]);

  return (
    <section className="insights-section">
      <button
        className="section-heading section-heading--toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>Customer Profitability Analysis</span>
        <span className="section-heading-indicator">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <>
          <ProfitabilityInsightsPanel data={data} charts={charts} />

          <div className="insights-grid">
            <div id="section-top10">
              <MiniTable
                title="Top 10 Most Profitable Customers"
                accent="accent-green"
                rows={data.top10}
                columns={data.columns}
                onExportExcel={() => exportMiniExcel(data.top10, "top10_customers.xlsx")}
                onExportPdf={() => exportMiniPdf("Top 10 Most Profitable Customers", data.top10, "top10_customers.pdf")}
              />
            </div>
            <div id="section-bottom10">
              <MiniTable
                title="Bottom 10 Least Profitable Customers"
                accent="accent-red"
                rows={data.bottom10}
                columns={data.columns}
                onExportExcel={() => exportMiniExcel(data.bottom10, "bottom10_customers.xlsx")}
                onExportPdf={() => exportMiniPdf("Bottom 10 Least Profitable Customers", data.bottom10, "bottom10_customers.pdf")}
              />
            </div>
          </div>

          <div className="insights-grid">
            <div id="section-top-buckets">
              <BucketTable
                title="Top 10 Profit Buckets"
                accent="accent-green"
                rows={data.top10_buckets}
                variant="top"
                onExportExcel={() => exportSheetAsExcel(bucketToRows(data.top10_buckets, "max_profit"), bucketHeaders, "top10_buckets.xlsx")}
                onExportPdf={() => exportTableAsPdf("Top 10 Profit Buckets", bucketHeaders, bucketToRows(data.top10_buckets, "max_profit"), "top10_buckets.pdf")}
              />
            </div>
            <div id="section-bottom-buckets">
              <BucketTable
                title="Bottom 10 Profit Buckets"
                accent="accent-red"
                rows={data.bottom10_buckets}
                variant="bottom"
                onExportExcel={() => exportSheetAsExcel(bucketToRows(data.bottom10_buckets, "min_profit"), bucketHeaders, "bottom10_buckets.xlsx")}
                onExportPdf={() => exportTableAsPdf("Bottom 10 Profit Buckets", bucketHeaders, bucketToRows(data.bottom10_buckets, "min_profit"), "bottom10_buckets.pdf")}
              />
            </div>
          </div>

          <ClusterTable
            clusters={data.cluster_summary}
            onExportExcel={() => exportSheetAsExcel(clusterToRows(), clusterHeaders, "segment_summary.xlsx")}
            onExportPdf={() => exportTableAsPdf("Customer Segment Summary", clusterHeaders, clusterToRows(), "segment_summary.pdf")}
          />
        </>
      )}
    </section>
  );
}
