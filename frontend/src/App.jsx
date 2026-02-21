import { useState, useEffect, useCallback } from "react";
import {
  fetchMetadata,
  fetchSummary,
  fetchCharts,
  fetchTable,
} from "./api.js";
import Filters from "./components/Filters.jsx";
import KpiCards from "./components/KpiCards.jsx";
import Charts from "./components/Charts.jsx";
import DataTable from "./components/DataTable.jsx";

const EMPTY_FILTERS = {
  cluster: [],
  age_group: [],
  dwelling: [],
  education: [],
  gender: [],
  homeowner: [],
};

export default function App() {
  const [metadata, setMetadata] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSort, setTableSort] = useState({ by: "Total Profit", dir: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetadata()
      .then(setMetadata)
      .catch((e) => setError(e.message));
  }, []);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchSummary(filters),
      fetchCharts(filters),
      fetchTable(filters, {
        page: tablePage,
        search: tableSearch,
        sortBy: tableSort.by,
        sortDir: tableSort.dir,
      }),
    ])
      .then(([s, c, t]) => {
        setSummary(s);
        setCharts(c);
        setTableData(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters, tablePage, tableSearch, tableSort]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFilterChange = (key, values) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
    setTablePage(1);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setTablePage(1);
    setTableSearch("");
    setTableSort({ by: "Total Profit", dir: "desc" });
  };

  const handleSearchChange = (val) => {
    setTableSearch(val);
    setTablePage(1);
  };

  const handleSortChange = (col) => {
    setTableSort((prev) => ({
      by: col,
      dir: prev.by === col && prev.dir === "desc" ? "asc" : "desc",
    }));
    setTablePage(1);
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Analytics Dashboard</h1>
        {loading && <span className="header-loading">Updating…</span>}
      </header>

      <aside className="sidebar">
        {metadata && (
          <Filters
            metadata={metadata}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />
        )}
      </aside>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        <KpiCards data={summary} />

        <Charts data={charts} />

        <DataTable
          data={tableData}
          search={tableSearch}
          sort={tableSort}
          page={tablePage}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          onPageChange={setTablePage}
        />
      </main>
    </div>
  );
}
