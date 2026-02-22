import { useState, useEffect, useMemo, lazy, Suspense } from "react";
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
import DataTable from "./components/DataTable.jsx";
import ScrollReveal from "./components/ScrollReveal.jsx";

const CustomerInsights = lazy(() => import("./components/CustomerInsights.jsx"));
const ClusterBanner = lazy(() => import("./components/ClusterBanner.jsx"));
const RankingBanner = lazy(() => import("./components/RankingBanner.jsx"));
const BucketBanner = lazy(() => import("./components/BucketBanner.jsx"));
const CampaignSimulator = lazy(() => import("./components/CampaignSimulator.jsx"));
const PersonaBanner = lazy(() => import("./components/PersonaBanner.jsx"));

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
  const [rankingView, setRankingView] = useState(null);
  const [bucketView, setBucketView] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showPersona, setShowPersona] = useState(false);
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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    fetchMetadata()
      .then(setMetadata)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isClusterView = clusterViewId !== null;
  const isRankingView = rankingView !== null;
  const isBucketView = bucketView !== null;
  const isDetailView = isClusterView || isRankingView || isBucketView || showSimulator || showPersona;

  useEffect(() => {
    const title = showPersona
      ? "Persona — Cluster 3 | Dashboard"
      : showSimulator
      ? "Campaign Simulator | Dashboard"
      : isClusterView
      ? `Cluster ${clusterViewId} | Dashboard`
      : isRankingView
      ? `${rankingView === "top10" ? "Top 10" : "Bottom 10"} Customers | Dashboard`
      : isBucketView
      ? `${bucketView === "top10" ? "Top" : "Bottom"} Tiers | Dashboard`
      : "Dashboard";
    document.title = title;
  }, [showPersona, showSimulator, isClusterView, clusterViewId, isRankingView, rankingView, isBucketView, bucketView]);

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
      ranking: rankingView || "",
      bucket: bucketView || "",
    });

    if (showSimulator || showPersona) {
      fetchSummary(ef)
        .then((s) => { if (!cancelled) { setSummary(s); setCharts(null); setInsights(null); setTableData(null); } })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else if (cv || rankingView !== null || bucketView !== null) {
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
  }, [filtersKey, clusterViewId, rankingView, bucketView, showSimulator, showPersona, tablePage, tableSearch, tableSort.by, tableSort.dir]);

  const handleFilterChange = (key, values) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
    setTablePage(1);
  };

  const handleChartFilterToggle = (filterKey, value) => {
    setFilters((prev) => {
      const active = prev[filterKey];
      const next = active.includes(value)
        ? active.filter((v) => v !== value)
        : [...active, value];
      return { ...prev, [filterKey]: next };
    });
    setTablePage(1);
  };

  const handleClusterBarClick = (entry) => {
    handleChartFilterToggle("cluster", String(entry.name).replace("Cluster ", ""));
  };

  const handleAgeBarClick = (entry) => {
    handleChartFilterToggle("age_group", String(entry.name));
  };

  const handleGenderBarClick = (entry) => {
    handleChartFilterToggle("gender", String(entry.name));
  };

  const handleHomeownerBarClick = (entry) => {
    handleChartFilterToggle("homeowner", String(entry.name));
  };

  const handleDwellingBarClick = (entry) => {
    handleChartFilterToggle("dwelling", String(entry.name));
  };

  const handleEducationBarClick = (entry) => {
    handleChartFilterToggle("education", String(entry.name));
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setClusterViewId(null);
    setRankingView(null);
    setBucketView(null);
    setShowSimulator(false);
    setShowPersona(false);
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
            {showPersona
              ? "Customer Persona — Cluster 3"
              : showSimulator
              ? "Campaign Simulator"
              : isClusterView
              ? `Cluster ${clusterViewId} — Customer Insights`
              : isRankingView
              ? (rankingView === "top10" ? "Top 10 Most Profitable Customers" : "Bottom 10 Least Profitable Customers")
              : isBucketView
              ? (bucketView === "top10" ? "Top 10 Highest Value Tiers" : "Bottom 10 Lowest Value Tiers")
              : "Customer Insights Dashboard"}
          </h1>
          <span className="header-subtitle">
            {showPersona
              ? "Premium Segment power user profile"
              : showSimulator
              ? "Model financial outcomes for marketing campaigns"
              : isClusterView
              ? `Viewing Segment ${clusterViewId} customers`
              : isRankingView
              ? (rankingView === "top10" ? "Highest value customers by total profit" : "Lowest value customers by total profit")
              : isBucketView
              ? (bucketView === "top10" ? "Customers in the 10 highest profit tiers" : "Customers in the 10 lowest profit tiers")
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
        {metadata && (
          <div className={`sidebar-content ${sidebarOpen ? "" : "sidebar-content--collapsed"}`}>
            <Filters
              metadata={metadata}
              filters={filters}
              filtersDisabled={showSimulator || showPersona}
              onChange={handleFilterChange}
              onReset={handleReset}
              onSelectCluster={(id) => { setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); setClusterViewId(id); }}
              onSelectRanking={(type) => { setClusterViewId(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); setRankingView(type); }}
              onSelectBucket={(type) => { setClusterViewId(null); setRankingView(null); setShowSimulator(false); setShowPersona(false); setBucketView(type); }}
              onLaunchSimulator={() => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowPersona(false); setShowSimulator(true); }}
              onSelectPersona={() => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(true); }}
            />
          </div>
        )}
      </aside>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        <Suspense fallback={<div className="loading-fallback">Loading...</div>}>
          {showPersona ? (
            <PersonaBanner
              filters={filters}
              onClose={() => setShowPersona(false)}
            />
          ) : showSimulator ? (
            <CampaignSimulator
              summaryData={summary}
              onClose={() => setShowSimulator(false)}
            />
          ) : isClusterView ? (
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
          ) : isRankingView ? (
            <>
              <RankingBanner
                rankingType={rankingView}
                filters={filters}
                summaryData={summary}
                onClose={() => setRankingView(null)}
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
                showTotals
                ranking={rankingView}
              />
            </>
          ) : isBucketView ? (
            <>
              <BucketBanner
                bucketType={bucketView}
                filters={filters}
                summaryData={summary}
                onClose={() => setBucketView(null)}
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
                showTotals
                bucket={bucketView}
              />
            </>
          ) : (
            <>
              <ScrollReveal>
                <KpiCards data={summary} />
              </ScrollReveal>

              <ScrollReveal delay={80}>
                <Charts
                  data={charts}
                  onClusterClick={handleClusterBarClick}
                  onAgeClick={handleAgeBarClick}
                  onGenderClick={handleGenderBarClick}
                  onHomeownerClick={handleHomeownerBarClick}
                  onDwellingClick={handleDwellingBarClick}
                  onEducationClick={handleEducationBarClick}
                />
              </ScrollReveal>

              {filters.cluster.length === 0 && (
                <ScrollReveal delay={160} deferRender>
                  <CustomerInsights data={insights} charts={charts} />
                </ScrollReveal>
              )}

              <ScrollReveal delay={200}>
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
              </ScrollReveal>
            </>
          )}
        </Suspense>
      </main>

      <button
        className={`scroll-to-top ${showScrollTop ? "scroll-to-top--visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
