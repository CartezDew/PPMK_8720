import { useState, useEffect } from "react";
import { fetchBucketProfile } from "../api.js";
import aiIcon from "../images/ai-icon.webp";
import ScrollReveal from "./ScrollReveal";

const BUCKET_NARRATIVES = {
  top10: {
    title: "Top 10 Highest Value Tiers",
    subtitle: "Customers in the 10 highest profit tiers — the revenue backbone",
    highlights: [
      "These profit tiers represent the most valuable customer groups",
      "Understanding what drives customers to these tiers informs upsell strategy",
      "Protecting and growing this segment is critical to overall profitability",
    ],
    color: "#059669",
  },
  bottom10: {
    title: "Bottom 10 Lowest Value Tiers",
    subtitle: "Customers in the 10 lowest profit tiers — at-risk or early-lifecycle",
    highlights: [
      "These profit tiers contain customers contributing the least revenue",
      "Many may be new, disengaged, or on low-value plans",
      "Targeted interventions could move some into higher-value tiers",
    ],
    color: "#dc2626",
  },
};

const AI_RECOMMENDATIONS = {
  top10: [
    "Create tiered loyalty programs — customers in higher profit buckets should receive premium benefits to ensure retention",
    "Analyze the service bundles common in these tiers and package them as aspirational upgrades for mid-tier customers",
    "Monitor churn signals closely — losing even a few high-tier customers significantly impacts total revenue",
    "Use these customers as case studies for win-back campaigns targeting lapsed high-value subscribers",
  ],
  bottom10: [
    "Segment by tenure — new customers may grow, while long-tenured low-profit customers likely need different engagement",
    "Test introductory upgrade offers (DVR, HD, additional receivers) with time-limited discounts to drive adoption",
    "Evaluate whether the cost-to-serve exceeds revenue for these tiers — consider plan restructuring",
    "Build automated engagement journeys that nudge low-tier customers toward the next profit bracket",
  ],
};

