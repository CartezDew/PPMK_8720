import { useState, useMemo } from "react";
import { fetchAllRecords } from "../api.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SORTABLE = [
  "Total Profit",
  "# of Receivers",
  "# of PPV Orders (last 12 Months)",
  "DVR Service Profit",
  "HD Service Profit",
  "Customer Code",
];

const COL_LABELS = {
  "Customer Code": "Customer ID",
  "Cluster": "Segment",
  "Age Group": "Age Group",
  "Total Profit": "Total Profit",
  "# of Receivers": "Receivers",
  "# of PPV Orders (last 12 Months)": "PPV Orders",
  "DVR Service Profit": "DVR Revenue",
  "HD Service Profit": "HD Revenue",
  "Gender": "Gender",
  "Homeowner": "Homeowner",
  "Dwelling Type Details": "Dwelling",
  "Education Status Details": "Education",
};

const CURRENCY_COLS = new Set(["DVR Service Profit", "HD Service Profit", "Total Profit"]);
const SUMMABLE_COLS = new Set([
  "Total Profit", "# of Receivers", "# of PPV Orders (last 12 Months)",
  "DVR Service Profit", "HD Service Profit",
]);

function fmtForExport(val, col) {
  if (val == null) return "";
  if (col === "Customer Code") return String(val);
  if (CURRENCY_COLS.has(col)) return "$" + Number(val).toLocaleString("en-US");
  return val;
}

export default function DataTable({
  data,
  filters,
  search,
  sort,
  page,
  onSearchChange,
  onSortChange,
  onPageChange,
  showTotals = false,
}) {
  const [exporting, setExporting] = useState(false);

  const columns = data?.columns;
  const rows = data?.rows;

  const totalsRow = useMemo(() => {
    if (!showTotals || !rows?.length || !columns) return null;
    const sums = {};
    columns.forEach((col) => {
      if (SUMMABLE_COLS.has(col)) {
        sums[col] = rows.reduce((s, row) => s + (Number(row[col]) || 0), 0);
      }
    });
    return sums;
  }, [showTotals, rows, columns]);

  if (!data) return null;

  const { total_count, total_pages } = data;

  async function handleExportExcel() {
    setExporting(true);
    try {
      const all = await fetchAllRecords(filters || {}, {
        search,
        sortBy: sort.by,
        sortDir: sort.dir,
      });
      const headers = all.columns.map((c) => COL_LABELS[c] || c);
      const sheetRows = all.rows.map((row) =>
        all.columns.map((c) => fmtForExport(row[c], c))
      );
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customer Records");
      XLSX.writeFile(wb, "customer_records.xlsx");
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const all = await fetchAllRecords(filters || {}, {
        search,
        sortBy: sort.by,
        sortDir: sort.dir,
      });
      const headers = all.columns.map((c) => COL_LABELS[c] || c);
      const bodyRows = all.rows.map((row) =>
        all.columns.map((c) => fmtForExport(row[c], c))
      );

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 95);
      doc.text("Customer Records", 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`${all.total_count.toLocaleString()} customers`, 40, 56);

      autoTable(doc, {
        startY: 68,
        head: [headers],
        body: bodyRows,
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
        margin: { left: 30, right: 30 },
      });

      doc.save("customer_records.pdf");
    } catch {
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="table-section">
      <div className="table-toolbar">
        <h3 className="table-title">Customer Records</h3>
        <span className="table-count">
          {total_count.toLocaleString()} customers
        </span>
      </div>

      <div className="table-search-bar">
        <div className="insights-search-wrap">
          <span className="insights-search-icon">&#128269;</span>
          <input
            className="insights-search-input"
            type="text"
            placeholder="Search by customer ID, age group, gender, segment, or any detail..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button className="insights-search-clear" onClick={() => onSearchChange("")}>
              &times;
            </button>
          )}
        </div>
        {search && (
          <p className="insights-search-hint">
            Showing results for &ldquo;{search}&rdquo; &middot; {total_count.toLocaleString()} matches
          </p>
        )}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => {
                const sortable = SORTABLE.includes(col);
                const active = sort.by === col;
                return (
                  <th
                    key={col}
                    className={sortable ? "sortable" : ""}
                    onClick={sortable ? () => onSortChange(col) : undefined}
                  >
                    {COL_LABELS[col] || col}
                    {active && (
                      <span className="sort-arrow">
                        {sort.dir === "asc" ? " \u2191" : " \u2193"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => {
                  const val = row[col];
                  let display;
                  if (col === "Customer Code") {
                    display = String(val);
                  } else if (CURRENCY_COLS.has(col)) {
                    display = "$" + Number(val).toLocaleString("en-US");
                  } else if (typeof val === "number") {
                    display = val.toLocaleString("en-US");
                  } else {
                    display = val;
                  }
                  return <td key={col}>{display}</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
          {totalsRow && (
            <tfoot>
              <tr className="summary-row">
                {columns.map((col, ci) => {
                  if (SUMMABLE_COLS.has(col)) {
                    const val = totalsRow[col];
                    return (
                      <td key={col}>
                        {CURRENCY_COLS.has(col)
                          ? "$" + val.toLocaleString("en-US")
                          : val.toLocaleString("en-US")}
                      </td>
                    );
                  }
                  if (ci === 0) {
                    return <td key={col} className="summary-label">Grand Total</td>;
                  }
                  return <td key={col}></td>;
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {total_pages > 1 && (
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            &larr; Prev
          </button>
          <span className="page-info">
            Page {page} of {total_pages}
          </span>
          <button
            disabled={page >= total_pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next &rarr;
          </button>
        </div>
      )}

      <div className="table-export">
        <p className="table-export-label">Export All {total_count.toLocaleString()} Customer Records</p>
        <div className="insights-export-buttons">
          <button
            className="export-btn export-btn--excel"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <span className="export-btn-icon">&#128196;</span>
            {exporting ? "Exporting..." : "Download Excel"}
          </button>
          <button
            className="export-btn export-btn--pdf"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <span className="export-btn-icon">&#128462;</span>
            {exporting ? "Exporting..." : "Download PDF"}
          </button>
        </div>
      </div>
    </section>
  );
}
