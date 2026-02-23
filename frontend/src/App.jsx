import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
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
import logoImg from "./images/tv-screen-remote-dark-icon200x200-e1496744846203.webp";
import ScrollReveal from "./components/ScrollReveal.jsx";
import ClusterOverview from "./components/ClusterOverview.jsx";
import "./team-dropdown.css";

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
  marital: [],
};

const FILTER_LABELS = {
  cluster: "Segment",
  age_group: "Age",
  dwelling: "Dwelling",
  education: "Education",
  gender: "Gender",
  homeowner: "Homeowner",
  marital: "Marital",
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
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamClosing, setTeamClosing] = useState(false);
  const teamCloseTimer = useRef(null);
  const [collapseSignal, setCollapseSignal] = useState(0);

  const closeTeam = useCallback(() => {
    if (!teamOpen || teamClosing) return;
    setTeamClosing(true);
    clearTimeout(teamCloseTimer.current);
    teamCloseTimer.current = setTimeout(() => {
      setTeamOpen(false);
      setTeamClosing(false);
    }, 350);
  }, [teamOpen, teamClosing]);

  const toggleTeam = useCallback(() => {
    if (teamOpen) closeTeam();
    else setTeamOpen(true);
  }, [teamOpen, closeTeam]);

  useEffect(() => {
    fetchMetadata()
      .then(setMetadata)
      .catch((e) => setError(e.message));
  }, []);

  const footerRef = useRef(null);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
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

    if (showSimulator || showPersona) {
      fetchSummary(ef)
        .then((s) => { if (!cancelled) { setSummary(s); setCharts(null); setInsights(null); setTableData(null); } })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else if (cv || rankingView !== null || bucketView !== null) {
      fetchSummary(ef)
        .then((s) => {
          if (cancelled) return;
          setSummary(s);
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
      ])
        .then(([s, c, i]) => {
          if (cancelled) return;
          setSummary(s);
          setCharts(c);
          setInsights(i);
        })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => { cancelled = true; };
  }, [filtersKey, clusterViewId, rankingView, bucketView, showSimulator, showPersona]);

  useEffect(() => {
    let cancelled = false;
    const ef = JSON.parse(filtersKey);

    fetchTable(ef, {
      page: tablePage,
      search: tableSearch,
      sortBy: tableSort.by,
      sortDir: tableSort.dir,
      ranking: rankingView || "",
      bucket: bucketView || "",
    })
      .then((t) => { if (!cancelled) setTableData(t); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [filtersKey, tablePage, tableSearch, tableSort.by, tableSort.dir, rankingView, bucketView]);

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

  const handleMaritalBarClick = (entry) => {
    handleChartFilterToggle("marital", String(entry.name));
  };

  const handleResponderBarClick = (entry) => {
    // no filter for responder, just interactive chart
  };

  const activeFilterEntries = Object.entries(filters).filter(([, v]) => v.length > 0);

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
        <div className="header-brand" onClick={() => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); closeTeam(); setCollapseSignal((c) => c + 1); }} style={{ cursor: "pointer" }}>
          <img src={logoImg} alt="Logo" className="header-logo" />
          <div className="header-brand-text">
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
        </div>
        <div className="header-right">
          {loading && <span className="header-loading">Updating...</span>}
          <div className="team-dropdown-wrap">
            <button
              className="team-dropdown-toggle"
              type="button"
              onClick={toggleTeam}
            >
              <span className="team-toggle-desktop">
                <span className="team-toggle-avatars">
                  <span className="team-toggle-dot" style={{ background: "#0891b2" }}>NH</span>
                  <span className="team-toggle-dot" style={{ background: "#1e3a5f" }}>DC</span>
                  <span className="team-toggle-dot" style={{ background: "#4f46e5" }}>LC</span>
                  <span className="team-toggle-dot" style={{ background: "#059669" }}>CD</span>
                </span>
                <span>Team 7</span>
                <span className={`team-dropdown-arrow ${teamOpen ? "open" : ""}`}>&#x25BE;</span>
              </span>
              <span className={`team-hamburger ${teamOpen ? "open" : ""}`}>
                <span className="team-hamburger-bar" />
                <span className="team-hamburger-bar" />
                <span className="team-hamburger-bar" />
              </span>
            </button>
            {teamOpen && (
              <>
                <div className="team-dropdown-backdrop" onClick={closeTeam} />
                <div className={`team-dropdown-menu ${teamClosing ? "team-dropdown-menu--closing" : ""}`}>
                  <div className="team-menu-header">
                    <span className="team-menu-title">Team 7 Members</span>
                    <span className="team-menu-hint">Select a member to view their section</span>
                  </div>

                  <button className="team-dropdown-item" type="button"
                    onClick={() => { closeTeam(); setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(true); setShowPersona(false); }}>
                    <span className="team-avatar" style={{ background: "#0891b2" }}>NH</span>
                    <span className="team-member-info">
                      <span className="team-member-name">Nyla Hall</span>
                      <span className="team-member-role">Chief Executive Officer</span>
                    </span>
                    <span className="team-member-dest">
                      <span className="team-dest-label">Simulator</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </button>

                  <button className="team-dropdown-item" type="button"
                    onClick={() => { closeTeam(); setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); }}>
                    <span className="team-avatar" style={{ background: "#1e3a5f" }}>DC</span>
                    <span className="team-member-info">
                      <span className="team-member-name">Diana Caballero</span>
                      <span className="team-member-role">Chief Marketing Officer</span>
                    </span>
                    <span className="team-member-dest">
                      <span className="team-dest-label">Dashboard</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </button>

                  <button className="team-dropdown-item" type="button"
                    onClick={() => { closeTeam(); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); setClusterViewId("2"); }}>
                    <span className="team-avatar" style={{ background: "#4f46e5" }}>LC</span>
                    <span className="team-member-info">
                      <span className="team-member-name">Livia Chagas</span>
                      <span className="team-member-role">Chief Data Officer</span>
                    </span>
                    <span className="team-member-dest">
                      <span className="team-dest-label">Cluster 2</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </button>

                  <button className="team-dropdown-item" type="button"
                    onClick={() => { closeTeam(); setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(true); }}>
                    <span className="team-avatar" style={{ background: "#059669" }}>CD</span>
                    <span className="team-member-info">
                      <span className="team-member-name">Cartez Dewberry</span>
                      <span className="team-member-role">Chief Data & Analytics Officer</span>
                    </span>
                    <span className="team-member-dest">
                      <span className="team-dest-label">Persona</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
              collapseSignal={collapseSignal}
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
              {activeFilterEntries.length > 0 && (
                <div className="active-filter-bar">
                  <svg className="active-filter-bar-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M1.5 2h13l-5 5.5V12l-3 2V7.5L1.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  <span className="active-filter-bar-label">Filtered:</span>
                  {activeFilterEntries.map(([key, vals]) => (
                    <span key={key} className="active-filter-chip">
                      <span className="active-filter-chip-key">{FILTER_LABELS[key]}</span>
                      <span className="active-filter-chip-vals">{vals.join(", ")}</span>
                      <button className="active-filter-chip-x" type="button" onClick={() => handleFilterChange(key, [])} title={`Clear ${FILTER_LABELS[key]}`}>&times;</button>
                    </span>
                  ))}
                  <span className="active-filter-bar-count">{summary?.total_customers?.toLocaleString() ?? "—"} customers</span>
                  <button className="active-filter-bar-clear" type="button" onClick={handleReset}>Clear All</button>
                </div>
              )}

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
                  onMaritalClick={handleMaritalBarClick}
                />
              </ScrollReveal>

              {filters.cluster.length === 0 && insights?.cluster_summary?.length > 0 && (
                <ScrollReveal delay={140}>
                  <ClusterOverview clusters={insights.cluster_summary} />
                </ScrollReveal>
              )}

              {filters.cluster.length === 0 && (
                <ScrollReveal delay={180}>
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

      <footer className="app-footer" ref={footerRef}>
        <div className="footer-top" onClick={() => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); closeTeam(); setCollapseSignal((c) => c + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ cursor: "pointer" }}>
          <img src={logoImg} alt="Logo" className="footer-logo" />
          <div className="footer-top-text">
            <span className="footer-brand">Customer Insights Dashboard</span>
            <span className="footer-team-label">Team 7</span>
          </div>
        </div>

        <div className="footer-rule" />

        <div className="footer-members">
          {[
            { initials: "NH", color: "#0891b2", name: "Nyla Hall", role: "Chief Executive Officer", action: () => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(true); setShowPersona(false); } },
            { initials: "DC", color: "#1e3a5f", name: "Diana Caballero", role: "Chief Marketing Officer", action: () => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); } },
            { initials: "LC", color: "#4f46e5", name: "Livia Chagas", role: "Chief Data Officer", action: () => { setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(false); setClusterViewId("2"); } },
            { initials: "CD", color: "#059669", name: "Cartez Dewberry", role: "Chief Data & Analytics Officer", action: () => { setClusterViewId(null); setRankingView(null); setBucketView(null); setShowSimulator(false); setShowPersona(true); } },
          ].map((m, i) => (
            <button key={i} className="footer-member" type="button" onClick={() => { m.action(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <span className="footer-avatar" style={{ background: m.color }}>{m.initials}</span>
              <span className="footer-member-name">{m.name}</span>
              <span className="footer-member-role">{m.role}</span>
            </button>
          ))}
        </div>

        <div className="footer-rule" />

        <span className="footer-copy">© 2026 Cable & Satellite Customer Insights &middot; Team 7</span>
      </footer>

      <button
        className={`scroll-to-top ${showScrollTop && !footerVisible ? "scroll-to-top--visible" : ""}`}
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