function fmt$(v) {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000)
    return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 10_000)
    return "$" + (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function DemoTable({ title, rows, showIncome, showDistribution, color }) {
  if (!rows?.length) return null;
  const topCount = Math.max(...rows.map((r) => Number(r.count) || 0));
  const topPct = Math.max(...rows.map((r) => Number(r.pct) || 0));

  return (
    <div className="cluster-demo-card">
      <h5 className="cluster-demo-title">{title}</h5>
      <table className="cluster-demo-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Customers</th>
            <th>%</th>
            <th>Avg Receivers</th>
            <th>Avg Age</th>
            {showIncome && <th>Avg Income</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{String(r.name)}</td>
              <td className={Number(r.count) === topCount ? "demo-top-val" : ""}>
                {Number(r.count).toLocaleString()}
              </td>
              <td className={Number(r.pct) === topPct ? "demo-top-val" : ""}>
                {r.pct}%
              </td>
              <td>{r.avg_receivers ?? "—"}</td>
              <td>{r.avg_age ?? "—"}</td>
              {showIncome && <td>{r.avg_income ? fmt$(r.avg_income) : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {showDistribution && (
        <div className="demo-distribution">
          <h6 className="demo-distribution-label">Distribution</h6>
          <div className="demo-distribution-bars">
            {rows.map((r, i) => {
              const barW = (Number(r.count) / topCount) * 100;
              const opacity = 0.4 + (i / Math.max(rows.length - 1, 1)) * 0.6;
              return (
                <div key={r.name} className="demo-dist-row">
                  <span className="demo-dist-name">Rating {String(r.name)}</span>
                  <div className="demo-dist-track">
                    <div className="demo-dist-fill" style={{ width: `${barW}%`, background: color, opacity }} />
                  </div>
                  <span className="demo-dist-pct">{r.pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LifestyleGrid({ data, color }) {
  if (!data || !Object.keys(data).length) return null;
  const items = Object.entries(data)
    .map(([key, val]) => ({ key, label: key.replace(/_/g, " "), ...val }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="cluster-demo-card">
      <h5 className="cluster-demo-title">Lifestyle Interests</h5>
      <div className="cluster-lifestyle-grid">
        {items.map((item) => (
          <div key={item.key} className="cluster-lifestyle-item">
            <div className="cluster-lifestyle-bar-track">
              <div className="cluster-lifestyle-bar-fill" style={{ width: `${Math.min(item.pct, 100)}%`, background: color }} />
            </div>
            <div className="cluster-lifestyle-meta">
              <span className="cluster-lifestyle-label">{item.label}</span>
              <span className="cluster-lifestyle-pct">{item.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data, title }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const COLORS = ["#0891b2", "#f59e0b", "#6366f1", "#10b981", "#ef4444"];
  const size = 120;
  const cx = size / 2, cy = size / 2, outerR = 52, innerR = 30;
  let cumAngle = -Math.PI / 2;

  const arcs = data.map((d, i) => {
    const frac = d.count / total;
    const startAngle = cumAngle;
    const endAngle = cumAngle + frac * 2 * Math.PI;
    cumAngle = endAngle;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startAngle), y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle), y2 = cy + outerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle), iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle), iy2 = cy + innerR * Math.sin(startAngle);
    const path = [
      `M ${x1} ${y1}`, `A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`, `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`, "Z",
    ].join(" ");
    return { path, color: COLORS[i % COLORS.length], ...d, pct: (frac * 100).toFixed(1) };
  });

  return (
    <div className="cluster-donut-card">
      <h5 className="cluster-demo-title">{title}</h5>
      <div className="cluster-donut-body">
        <svg viewBox={`0 0 ${size} ${size}`} className="cluster-donut-svg">
          {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} className="cluster-donut-arc" />)}
          <text x={cx} y={cy - 4} textAnchor="middle" className="cluster-donut-center-val">{total.toLocaleString()}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="cluster-donut-center-lbl">total</text>
        </svg>
        <div className="cluster-donut-legend">
          {arcs.map((a, i) => (
            <div key={i} className="cluster-donut-legend-item">
              <span className="cluster-donut-swatch" style={{ background: a.color }} />
              <div className="cluster-donut-legend-text">
                <span className="cluster-donut-legend-name">{a.name}</span>
                <span className="cluster-donut-legend-detail">
                  {a.count.toLocaleString()} ({a.pct}%) · {fmt$(a.avg_profit)} avg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareBar({ data, title, color }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count));
  const COLORS = [color || "#0891b2", "#f59e0b", "#6366f1", "#10b981"];

  return (
    <div className="cluster-comparebar-card">
      <h5 className="cluster-demo-title">{title}</h5>
      <div className="cluster-comparebar-list">
        {data.map((d, i) => {
          const pct = ((d.count / total) * 100).toFixed(1);
          const barWidth = (d.count / maxCount) * 100;
          return (
            <div key={i} className="cluster-comparebar-row">
              <div className="cluster-comparebar-label-row">
                <span className="cluster-comparebar-name">{d.name}</span>
                <span className="cluster-comparebar-stats">{d.count.toLocaleString()} ({pct}%)</span>
              </div>
              <div className="cluster-comparebar-track">
                <div className="cluster-comparebar-fill" style={{ width: `${barWidth}%`, background: COLORS[i % COLORS.length] }} />
                <span className={`cluster-comparebar-value ${barWidth > 70 ? "on-fill" : ""}`}>{fmt$(d.avg_profit)} avg profit</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceAdoption({ data, color }) {
  if (!data) return null;
  const services = [
    { key: "dvr", label: "DVR Service" },
    { key: "hd", label: "HD Programming" },
    { key: "ppv", label: "PPV (last 12 mo)" },
  ];

  return (
    <div className="cluster-demo-card">
      <h5 className="cluster-demo-title">Service Adoption</h5>
      <div className="cluster-adoption-grid">
        {services.map((s) => {
          const d = data[s.key];
          if (!d) return null;
          return (
            <div key={s.key} className="cluster-adoption-item">
              <div className="cluster-adoption-header">
                <span className="cluster-adoption-label">{s.label}</span>
                <span className="cluster-adoption-pct">{d.pct}%</span>
              </div>
              <div className="cluster-adoption-track">
                <div className="cluster-adoption-fill" style={{ width: `${Math.min(d.pct, 100)}%`, background: color }} />
              </div>
              <span className="cluster-adoption-count">{d.count.toLocaleString()} customers</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpscaleCard({ data, color }) {
  if (!data || data.pct < 5) return null;
  const hasIncome = data.avg_income_yes != null && data.avg_income_no != null;
  const hasProfit = data.avg_profit_yes != null && data.avg_profit_no != null;

  return (
    <div className="cluster-upscale-card">
      <h5 className="cluster-demo-title">Upscale Retail Cardholders</h5>
      <div className="cluster-upscale-bar-row">
        <div className="cluster-upscale-bar-track">
          <div className="cluster-upscale-bar-yes" style={{ width: `${data.pct}%`, background: color }} />
        </div>
        <span className="cluster-upscale-bar-label">{data.pct}%</span>
      </div>
      <div className="cluster-upscale-detail">
        <span className="cluster-upscale-count">{data.count.toLocaleString()} customers</span>
      </div>
      {(hasIncome || hasProfit) && (
        <div className="cluster-upscale-compare">
          <div className="cluster-upscale-col">
            <span className="cluster-upscale-col-head" style={{ color }}>Cardholders</span>
            {hasIncome && <span className="cluster-upscale-stat">{fmt$(data.avg_income_yes)} avg. income</span>}
            {hasProfit && <span className="cluster-upscale-stat">{fmt$(data.avg_profit_yes)} avg. profit</span>}
          </div>
          <div className="cluster-upscale-vs">vs</div>
          <div className="cluster-upscale-col">
            <span className="cluster-upscale-col-head">Non-holders</span>
            {hasIncome && <span className="cluster-upscale-stat">{fmt$(data.avg_income_no)} avg. income</span>}
            {hasProfit && <span className="cluster-upscale-stat">{fmt$(data.avg_profit_no)} avg. profit</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ResidentialCard({ data, color }) {
  if (!data?.length) return null;
  const residential = data.find((r) => String(r.name) === "0");
  const business = data.find((r) => String(r.name) === "1");
  if (!residential) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const resPct = ((residential.count / total) * 100).toFixed(1);
  const bizPct = business ? ((business.count / total) * 100).toFixed(1) : "0";

  return (
    <div className="cluster-residential-card">
      <h5 className="cluster-demo-title">Customer Type</h5>
      <div className="cluster-residential-grid">
        <div className="cluster-residential-item cluster-residential-main">
          <svg className="cluster-residential-icon" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V19a1 1 0 001 1h12a1 1 0 001-1V9.5" />
            <path d="M10 20v-6h4v6" />
          </svg>
          <span className="cluster-residential-pct" style={{ color }}>{resPct}%</span>
          <span className="cluster-residential-label">Residential</span>
          <span className="cluster-residential-count">{residential.count.toLocaleString()}</span>
        </div>
        {business && (
          <div className="cluster-residential-item">
            <svg className="cluster-residential-icon" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="13" rx="1" />
              <path d="M3 11h18" />
              <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
              <path d="M7 15h2" />
              <path d="M15 15h2" />
            </svg>
            <span className="cluster-residential-pct">{bizPct}%</span>
            <span className="cluster-residential-label">Business</span>
            <span className="cluster-residential-count">{business.count.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BucketBreakdown({ buckets, color }) {
  if (!buckets?.length) return null;
  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <div className="cluster-demo-card">
      <h5 className="cluster-demo-title">Profit Tier Breakdown</h5>
      <table className="cluster-demo-table">
        <thead>
          <tr>
            <th>Profit Value</th>
            <th>Customers</th>
            <th>Total Profit</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.profit}>
              <td>{fmt$(b.profit)}</td>
              <td className={b.count === maxCount ? "demo-top-val" : ""}>{b.count.toLocaleString()}</td>
              <td>{fmt$(b.sum_profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function deriveInsights(profile, bucketType) {
  if (!profile) return [];
  const insights = [];
  const isTop = bucketType === "top10";

  if (isTop && profile.buckets?.length) {
    const totalCustomers = profile.buckets.reduce((s, b) => s + b.count, 0);
    insights.push(
      `${profile.num_buckets} profit tiers contain ${totalCustomers.toLocaleString()} customers — high concentration in top tiers`
    );
  }

  if (profile.gender?.length) {
    const top = profile.gender[0];
    insights.push(`${top.pct}% are ${top.name}`);
  }

  if (profile.avg_receivers > 0) {
    insights.push(
      `Average ${profile.avg_receivers} receivers per customer — ${isTop ? "higher device counts drive revenue" : "low device adoption limits value"}`
    );
  }

  if (profile.dwelling?.length) {
    const top = profile.dwelling[0];
    if (top.pct >= 30) {
      insights.push(`${top.pct}% live in ${top.name} homes`);
    }
  }

  if (profile.service_adoption) {
    const { dvr, hd, ppv } = profile.service_adoption;
    const adopted = [
      dvr?.pct > 0 && `DVR (${dvr.pct}%)`,
      hd?.pct > 0 && `HD (${hd.pct}%)`,
      ppv?.pct > 0 && `PPV (${ppv.pct}%)`,
    ].filter(Boolean);
    if (adopted.length > 0) {
      insights.push(
        `Service adoption: ${adopted.join(", ")} — ${isTop ? "premium services are standard in top tiers" : "low adoption suggests upsell opportunity"}`
      );
    }
  }

  return insights;
}

const REVENUE_KEYS = [
  { key: "receiver_revenue", label: "Receiver Revenue" },
  { key: "ppv_revenue", label: "PPV Revenue" },
  { key: "dvr_revenue", label: "DVR Revenue" },
  { key: "hd_revenue", label: "HD Revenue" },
];

export default function BucketBanner({ bucketType, filters, summaryData, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const narrative = BUCKET_NARRATIVES[bucketType];
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const f = JSON.parse(filtersKey);
    fetchBucketProfile(bucketType, f)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bucketType, filtersKey]);

  if (!narrative) return null;

  const insights = deriveInsights(profile, bucketType);
  const aiRecs = AI_RECOMMENDATIONS[bucketType] || [];
  const totalProfit = summaryData?.total_profit || 0;
  const sortedRevenue = [...REVENUE_KEYS]
    .map((r) => ({ ...r, value: summaryData?.[r.key] || 0 }))
    .sort((a, b) => b.value - a.value);
  const color = narrative.color;

  return (
    <div className="cluster-banner" style={{ "--cluster-color": color }}>
      <div className="cluster-banner-header">
        <div>
          <h2 className="cluster-banner-title">{narrative.title}</h2>
          <p className="cluster-banner-subtitle">{narrative.subtitle}</p>
        </div>
        <button className="cluster-banner-close" onClick={onClose}>
          ← Back to All Segments
        </button>
      </div>

      <div className="cluster-banner-highlights">
        {narrative.highlights.map((h, i) => (
          <ScrollReveal key={i} delay={i * 120}>
            <div className="cluster-highlight">
              <span className="cluster-highlight-bullet">•</span>
              <span>{h}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {loading && <p className="cluster-loading">Loading demographics...</p>}

      {profile && (
        <>
          <div className="cluster-hero-row">
            <div className="cluster-hero-card cluster-hero-primary">
              <span className="cluster-hero-value">{profile.total_customers.toLocaleString()}</span>
              <span className="cluster-hero-label">Customers</span>
              {profile.total_all_customers > 0 && (
                <span className="cluster-hero-pct">
                  {((profile.total_customers / profile.total_all_customers) * 100).toFixed(1)}% of {profile.total_all_customers.toLocaleString()} total
                </span>
              )}
            </div>
            <div className="cluster-hero-card cluster-hero-primary">
              <span className="cluster-hero-value">{fmt$(profile.total_profit)}</span>
              <span className="cluster-hero-label">Total Profit</span>
            </div>
            <div className="cluster-hero-card cluster-hero-accent">
              <span className="cluster-hero-value">{fmt$(profile.avg_profit)}</span>
              <span className="cluster-hero-label">Avg Profit / Customer</span>
            </div>
            <div className="cluster-hero-card">
              <span className="cluster-hero-value">{fmt$(profile.avg_income)}</span>
              <span className="cluster-hero-label">Avg Household Income</span>
            </div>
            <div className="cluster-hero-card">
              <span className="cluster-hero-value">{profile.avg_receivers}</span>
              <span className="cluster-hero-label">Avg Receivers</span>
            </div>
            <div className="cluster-hero-card">
              <span className="cluster-hero-value">{profile.avg_age}</span>
              <span className="cluster-hero-label">Avg Age</span>
            </div>
          </div>

          <BucketBreakdown buckets={profile.buckets} color={color} />

          {summaryData && (
            <div className="cluster-revenue-strip">
              <div className="cluster-section-header">
                <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 14h2" />
                  <path d="M12 14h6" />
                </svg>
                <h4 className="cluster-section-label">Revenue by Service</h4>
              </div>
              <div className="cluster-revenue-bars">
                {sortedRevenue.map((r) => {
                  const pct = totalProfit > 0 ? ((r.value / totalProfit) * 100).toFixed(1) : 0;
                  return (
                    <div key={r.key} className="cluster-revenue-item">
                      <div className="cluster-revenue-top">
                        <span className="cluster-revenue-name">{r.label}</span>
                        <span className="cluster-revenue-val">{fmt$(r.value)}</span>
                      </div>
                      <div className="cluster-revenue-track">
                        <div className="cluster-revenue-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="cluster-revenue-pct">{pct}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <div className="cluster-insights-section">
              <div className="cluster-section-header">
                <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C9.2 2 7 4.2 7 7c0 1.4.6 2.7 1.5 3.6.3.3.5.7.5 1.1V13a1 1 0 001 1h4a1 1 0 001-1v-1.3c0-.4.2-.8.5-1.1C16.4 9.7 17 8.4 17 7c0-2.8-2.2-5-5-5z" />
                  <path d="M12 2c2.8 0 5 2.2 5 5 0 1.4-.6 2.7-1.5 3.6" />
                  <path d="M9.5 7C9.5 5.6 10.6 4.5 12 4.5" />
                  <path d="M12 22v-8" />
                  <path d="M8 18h8" />
                  <path d="M9 21h6" />
                </svg>
                <h4 className="cluster-section-label">Key Takeaways</h4>
              </div>
              <div className="cluster-callouts">
                {insights.map((text, i) => (
                  <div key={i} className="cluster-callout">
                    <span className="cluster-callout-icon">💡</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiRecs.length > 0 && (
            <div className="cluster-ai-section">
              <div className="cluster-ai-header">
                <img src={aiIcon} alt="AI" className="cluster-ai-icon" />
                <h4 className="cluster-ai-title">AI-Powered Recommendations</h4>
                <span className="cluster-ai-badge">AI</span>
              </div>
              <div className="cluster-ai-recs">
                {aiRecs.map((text, i) => (
                  <ScrollReveal key={i} delay={i * 150}>
                    <div className="cluster-ai-rec">
                      <span className="cluster-ai-rec-num">{i + 1}</span>
                      <span>{text}</span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          <div className="cluster-section-header">
            <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <h4 className="cluster-section-label">Customer Profile</h4>
          </div>
          <div className="cluster-profile-charts">
            <DonutChart data={profile.gender} title="Gender" />
            <DonutChart data={profile.marital} title="Marital Status" />
            <CompareBar data={profile.homeowner_status} title="Homeownership" color={color} />
            <ResidentialCard data={profile.home_business} color={color} />
            <UpscaleCard data={profile.lifestyle?.upscale} color={color} />
            <ServiceAdoption data={profile.service_adoption} color={color} />
          </div>

          {profile.avg_mortgage > 0 && (
            <div className="cluster-extra-stats">
              <div className="cluster-stat-pill">
                <span className="cluster-stat-pill-label">Avg Mortgage</span>
                <span className="cluster-stat-pill-value">{fmt$(profile.avg_mortgage)}</span>
              </div>
              <div className="cluster-stat-pill">
                <span className="cluster-stat-pill-label">Avg Rooms</span>
                <span className="cluster-stat-pill-value">{profile.avg_rooms}</span>
              </div>
            </div>
          )}

          <div className="cluster-section-header">
            <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 17l4-8 4 4 5-9" />
            </svg>
            <h4 className="cluster-section-label">Demographics</h4>
          </div>
          <div className="cluster-demo-grid">
            <DemoTable title="Dwelling Type" rows={profile.dwelling} showIncome />
            <DemoTable title="Education" rows={profile.education} showIncome />
            <DemoTable title="Responder Rating" rows={profile.responder_rating} showIncome showDistribution color={color} />
            <LifestyleGrid data={profile.lifestyle} color={color} />
          </div>
        </>
      )}
    </div>
  );
}
