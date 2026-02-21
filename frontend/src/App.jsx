import { useState, useEffect, useCallback } from "react";
import {
  fetchMetadata,
  fetchSummary,
  fetchCharts,
  fetchInsights,
  fetchTable,
} from "./api.js";
import Filters from "./components/Filters.jsx";
import KpiCards from "./components/KpiCards.jsx";
import Charts from "./components/Charts.jsx";
import CustomerInsights from "./components/CustomerInsights.jsx";
import DataTable from "./components/DataTable.jsx";
import ClusterBanner from "./components/ClusterBanner.jsx";

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
  const [insights, setInsights] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSort, setTableSort] = useState({ by: "Total Profit", dir: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchMetadata()
      .then(setMetadata)
      .catch((e) => setError(e.message));
  }, []);

  const isClusterView = filters.cluster.length === 1;

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError(null);

    const tablePromise = fetchTable(filters, {
      page: tablePage,
      search: tableSearch,
      sortBy: tableSort.by,
      sortDir: tableSort.dir,
    });

    if (isClusterView) {
      Promise.all([fetchSummary(filters), tablePromise])
        .then(([s, t]) => {
          setSummary(s);
          setTableData(t);
          setCharts(null);
          setInsights(null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        fetchSummary(filters),
        fetchCharts(filters),
        fetchInsights(filters),
        tablePromise,
      ])
        .then(([s, c, i, t]) => {
          setSummary(s);
          setCharts(c);
          setInsights(i);
          setTableData(t);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [filters, tablePage, tableSearch, tableSort, isClusterView]);

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
    <div className={`app-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <header className="app-header">
        <div className="header-brand">
          <h1>
            {isClusterView
              ? `Cluster ${filters.cluster[0]} — Customer Insights`
              : "Customer Insights Dashboard"}
          </h1>
          <span className="header-subtitle">
            {isClusterView
              ? `Viewing Segment ${filters.cluster[0]} customers`
              : "Cable & Satellite Service Analytics"}
          </span>
        </div>
        {loading && <span className="header-loading">Updating...</span>}
      </header>

      <aside className="sidebar">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((o) => !o)}
          title={sidebarOpen ? "Collapse filters" : "Expand filters"}
        >
          <span className={`sidebar-toggle-arrow ${sidebarOpen ? "" : "collapsed"}`}>&#x2039;</span>
        </button>
        {sidebarOpen && metadata && (
          <Filters
            metadata={metadata}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            onSelectCluster={(id) => handleFilterChange("cluster", [id])}
          />
        )}
      </aside>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        {isClusterView ? (
          <>
            <ClusterBanner
              clusterId={filters.cluster[0]}
              summaryData={summary}
              onClose={() => handleFilterChange("cluster", [])}
            />

            <DataTable
              data={tableData}
              filters={filters}
              search={tableSearch}
              sort={tableSort}
              page={tablePage}
              onSearchChange={handleSearchChange}
              onSortChange={handleSortChange}
              onPageChange={setTablePage}
            />
          </>
        ) : (
          <>
            <KpiCards data={summary} />

            <Charts data={charts} />

            <CustomerInsights data={insights} charts={charts} />

            <DataTable
              data={tableData}
              filters={filters}
              search={tableSearch}
              sort={tableSort}
              page={tablePage}
              onSearchChange={handleSearchChange}
              onSortChange={handleSortChange}
              onPageChange={setTablePage}
            />
          </>
        )}
      </main>
    </div>
  );
}
