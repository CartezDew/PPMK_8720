import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function MiniTable({ title, accent, rows, columns }) {
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

function ClusterTable({ clusters }) {
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

function downloadExcel(data) {
  const cols = DISPLAY_COLS.filter((c) => (data.columns || []).includes(c.key));
  const headers = cols.map((c) => c.label);

  const toSheetRows = (rows) =>
    rows.map((r) => cols.map((c) => fmtCell(r[c.key], c.type)));

  const wb = XLSX.utils.book_new();

  const topWs = XLSX.utils.aoa_to_sheet([headers, ...toSheetRows(data.top10 || [])]);
  XLSX.utils.book_append_sheet(wb, topWs, "Top 10 Profitable");

  const bottomWs = XLSX.utils.aoa_to_sheet([headers, ...toSheetRows(data.bottom10 || [])]);
  XLSX.utils.book_append_sheet(wb, bottomWs, "Bottom 10 Profitable");

  if (data.cluster_summary?.length) {
    const clusterHeaders = ["Segment", "Customers", "Total Profit", "Avg Profit", "Median Profit", "Avg Receivers", "Avg PPV"];
    const clusterRows = data.cluster_summary.map((c) => [
      c.cluster,
      c.customers,
      `$${c.total_profit.toLocaleString()}`,
      `$${c.avg_profit.toLocaleString()}`,
      `$${c.median_profit.toLocaleString()}`,
      c.avg_receivers,
      c.avg_ppv,
    ]);
    const clusterWs = XLSX.utils.aoa_to_sheet([clusterHeaders, ...clusterRows]);
    XLSX.utils.book_append_sheet(wb, clusterWs, "Segment Summary");
  }

  XLSX.writeFile(wb, "customer_profitability_report.xlsx");
}

function downloadPDF(data) {
  const cols = DISPLAY_COLS.filter((c) => (data.columns || []).includes(c.key));
  const headers = cols.map((c) => c.label);

  const toRows = (rows) =>
    rows.map((r) => cols.map((c) => fmtCell(r[c.key], c.type)));

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  doc.setFontSize(16);
  doc.setTextColor(30, 58, 95);
  doc.text("Customer Profitability Report", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Cable & Satellite Service Analytics", 40, 56);

  let y = 72;

  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Top 10 Most Profitable Customers", 40, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: toRows(data.top10 || []),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });

  y = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Bottom 10 Least Profitable Customers", 40, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: toRows(data.bottom10 || []),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });

  if (data.cluster_summary?.length) {
    y = doc.lastAutoTable.finalY + 20;
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Customer Segment Summary", 40, y);
    y += 4;
    const clusterHeaders = ["Segment", "Customers", "Total Profit", "Avg Profit", "Median Profit", "Avg Receivers", "Avg PPV"];
    const clusterRows = data.cluster_summary.map((c) => [
      c.cluster, c.customers.toLocaleString(), `$${c.total_profit.toLocaleString()}`,
      `$${c.avg_profit.toLocaleString()}`, `$${c.median_profit.toLocaleString()}`,
      c.avg_receivers, c.avg_ppv,
    ]);
    autoTable(doc, {
      startY: y,
      head: [clusterHeaders],
      body: clusterRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save("customer_profitability_report.pdf");
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

      <div className="insights-export">
        <p className="insights-export-label">Export Report</p>
        <div className="insights-export-buttons">
          <button className="export-btn export-btn--excel" onClick={() => downloadExcel(data)}>
            <span className="export-btn-icon">&#128196;</span>
            Download Excel
          </button>
          <button className="export-btn export-btn--pdf" onClick={() => downloadPDF(data)}>
            <span className="export-btn-icon">&#128462;</span>
            Download PDF
          </button>
        </div>
      </div>
    </section>
  );
}
