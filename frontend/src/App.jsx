import { useState, useEffect, useMemo } from "react";
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
  const [clusterViewId, setClusterViewId] = useState(null);
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

  const isClusterView = clusterViewId !== null;

  const effectiveFilters = useMemo(
    () => isClusterView ? { ...filters, cluster: [clusterViewId] } : filters,
    [filters, isClusterView, clusterViewId]
  );

  const filtersKey = JSON.stringify(effectiveFilters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const ef = JSON.parse(filtersKey);
    const cv = clusterViewId !== null;

    const tablePromise = fetchTable(ef, {
      page: tablePage,
      search: tableSearch,
      sortBy: tableSort.by,
      sortDir: tableSort.dir,
    });

    if (cv) {
      Promise.all([fetchSummary(ef), tablePromise])
        .then(([s, t]) => {
          if (cancelled) return;
          setSummary(s);
          setTableData(t);
          setCharts(null);
          setInsights(null);
        })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      Promise.all([
        fetchSummary(ef),
        fetchCharts(ef),
        fetchInsights(ef),
        tablePromise,
      ])
        .then(([s, c, i, t]) => {
          if (cancelled) return;
          setSummary(s);
          setCharts(c);
          setInsights(i);
          setTableData(t);
        })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => { cancelled = true; };
  }, [filtersKey, clusterViewId, tablePage, tableSearch, tableSort.by, tableSort.dir]);

  const handleFilterChange = (key, values) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
    setTablePage(1);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setClusterViewId(null);
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
              ? `Cluster ${clusterViewId} — Customer Insights`
              : "Customer Insights Dashboard"}
          </h1>
          <span className="header-subtitle">
            {isClusterView
              ? `Viewing Segment ${clusterViewId} customers`
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
            onSelectCluster={(id) => setClusterViewId(id)}
          />
        )}
      </aside>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        {isClusterView ? (
          <>
            <ClusterBanner
              clusterId={clusterViewId}
              filters={effectiveFilters}
              summaryData={summary}
              onClose={() => setClusterViewId(null)}
            />

            <DataTable
              data={tableData}
              filters={effectiveFilters}
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

            {filters.cluster.length === 0 && (
              <CustomerInsights data={insights} charts={charts} />
            )}

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
