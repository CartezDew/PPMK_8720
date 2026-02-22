import { useState, useEffect } from "react";
import { fetchClusterProfile } from "../api.js";
import aiIcon from "../images/ai-icon.webp";
import forrestImg from "../images/forrest-gump-wave.gif";

function fmt$(v) {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000)
    return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 10_000)
    return "$" + (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function PersonaAvatar({ color }) {
  return (
    <div className="persona-avatar" style={{ borderColor: color }}>
      <img src={forrestImg} alt="Forrest G." className="persona-avatar-img" />
    </div>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div className="persona-stat-pill">
      <span className="persona-stat-label">{label}</span>
      <span className="persona-stat-value" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  );
}

function TraitBar({ label, pct, color }) {
  return (
    <div className="persona-trait">
      <div className="persona-trait-header">
        <span className="persona-trait-label">{label}</span>
        <span className="persona-trait-pct">{pct}%</span>
      </div>
      <div className="persona-trait-track">
        <div className="persona-trait-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

const MARCUS = {
  name: "Forrest G.",
  tagline: "The Premium Power User",
  age: 42,
  gender: "Male",
  income: 136000,
  mortgage: 220000,
  occupation: "Operations Manager",
  education: "Graduate Degree",
  dwelling: "Single Family Home",
  homeowner: "Homeowner",
  marital: "Married",
  kids: "2 young kids",
  vehicle: "2025 Toyota Tacoma",
  creditCards: 3,
  favoriteTeam: "Atlanta Falcons",
  seasonPassHolder: true,

  bio: "Forrest G. is a semi-affluent operations manager in his early 40s who lives for premium entertainment. A devoted Atlanta Falcons fan and season pass holder, he records every game on his DVR and watches in HD. He also enjoys shrimping with his friend Bubba. He's a hands-on dad with two young kids, drives a 2025 Toyota Tacoma, and carries three credit cards — including one with an upscale retailer. He represents the highest-value customer in the portfolio: fewer in number, but each one generating outsized profit through heavy service adoption.",

  quickFacts: [
    { icon: "📺", text: "Records games and sports content on DVR" },
    { icon: "👨‍👧‍👦", text: "Married with 2 young kids" },
    { icon: "🏃", text: "Enjoys running in his free time" },
    { icon: "🎣", text: "Loves fishing on the weekends" },
    { icon: "❤️", text: "Devoted to his beautiful wife Jenny" },
    { icon: "📈", text: "Invests in stocks and a 401K" },
  ],

  behaviors: [
    "Subscribes to DVR, HD, and PPV simultaneously — maximizes every service",
    "Records live sports and watches on his own schedule around family time",
    "Orders PPV events regularly — boxing, UFC, and premium sporting events",
    "Consistently generates the highest profit per account across all segments",
    "Heavy content consumer across sports, news, and premium entertainment",
  ],

  motivations: [
    "Wants the best sports viewing experience — HD quality, DVR flexibility",
    "Values convenience: records games he can't watch live with the kids",
    "Willing to pay premium prices for exclusive live sports and PPV events",
    "Influenced by bundled deals that combine his must-have services at a locked rate",
    "Loyal to brands that reward his spending — responds to VIP treatment",
  ],

  painPoints: [
    "DVR failures during live games are a dealbreaker — reliability is everything",
    "Price increases on services he's already paying top dollar for feel unfair",
    "Competitors offering NFL Sunday Ticket or exclusive sports packages",
    "Complicated sports package bundles — ESPN, FOX Sports, and CBS Sports are split across different tiers, forcing him to pay for multiple packages just to watch all the games",
    "Generic marketing that doesn't reflect his premium status or viewing habits",
  ],

  marketingStrategy: [
    "Retention is the top priority — losing Forrest G. equals losing 3+ average customers in profit. Assign a dedicated account rep or priority support line for this tier.",
    "Bundle sports + DVR + HD + PPV at a locked-in rate with a 2-year loyalty discount. Forrest G. won't switch if the value is clear and the price is stable.",
    "Offer exclusive NFL and Falcons-related content, pre-game shows, and early PPV access. Make him feel like a VIP, not just another subscriber.",
    "Send personalized promotions tied to the Falcons schedule — game-day bundles, PPV fight nights, and playoff packages. Never send him generic offers.",
    "Create a premium rewards tier: after X months of top-tier service, unlock free PPV events, upgraded equipment, or priority installation for new services.",
    "Target his upscale retail card behavior — partner with retailers for cross-promotions that combine entertainment and lifestyle spending.",
  ],
};

const COLOR = "#059669";

export default function PersonaBanner({ filters, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const f = JSON.parse(filtersKey);
    fetchClusterProfile("3", f)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filtersKey]);

  const adoption = profile?.service_adoption || {};
  const services = [];
  if (adoption.dvr?.pct > 0) services.push({ name: "DVR Service", pct: adoption.dvr.pct });
  if (adoption.hd?.pct > 0) services.push({ name: "HD Programming", pct: adoption.hd.pct });
  if (adoption.ppv?.pct > 0) services.push({ name: "Pay-Per-View", pct: adoption.ppv.pct });
  services.sort((a, b) => b.pct - a.pct);

  return (
    <div className="cluster-banner persona-container" style={{ "--cluster-color": COLOR }}>
      <div className="cluster-banner-header">
        <div>
          <h2 className="cluster-banner-title">Customer Persona — Cluster 3</h2>
          <p className="cluster-banner-subtitle">Premium Segment power user profile</p>
        </div>
        <button className="cluster-banner-close persona-back-desktop" onClick={onClose}>
          ← Back to All Segments
        </button>
      </div>

      {loading && <p className="cluster-loading">Building persona from customer data...</p>}

      {profile && (
        <>
          {/* Identity Card */}
          <div className="persona-identity">
            <div className="persona-identity-left">
              <div className="persona-avatar-card">
                <img src={forrestImg} alt="Forrest G." className="persona-avatar-img-lg" />
              </div>
              <div className="persona-badge">
                <span className="persona-badge-value">{fmt$(profile.avg_profit)}</span>
                <span className="persona-badge-label">Avg Profit</span>
              </div>
            </div>
            <div className="persona-identity-info">
              <h3 className="persona-name">{MARCUS.name}</h3>
              <span className="persona-tagline">{MARCUS.tagline}</span>
              <span className="persona-occupation">{MARCUS.occupation} · {MARCUS.age} years old</span>
              <p className="persona-bio">{MARCUS.bio}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="persona-stats-row">
            <StatPill label="Age" value={MARCUS.age} accent={COLOR} />
            <StatPill label="Gender" value={MARCUS.gender} />
            <StatPill label="Income" value={fmt$(MARCUS.income)} accent={COLOR} />
            <StatPill label="Occupation" value={MARCUS.occupation} />
            <StatPill label="Education" value={MARCUS.education} />
            <StatPill label="Dwelling" value={MARCUS.dwelling} />
            <StatPill label="Housing" value={MARCUS.homeowner} />
            <StatPill label="Mortgage" value={fmt$(MARCUS.mortgage)} />
            <StatPill label="Vehicle" value={MARCUS.vehicle} />
          </div>

          <hr className="persona-divider" />

          {/* Quick Facts */}
          <div className="persona-facts">
            {MARCUS.quickFacts.map((fact, i) => (
              <div key={i} className="persona-fact-item">
                <span className="persona-fact-icon">{fact.icon}</span>
                <span className="persona-fact-text">{fact.text}</span>
              </div>
            ))}
          </div>


          {/* Service Adoption from real data */}
          {services.length > 0 && (
            <div className="sim-section">
              <div className="cluster-section-header">
                <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <h4 className="cluster-section-label">Forrest G.'s Service Usage</h4>
                <span className="persona-section-note">Based on Cluster 3 adoption rates</span>
              </div>
              <div className="persona-services">
                {services.map((s) => (
                  <TraitBar key={s.name} label={s.name} pct={s.pct} color={COLOR} />
                ))}
              </div>
            </div>
          )}

          {/* Credit & Lifestyle Callouts */}
          <div className="persona-callout-card" style={{ borderLeftColor: COLOR }}>
            <span className="persona-callout-icon">💳</span>
            <div>
              <strong>Carries {MARCUS.creditCards} credit cards, including 1 with an upscale retailer.</strong>
              <span className="persona-callout-detail">
                {" "}Semi-affluent spending profile — responds to premium offers and loyalty rewards tied to lifestyle brands.
              </span>
            </div>
          </div>

          <div className="persona-callout-card" style={{ borderLeftColor: "#dc2626" }}>
            <span className="persona-callout-icon">🏈</span>
            <div>
              <strong>Atlanta Falcons Season Pass Holder</strong>
              <span className="persona-callout-detail">
                {" "}— Attends games in person and records every broadcast. PPV fight nights and playoff events are must-buys. Sports content is the anchor that keeps Forrest G. subscribed.
              </span>
            </div>
          </div>

          {/* Behavioral Traits */}
          <div className="sim-section">
            <div className="cluster-section-header">
              <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <h4 className="cluster-section-label">Behavioral Traits</h4>
            </div>
            <div className="persona-trait-list">
              {MARCUS.behaviors.map((b, i) => (
                <div key={i} className="persona-trait-item">
                  <span className="persona-trait-bullet" style={{ background: COLOR }} />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivations & Pain Points */}
          <div className="persona-two-col">
            <div className="persona-col-card persona-col-motivations">
              <h5 className="persona-col-title">
                <span className="persona-col-emoji">🎯</span> What Drives Forrest G.
              </h5>
              {MARCUS.motivations.map((m, i) => (
                <div key={i} className="persona-col-item">
                  <span className="persona-col-num" style={{ background: COLOR }}>{i + 1}</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
            <div className="persona-col-card persona-col-pain">
              <h5 className="persona-col-title">
                <span className="persona-col-emoji">⚠️</span> What Frustrates Forrest G.
              </h5>
              {MARCUS.painPoints.map((p, i) => (
                <div key={i} className="persona-col-item">
                  <span className="persona-col-num" style={{ background: "#dc2626" }}>{i + 1}</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Marketing Strategy (AI) */}
          <div className="cluster-ai-section">
            <div className="cluster-ai-header">
              <img src={aiIcon} alt="AI" className="cluster-ai-icon" />
              <h4 className="cluster-ai-title">How to Retain & Grow Forrest G.</h4>
              <span className="cluster-ai-badge">AI</span>
            </div>
            <div className="cluster-ai-recs">
              {MARCUS.marketingStrategy.map((text, i) => (
                <div key={i} className="cluster-ai-rec">
                  <span className="cluster-ai-rec-num">{i + 1}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="persona-back-mobile">
            <button className="persona-back-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to All Segments
            </button>
          </div>
        </>
      )}
    </div>
  );
}
