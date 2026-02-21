const SORTABLE = [
  "Total Profit",
  "# of Receivers",
  "# of PPV Orders (last 12 Months)",
];

export default function DataTable({
  data,
  search,
  sort,
  page,
  onSearchChange,
  onSortChange,
  onPageChange,
}) {
  if (!data) return null;

  const { columns, rows, total_count, total_pages } = data;

  return (
    <section className="table-section">
      <div className="table-toolbar">
        <h3 className="table-title">Data Table</h3>
        <input
          className="table-search"
          type="text"
          placeholder="Search records…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="table-count">{total_count.toLocaleString()} records</span>
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
                    {col}
                    {active && (
                      <span className="sort-arrow">
                        {sort.dir === "asc" ? " ↑" : " ↓"}
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
                {columns.map((col) => (
                  <td key={col}>
                    {typeof row[col] === "number"
                      ? row[col].toLocaleString("en-US")
                      : row[col]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total_pages > 1 && (
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Prev
          </button>
          <span className="page-info">
            Page {page} of {total_pages}
          </span>
          <button
            disabled={page >= total_pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
