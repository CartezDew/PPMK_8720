import { useState, useMemo, useCallback } from "react";
import ScrollReveal from "./ScrollReveal";

const CLUSTER_COLORS = ["#0891b2", "#4f46e5", "#059669"];
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function fmt$(v) {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1_000) return "$" + Math.round(n / 1_000).toLocaleString() + "";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const PYTHON_CODE = `import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# 1) Load
df = xl("Data[#All]", headers=True)

# 2) Clean bad numeric values so Excel doesn't show #NUM!
df = df.replace([np.inf, -np.inf], np.nan)
df = df.dropna(subset=["Customer Code"])  # keep only real customers

# 3) Pick ONLY numeric columns for clustering (simple + reliable)
features = [
    "# of Receivers",
    "Profit per Receiver",
    "# of PPV Orders (last 12 Months)",
    "Profit per PPV order",
    "DVR Service",
    "DVR Service Profit",
    "HD Programming Service",
    "HD Service Profit",
    "Total Profit",
    "Responder Rating",
    "Est. Mortgage Loan Amount",
    "Age",
    "Household Income",
    "Number of Total Rooms"
]

features = [c for c in features if c in df.columns]

# convert to numbers safely
X = df[features].apply(pd.to_numeric, errors="coerce")

# drop rows that can't be used for clustering (missing all features)
mask = X.notna().sum(axis=1) > 0
df = df.loc[mask].copy()
X = X.loc[mask].fillna(0)

# 4) Scale + KMeans
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

k = 5  # change to 3, 4, 5, etc.
kmeans = KMeans(n_clusters=k, n_init=50, random_state=42)
df["Cluster"] = kmeans.fit_predict(X_scaled) + 1   # +1 makes clusters 1..k

# 5) Output (cluster is now included)
df`;

function deriveTakeaways(clusters) {
  if (!clusters?.length) return [];
  const sorted = [...clusters].sort((a, b) => b.total_profit - a.total_profit);
  const top = sorted[0];
  const totalCustomers = clusters.reduce((s, c) => s + c.customers, 0);
  const totalProfit = clusters.reduce((s, c) => s + c.total_profit, 0);
  const takeaways = [];

  takeaways.push({
    icon: "🏆",
    text: `${top.cluster} leads in total profit with ${fmt$(top.total_profit)} (${((top.total_profit / totalProfit) * 100).toFixed(0)}% of total), driven by ${top.customers.toLocaleString()} customers.`,
  });

  const highestAvg = [...clusters].sort((a, b) => b.avg_profit - a.avg_profit)[0];
  const lowestAvg = [...clusters].sort((a, b) => a.avg_profit - b.avg_profit)[0];
  const multiplier = (highestAvg.avg_profit / lowestAvg.avg_profit).toFixed(1);
  takeaways.push({
    icon: "📊",
    text: `${highestAvg.cluster} has the highest avg profit at ${fmt$(highestAvg.avg_profit)} per customer — ${multiplier}× more than ${lowestAvg.cluster} (${fmt$(lowestAvg.avg_profit)}).`,
  });

  const largest = [...clusters].sort((a, b) => b.customers - a.customers)[0];
  const largestPct = ((largest.customers / totalCustomers) * 100).toFixed(0);
  takeaways.push({
    icon: "👥",
    text: `${largest.cluster} is the largest segment with ${largest.customers.toLocaleString()} customers (${largestPct}%), representing the broadest market reach.`,
  });

  const highestMedian = [...clusters].sort((a, b) => b.median_profit - a.median_profit)[0];
  takeaways.push({
    icon: "💎",
    text: `${highestMedian.cluster} has the highest median profit (${fmt$(highestMedian.median_profit)}), indicating consistently high-value customers rather than outlier-driven averages.`,
  });

  const highestReceivers = [...clusters].sort((a, b) => b.avg_receivers - a.avg_receivers)[0];
  takeaways.push({
    icon: "📡",
    text: `${highestReceivers.cluster} leads in avg receivers (${highestReceivers.avg_receivers}) — receiver count is the strongest profit driver across all segments.`,
  });

  return takeaways;
}

export default function ClusterOverview({ clusters }) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const takeaways = useMemo(() => deriveTakeaways(clusters), [clusters]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(PYTHON_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (!clusters?.length) return null;

  const sorted = [...clusters].sort((a, b) => b.total_profit - a.total_profit);

  return (
    <section className="cluster-overview">
      <h3 className="cluster-overview-heading">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C9.2 2 7 4.2 7 7c0 1.4.6 2.7 1.5 3.6.3.3.5.7.5 1.1V13a1 1 0 001 1h4a1 1 0 001-1v-1.3c0-.4.2-.8.5-1.1C16.4 9.7 17 8.4 17 7c0-2.8-2.2-5-5-5z" />
          <path d="M12 22v-8" />
          <path d="M8 18h8" />
          <path d="M9 21h6" />
        </svg>
        Segment Overview
      </h3>
      <p className="cluster-overview-subtitle">
        High-level comparison of the top customer segments — explore each cluster's insights page for detailed analysis.
      </p>

      <div className="cluster-overview-cards">
        {sorted.slice(0, 3).map((c, i) => (
          <ScrollReveal key={c.cluster} delay={i * 100}>
            <div className="cluster-overview-card" style={{ borderTopColor: CLUSTER_COLORS[i] }}>
              <div className="cluster-overview-card-header">
                <span className="cluster-overview-medal">{RANK_MEDALS[i]}</span>
                <span className="cluster-overview-card-name">{c.cluster}</span>
              </div>
              <div className="cluster-overview-stats">
                <div className="cluster-overview-stat">
                  <span className="cluster-overview-stat-value">{c.customers.toLocaleString()}</span>
                  <span className="cluster-overview-stat-label">Customers</span>
                </div>
                <div className="cluster-overview-stat">
                  <span className="cluster-overview-stat-value">{fmt$(c.total_profit)}</span>
                  <span className="cluster-overview-stat-label">Total Profit</span>
                </div>
                <div className="cluster-overview-stat">
                  <span className="cluster-overview-stat-value">{fmt$(c.avg_profit)}</span>
                  <span className="cluster-overview-stat-label">Avg Profit</span>
                </div>
                <div className="cluster-overview-stat">
                  <span className="cluster-overview-stat-value">{c.avg_receivers}</span>
                  <span className="cluster-overview-stat-label">Avg Receivers</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <div className="cluster-overview-takeaways">
        <h4 className="cluster-overview-takeaways-title">Key Takeaways</h4>
        {takeaways.map((t, i) => (
          <ScrollReveal key={i} delay={i * 120}>
            <div className="cluster-overview-callout">
              <span className="cluster-overview-callout-icon">{t.icon}</span>
              <span>{t.text}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <div className="cluster-overview-code-section">
        <button
          className="cluster-overview-code-toggle"
          onClick={() => setCodeOpen((v) => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          {codeOpen ? "Hide Clustering Code" : "View Clustering Code (Python)"}
          <span className="cluster-overview-code-indicator">{codeOpen ? "−" : "+"}</span>
        </button>

        {codeOpen && (
          <div className="cluster-overview-code-wrap">
            <div className="cluster-overview-code-header">
              <span className="cluster-overview-code-lang">Python — KMeans Clustering</span>
              <button className="cluster-overview-copy-btn" onClick={handleCopy}>
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="cluster-overview-code"><code>{PYTHON_CODE}</code></pre>
          </div>
        )}
      </div>
    </section>
  );
}
