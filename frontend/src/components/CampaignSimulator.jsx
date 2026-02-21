import { useState, useMemo } from "react";
import aiIcon from "../images/ai-icon.webp";

function calcNPV(monthlyRate, cashFlows) {
  return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + monthlyRate, t), 0);
}

function calcIRR(cashFlows) {
  let lo = -0.99, hi = 10;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const npv = calcNPV(mid, cashFlows);
    if (Math.abs(npv) < 0.01) return mid;
    if (npv > 0) lo = mid; else hi = mid;
  }
  const result = (lo + hi) / 2;
  return Math.abs(result) < 9.9 ? result : null;
}

function fmt$(v) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000)
    return (n < 0 ? "-" : "") + "$" + (Math.abs(n) / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 10_000)
    return (n < 0 ? "-" : "") + "$" + (Math.abs(n) / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const PRESETS = {
  conservative: {
    label: "Conservative",
    desc: "Low-risk, steady returns",
    budget: 25000, duration: 18, monthlyRevenue: 3000, monthlyCost: 1000, discountRate: 10,
  },
  moderate: {
    label: "Moderate",
    desc: "Balanced risk-reward",
    budget: 50000, duration: 12, monthlyRevenue: 8000, monthlyCost: 2000, discountRate: 8,
  },
  aggressive: {
    label: "Aggressive",
    desc: "High spend, high reward",
    budget: 100000, duration: 6, monthlyRevenue: 25000, monthlyCost: 5000, discountRate: 5,
  },
};

function calcScore(npv, paybackMonth, duration, roi, irr, discountRate) {
  let score = 0;
  if (npv > 0) score += 30;
  else score += Math.max(0, 30 + (npv / 1000));

  if (paybackMonth !== null && paybackMonth <= duration) {
    score += 25 * (1 - (paybackMonth / duration) * 0.5);
  }

  if (roi > 0) score += Math.min(25, roi / 2);

  if (irr !== null && irr > 0) {
    score += irr > discountRate ? 20 : 20 * (irr / Math.max(discountRate, 1));
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function InputGroup({ label, value, onChange, prefix, suffix, min = 0, max, step = 1000, helpText }) {
  const isDollar = prefix === "$";
  const display = isDollar ? Number(value).toLocaleString("en-US") : value;

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, "");
    const num = Number(raw) || 0;
    onChange(max != null ? Math.min(num, max) : num);
  };

  return (
    <div className="sim-input-group">
      <label className="sim-input-label">{label}</label>
      <div className="sim-input-wrap">
        {prefix && <span className="sim-input-affix sim-input-prefix">{prefix}</span>}
        <input
          type={isDollar ? "text" : "number"}
          className="sim-input"
          value={display}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          inputMode={isDollar ? "numeric" : undefined}
        />
        {suffix && <span className="sim-input-affix sim-input-suffix">{suffix}</span>}
      </div>
      {helpText && <span className="sim-input-help">{helpText}</span>}
    </div>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#f59e0b" : "#dc2626";
  const label = score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Weak";
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="sim-score-gauge">
      <svg viewBox="0 0 120 120" className="sim-score-svg">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        <text x="60" y="53" textAnchor="middle" fill={color} fontSize="28" fontWeight="800">{score}</text>
        <text x="60" y="72" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">{label}</text>
      </svg>
      <span className="sim-score-caption">Campaign Score</span>
    </div>
  );
}

function CashFlowChart({ cumulativeCF, paybackMonth, duration }) {
  if (!cumulativeCF?.length || cumulativeCF.length < 2) return null;

  const W = 640, H = 220;
  const pad = { t: 25, r: 25, b: 35, l: 70 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  const vals = cumulativeCF;
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(0, ...vals);
  const range = maxV - minV || 1;

  const x = (i) => pad.l + (i / (vals.length - 1)) * pw;
  const y = (v) => pad.t + ph - ((v - minV) / range) * ph;

  const linePoints = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPath = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ")
    + ` L ${x(vals.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const zeroY = y(0);

  const numTicks = 5;
  const yTicks = Array.from({ length: numTicks }, (_, i) => minV + (range * i) / (numTicks - 1));

  return (
    <div className="sim-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="sim-chart-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cfGradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="cfGradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke="#e2e8f0" strokeWidth="0.5" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fill="#94a3b8" fontSize="9">{fmt$(v)}</text>
          </g>
        ))}

        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY}
          stroke="#64748b" strokeWidth="1" strokeDasharray="5,3" />
        <text x={W - pad.r + 4} y={zeroY + 4} fill="#64748b" fontSize="9" fontWeight="600">$0</text>

        <clipPath id="aboveZero"><rect x={pad.l} y={pad.t} width={pw} height={zeroY - pad.t} /></clipPath>
        <clipPath id="belowZero"><rect x={pad.l} y={zeroY} width={pw} height={H - pad.b - zeroY} /></clipPath>
        <path d={areaPath} fill="url(#cfGradPos)" clipPath="url(#aboveZero)" />
        <path d={areaPath} fill="url(#cfGradNeg)" clipPath="url(#belowZero)" />

        <polyline points={linePoints} fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {vals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3.5"
            fill={v >= 0 ? "#059669" : "#dc2626"} stroke="#fff" strokeWidth="1.5" />
        ))}

        {vals.map((_, i) => {
          const showLabel = vals.length <= 13 || i % Math.ceil(vals.length / 12) === 0 || i === vals.length - 1;
          return showLabel ? (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fill="#94a3b8" fontSize="9">
              {i === 0 ? "Now" : `M${i}`}
            </text>
          ) : null;
        })}

        {paybackMonth !== null && paybackMonth <= duration && (
          <>
            <line x1={x(paybackMonth)} y1={pad.t} x2={x(paybackMonth)} y2={H - pad.b}
              stroke="#059669" strokeWidth="1.5" strokeDasharray="4,3" />
            <rect x={x(paybackMonth) - 32} y={pad.t - 18} width="64" height="16" rx="4" fill="#059669" />
            <text x={x(paybackMonth)} y={pad.t - 7} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">
              Breakeven
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function SensitivityTable({ budget, duration, monthlyRevenue, monthlyCost, discountRate }) {
  const variations = [-30, -20, -10, 0, 10, 20, 30];
  const monthlyRate = discountRate / 100 / 12;

  const rows = variations.map((pct) => {
    const adjRevenue = monthlyRevenue * (1 + pct / 100);
    const netCF = adjRevenue - monthlyCost;
    const cashFlows = [-budget, ...Array(duration).fill(netCF)];
    const npv = calcNPV(monthlyRate, cashFlows);
    const totalReturns = netCF * duration;
    const roi = budget > 0 ? ((totalReturns - budget) / budget) * 100 : 0;
    const payback = netCF > 0 ? budget / netCF : null;
    return { pct, adjRevenue, npv, roi, payback };
  });

  return (
    <div className="sim-sensitivity-wrap">
      <table className="sim-sensitivity-table">
        <thead>
          <tr>
            <th>Revenue Change</th>
            <th>Monthly Rev</th>
            <th>NPV</th>
            <th>ROI</th>
            <th>Payback</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pct} className={r.pct === 0 ? "sim-sensitivity-baseline" : ""}>
              <td>{r.pct > 0 ? "+" : ""}{r.pct}%</td>
              <td>{fmt$(r.adjRevenue)}</td>
              <td className={r.npv >= 0 ? "sim-positive" : "sim-negative"}>{fmt$(r.npv)}</td>
              <td className={r.roi >= 0 ? "sim-positive" : "sim-negative"}>{r.roi.toFixed(1)}%</td>
              <td>{r.payback !== null ? `${r.payback.toFixed(1)} mo` : "Never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function generateAssessment(results) {
  const lines = [];

  if (results.npv > 0) {
    lines.push(`This campaign generates a positive NPV of ${fmt$(results.npv)}, indicating it creates value above the ${results.discountRate}% required return.`);
  } else {
    lines.push(`This campaign has a negative NPV of ${fmt$(results.npv)}, meaning it destroys value at the ${results.discountRate}% discount rate. Consider reducing spend or increasing expected revenue.`);
  }

  if (results.paybackMonth !== null && results.paybackMonth <= results.duration) {
    lines.push(`The investment pays back in ${results.paybackMonth.toFixed(1)} months, well within the ${results.duration}-month campaign window.`);
  } else {
    lines.push(`The campaign does not reach breakeven within the ${results.duration}-month duration. Consider extending the timeline or adjusting revenue expectations.`);
  }

  if (results.roi > 20) {
    lines.push(`With a ${results.roi.toFixed(1)}% ROI, this campaign delivers strong returns relative to the initial investment.`);
  } else if (results.roi > 0) {
    lines.push(`The ${results.roi.toFixed(1)}% ROI indicates modest returns. Look for ways to optimize spend or boost revenue per customer.`);
  } else {
    lines.push(`A negative ROI of ${results.roi.toFixed(1)}% suggests this campaign will lose money. Significant adjustments are needed.`);
  }

  if (results.spendPct > 5) {
    lines.push(`The campaign budget represents ${results.spendPct.toFixed(2)}% of current total profit — a significant investment that requires careful monitoring.`);
  } else {
    lines.push(`The campaign budget is ${results.spendPct.toFixed(2)}% of current total profit — a manageable investment relative to existing revenue.`);
  }

  return lines;
}

export default function CampaignSimulator({ summaryData, onClose }) {
  const [budget, setBudget] = useState(50000);
  const [duration, setDuration] = useState(12);
  const [monthlyRevenue, setMonthlyRevenue] = useState(8000);
  const [monthlyCost, setMonthlyCost] = useState(2000);
  const [discountRate, setDiscountRate] = useState(8);
  const [activePreset, setActivePreset] = useState("moderate");
  const [showSensitivity, setShowSensitivity] = useState(false);

  const applyPreset = (key) => {
    const p = PRESETS[key];
    setBudget(p.budget);
    setDuration(p.duration);
    setMonthlyRevenue(p.monthlyRevenue);
    setMonthlyCost(p.monthlyCost);
    setDiscountRate(p.discountRate);
    setActivePreset(key);
  };

  const results = useMemo(() => {
    const monthlyRate = discountRate / 100 / 12;
    const netMonthlyCF = monthlyRevenue - monthlyCost;

    const cashFlows = [-budget, ...Array(duration).fill(netMonthlyCF)];
    const npv = calcNPV(monthlyRate, cashFlows);

    let cumulative = -budget;
    let paybackMonth = null;
    const cumulativeCF = [cumulative];
    for (let i = 1; i <= duration; i++) {
      cumulative += netMonthlyCF;
      cumulativeCF.push(cumulative);
      if (paybackMonth === null && cumulative >= 0) {
        const prev = cumulativeCF[i - 1];
        paybackMonth = netMonthlyCF > 0 ? (i - 1) + (-prev / netMonthlyCF) : i;
      }
    }

    let irr = null;
    const monthlyIRR = calcIRR(cashFlows);
    if (monthlyIRR !== null && isFinite(monthlyIRR) && monthlyIRR > -1) {
      irr = (Math.pow(1 + monthlyIRR, 12) - 1) * 100;
    }

    const totalReturns = netMonthlyCF * duration;
    const roi = budget > 0 ? ((totalReturns - budget) / budget) * 100 : 0;

    const totalProfit = summaryData?.total_profit || 0;
    const spendPct = totalProfit > 0 ? (budget / totalProfit) * 100 : 0;

    const score = calcScore(npv, paybackMonth, duration, roi, irr, discountRate);

    return {
      npv, irr, paybackMonth, roi, totalReturns, netMonthlyCF,
      spendPct, totalProfit, cashFlows, cumulativeCF,
      score, duration, discountRate, budget,
    };
  }, [budget, duration, monthlyRevenue, monthlyCost, discountRate, summaryData]);

  const assessment = useMemo(() => generateAssessment(results), [results]);

  const resultCards = [
    {
      label: "Net Present Value",
      value: fmt$(results.npv),
      status: results.npv >= 0 ? "positive" : "negative",
      hint: results.npv >= 0 ? "Creates value" : "Destroys value",
    },
    {
      label: "Internal Rate of Return",
      value: results.irr !== null ? `${results.irr.toFixed(1)}%` : "N/A",
      status: results.irr !== null && results.irr > discountRate ? "positive" : results.irr !== null ? "negative" : "neutral",
      hint: results.irr !== null ? (results.irr > discountRate ? `Above ${discountRate}% hurdle` : `Below ${discountRate}% hurdle`) : "Cannot compute",
    },
    {
      label: "Payback Period",
      value: results.paybackMonth !== null ? `${results.paybackMonth.toFixed(1)} mo` : "Never",
      status: results.paybackMonth !== null && results.paybackMonth <= duration ? "positive" : "negative",
      hint: results.paybackMonth !== null && results.paybackMonth <= duration ? "Within timeline" : "Exceeds timeline",
    },
    {
      label: "Return on Investment",
      value: `${results.roi.toFixed(1)}%`,
      status: results.roi >= 20 ? "positive" : results.roi >= 0 ? "neutral" : "negative",
      hint: results.roi >= 20 ? "Strong return" : results.roi >= 0 ? "Modest return" : "Losing money",
    },
    {
      label: "Total Returns",
      value: fmt$(results.totalReturns),
      status: results.totalReturns > budget ? "positive" : "negative",
      hint: `Over ${duration} months`,
    },
    {
      label: "Net Monthly Cash Flow",
      value: fmt$(results.netMonthlyCF),
      status: results.netMonthlyCF > 0 ? "positive" : "negative",
      hint: "Revenue minus costs",
    },
  ];

  return (
    <div className="cluster-banner sim-container" style={{ "--cluster-color": "#0891b2" }}>
      <div className="cluster-banner-header">
        <div>
          <h2 className="cluster-banner-title">Campaign Simulator</h2>
          <p className="cluster-banner-subtitle">Model financial outcomes and forecast marketing campaign ROI</p>
        </div>
        <button className="cluster-banner-close" onClick={onClose}>
          ← Back to All Segments
        </button>
      </div>

      {/* Scenario Presets */}
      <div className="sim-presets">
        <span className="sim-presets-label">Quick Scenarios:</span>
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            className={`sim-preset-btn ${activePreset === key ? "active" : ""}`}
            onClick={() => applyPreset(key)}
          >
            <span className="sim-preset-name">{preset.label}</span>
            <span className="sim-preset-desc">{preset.desc}</span>
          </button>
        ))}
      </div>

      {/* Campaign Parameters */}
      <div className="sim-section">
        <div className="cluster-section-header">
          <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <h4 className="cluster-section-label">Campaign Parameters</h4>
        </div>
        <div className="sim-input-grid">
          <InputGroup label="Campaign Budget" prefix="$" value={budget} onChange={(v) => { setBudget(v); setActivePreset(null); }} step={1000} helpText="Total upfront investment" />
          <InputGroup label="Campaign Duration" suffix="months" value={duration} onChange={(v) => { setDuration(v); setActivePreset(null); }} min={1} max={60} step={1} helpText="How long the campaign runs" />
          <InputGroup label="Expected Monthly Revenue" prefix="$" value={monthlyRevenue} onChange={(v) => { setMonthlyRevenue(v); setActivePreset(null); }} step={500} helpText="Revenue generated per month" />
          <InputGroup label="Ongoing Monthly Cost" prefix="$" value={monthlyCost} onChange={(v) => { setMonthlyCost(v); setActivePreset(null); }} step={500} helpText="Recurring costs per month" />
          <div className="sim-input-group">
            <label className="sim-input-label">Discount Rate (Annual)</label>
            <div className="sim-slider-wrap">
              <input type="range" className="sim-slider" min={0} max={30} step={0.5}
                value={discountRate} onChange={(e) => { setDiscountRate(Number(e.target.value)); setActivePreset(null); }} />
              <span className="sim-slider-value">{discountRate}%</span>
            </div>
            <span className="sim-input-help">Required rate of return / cost of capital</span>
          </div>
        </div>
      </div>

      {/* Score + Budget Gauge Row */}
      <div className="sim-overview-row">
        <ScoreGauge score={results.score} />
        <div className="sim-budget-gauge">
          <h5 className="sim-gauge-title">Budget as % of Total Profit</h5>
          <div className="sim-gauge-row">
            <span className="sim-gauge-amount">{fmt$(budget)}</span>
            <span className="sim-gauge-of">of</span>
            <span className="sim-gauge-total">{fmt$(results.totalProfit)}</span>
          </div>
          <div className="sim-gauge-track">
            <div className="sim-gauge-fill" style={{ width: `${Math.min(results.spendPct, 100)}%` }} />
          </div>
          <span className="sim-gauge-pct">{results.spendPct.toFixed(2)}% of current total profit</span>
        </div>
      </div>

      {/* Financial Projections */}
      <div className="sim-section">
        <div className="cluster-section-header">
          <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 10h20" />
            <path d="M6 14h2" />
            <path d="M12 14h6" />
          </svg>
          <h4 className="cluster-section-label">Financial Projections</h4>
        </div>
        <div className="sim-results-grid">
          {resultCards.map((card) => (
            <div key={card.label} className={`sim-result-card ${card.status}`}>
              <span className="sim-result-value">{card.value}</span>
              <span className="sim-result-label">{card.label}</span>
              <span className={`sim-result-hint ${card.status}`}>{card.hint}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cumulative Cash Flow Chart */}
      <div className="sim-section">
        <div className="cluster-section-header">
          <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 17l4-8 4 4 5-9" />
          </svg>
          <h4 className="cluster-section-label">Cumulative Cash Flow Forecast</h4>
        </div>
        <CashFlowChart
          cumulativeCF={results.cumulativeCF}
          paybackMonth={results.paybackMonth}
          duration={duration}
        />
      </div>

      {/* Sensitivity Analysis */}
      <div className="sim-section">
        <div className="cluster-section-header" style={{ cursor: "pointer" }} onClick={() => setShowSensitivity((v) => !v)}>
          <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 5.5L5 7l2.5-2.5" />
            <path d="M3.5 11.5L5 13l2.5-2.5" />
            <path d="M3.5 17.5L5 19l2.5-2.5" />
            <path d="M11 6h9" />
            <path d="M11 12h9" />
            <path d="M11 18h9" />
          </svg>
          <h4 className="cluster-section-label">Sensitivity Analysis</h4>
          <span className="sim-toggle-hint">{showSensitivity ? "−" : "+"}</span>
        </div>
        {showSensitivity && (
          <SensitivityTable
            budget={budget}
            duration={duration}
            monthlyRevenue={monthlyRevenue}
            monthlyCost={monthlyCost}
            discountRate={discountRate}
          />
        )}
      </div>

      {/* AI Assessment */}
      <div className="cluster-ai-section">
        <div className="cluster-ai-header">
          <img src={aiIcon} alt="AI" className="cluster-ai-icon" />
          <h4 className="cluster-ai-title">Campaign Assessment</h4>
          <span className="cluster-ai-badge">AI</span>
        </div>
        <div className="cluster-ai-recs">
          {assessment.map((text, i) => (
            <div key={i} className="cluster-ai-rec">
              <span className="cluster-ai-rec-num">{i + 1}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
