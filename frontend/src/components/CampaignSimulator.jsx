import { useState, useMemo } from "react";
import aiIcon from "../images/ai-icon.webp";
import ScrollReveal from "./ScrollReveal";

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
    desc: "Retention-focused, low churn risk",
    budget: 40000, duration: 24, monthlyRevenue: 3200, monthlyCost: 1200, discountRate: 12, estimatedCustomers: 350,
  },
  moderate: {
    label: "Moderate",
    desc: "Balanced upsell & bundle strategy",
    budget: 85000, duration: 18, monthlyRevenue: 8500, monthlyCost: 2800, discountRate: 10, estimatedCustomers: 800,
  },
  aggressive: {
    label: "Aggressive",
    desc: "Growth-driven acquisition push",
    budget: 200000, duration: 12, monthlyRevenue: 28000, monthlyCost: 8500, discountRate: 8, estimatedCustomers: 2000,
  },
};

const INDUSTRY_BENCHMARKS = {
  conservative: { irrLow: 8, irrHigh: 20, label: "Pay TV Retention" },
  moderate:     { irrLow: 15, irrHigh: 35, label: "Pay TV Upsell/Bundle" },
  aggressive:   { irrLow: 25, irrHigh: 50, label: "Pay TV Acquisition" },
  general:      { irrLow: 8, irrHigh: 50, label: "Cable & Satellite Industry" },
};

function getIrrBenchmark(activePreset) {
  return INDUSTRY_BENCHMARKS[activePreset] || INDUSTRY_BENCHMARKS.general;
}

function getIrrStatus(irr, benchmark) {
  if (irr === null) return "neutral";
  if (irr < benchmark.irrLow) return "below";
  if (irr > benchmark.irrHigh) return "above";
  return "within";
}

function calcScore(npv, paybackMonth, duration, roi, irr, discountRate, costPerCustomer, estimatedCustomers, avgCustomerValue, totalCustomers) {
  let score = 0;

  if (npv > 0) score += 20;
  else score += Math.max(0, 20 + (npv / 1000));

  if (paybackMonth !== null && paybackMonth <= duration) {
    score += 15 * (1 - (paybackMonth / duration) * 0.5);
  }

  if (roi > 0) score += Math.min(15, roi / 3);

  if (irr !== null && irr > 0) {
    score += irr > discountRate ? 10 : 10 * (irr / Math.max(discountRate, 1));
  }

  if (avgCustomerValue > 0 && costPerCustomer > 0) {
    const ratio = costPerCustomer / avgCustomerValue;
    if (ratio <= 0.25) score += 25;
    else if (ratio <= 0.5) score += 20;
    else if (ratio <= 0.75) score += 14;
    else if (ratio <= 1) score += 6;
    else if (ratio <= 2) score -= 5;
    else if (ratio <= 5) score -= 15;
    else score -= 30;
  } else if (costPerCustomer > 0) {
    if (costPerCustomer <= 50) score += 20;
    else if (costPerCustomer <= 200) score += 10;
    else if (costPerCustomer <= 500) score += 0;
    else score -= 15;
  }

  if (totalCustomers > 0 && estimatedCustomers > 0) {
    const reachPct = estimatedCustomers / totalCustomers;
    if (reachPct >= 0.2) score += 15;
    else if (reachPct >= 0.1) score += 12;
    else if (reachPct >= 0.05) score += 8;
    else if (reachPct >= 0.01) score += 4;
    else score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function InputGroup({ label, value, onChange, prefix, suffix, min = 0, max, step = 1000, helpText, integer }) {
  const isDollar = prefix === "$";
  const [focused, setFocused] = useState(false);
  const [localVal, setLocalVal] = useState("");

  const formatted = isDollar ? Number(value).toLocaleString("en-US") : String(Number(value));

  const handleFocus = (e) => {
    setFocused(true);
    setLocalVal(String(Number(value)));
    setTimeout(() => e.target.select(), 0);
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setLocalVal(raw);
    if (raw === "") return;
    let num = integer ? parseInt(raw, 10) : Number(raw);
    if (isNaN(num)) return;
    if (max != null) num = Math.min(num, max);
    onChange(num);
  };

  const handleBlur = () => {
    setFocused(false);
    let num = integer ? parseInt(localVal, 10) : Number(localVal);
    if (isNaN(num) || num < (min ?? 0)) num = min ?? 0;
    if (max != null) num = Math.min(num, max);
    onChange(num);
  };

  return (
    <div className="sim-input-group">
      <label className="sim-input-label">{label}</label>
      <div className="sim-input-wrap">
        {prefix && <span className="sim-input-affix sim-input-prefix">{prefix}</span>}
        <input
          type="text"
          className="sim-input"
          value={focused ? localVal : formatted}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputMode="numeric"
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

function FormulaRow({ name, formula, inputs, result }) {
  return (
    <tr className="sim-formula-row">
      <td className="sim-formula-metric">{name}</td>
      <td className="sim-formula-expr">{formula}</td>
      <td className="sim-formula-inputs">{inputs}</td>
      <td className="sim-formula-result">{result}</td>
    </tr>
  );
}

function FormulasPanel({ budget, duration, monthlyRevenue, monthlyCost, discountRate, estimatedCustomers, results }) {
  const netCF = monthlyRevenue - monthlyCost;
  const monthlyRate = discountRate / 100 / 12;

  const rows = [
    {
      name: "Net Monthly Cash Flow",
      formula: "Monthly Revenue − Monthly Cost",
      inputs: `${fmt$(monthlyRevenue)} − ${fmt$(monthlyCost)}`,
      result: fmt$(netCF),
    },
    {
      name: "Total Returns",
      formula: "Net Monthly Cash Flow × Duration",
      inputs: `${fmt$(netCF)} × ${duration} months`,
      result: fmt$(results.totalReturns),
    },
    {
      name: "Net Present Value (NPV)",
      formula: "Σ [ CFₜ / (1 + r)ᵗ ] for t = 0…n",
      inputs: `CF₀ = −${fmt$(budget)}, CF₁…${duration} = ${fmt$(netCF)}, r = ${(monthlyRate * 100).toFixed(4)}% /mo`,
      result: fmt$(results.npv),
    },
    {
      name: "Return on Investment (ROI)",
      formula: "((Total Returns − Budget) / Budget) × 100",
      inputs: `(${fmt$(results.totalReturns)} − ${fmt$(budget)}) / ${fmt$(budget)}`,
      result: `${results.roi.toFixed(1)}%`,
    },
    {
      name: "Payback Period",
      formula: "Budget / Net Monthly Cash Flow",
      inputs: `${fmt$(budget)} / ${fmt$(netCF)}`,
      result: results.paybackMonth !== null ? `${results.paybackMonth.toFixed(1)} months` : "Never",
    },
    {
      name: "Internal Rate of Return (IRR)",
      formula: "Rate r where NPV = 0, annualized: (1 + r_monthly)¹² − 1",
      inputs: `Solve NPV(r, [−${fmt$(budget)}, ${fmt$(netCF)}×${duration}]) = 0`,
      result: results.irr !== null ? `${results.irr.toFixed(1)}%` : "N/A",
    },
    {
      name: "Cost per Customer",
      formula: "Budget / Estimated Customers",
      inputs: `${fmt$(budget)} / ${estimatedCustomers.toLocaleString("en-US")}`,
      result: fmt$(results.costPerCustomer),
    },
    {
      name: "CPC ÷ Customer Value",
      formula: "Cost per Customer / Avg Customer Profit",
      inputs: `${fmt$(results.costPerCustomer)} / ${fmt$(results.avgCustomerValue)}`,
      result: results.avgCustomerValue > 0 ? `${results.cpcToValueRatio.toFixed(1)}×` : "N/A",
    },
    {
      name: "Reach % of Customer Base",
      formula: "(Estimated Customers / Total Customers) × 100",
      inputs: `(${estimatedCustomers.toLocaleString("en-US")} / ${results.totalCustomers.toLocaleString("en-US")}) × 100`,
      result: results.totalCustomers > 0 ? `${results.reachPct.toFixed(1)}%` : "N/A",
    },
    {
      name: "Budget % of Total Profit",
      formula: "(Budget / Total Profit) × 100",
      inputs: `(${fmt$(budget)} / ${fmt$(results.totalProfit)}) × 100`,
      result: `${results.spendPct.toFixed(2)}%`,
    },
    {
      name: "Campaign Score",
      formula: "Weighted: NPV(20) + Payback(15) + ROI(15) + IRR(10) + CPC vs Value(25) + Reach(15)",
      inputs: `NPV=${fmt$(results.npv)}, ROI=${results.roi.toFixed(1)}%, CPC/Value=${results.cpcToValueRatio.toFixed(1)}×, Reach=${results.reachPct.toFixed(1)}%`,
      result: `${results.score} / 100`,
    },
  ];

  return (
    <div className="sim-formulas-panel">
      <table className="sim-formulas-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Formula</th>
            <th>Inputs</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <FormulaRow key={r.name} {...r} />)}
        </tbody>
      </table>
    </div>
  );
}

function downloadFormulasCSV(budget, duration, monthlyRevenue, monthlyCost, discountRate, estimatedCustomers, results) {
  const netCF = monthlyRevenue - monthlyCost;
  const monthlyRate = discountRate / 100 / 12;

  const header = ["Metric", "Formula", "Inputs", "Result"];
  const rows = [
    ["Net Monthly Cash Flow", "Monthly Revenue - Monthly Cost", `${monthlyRevenue} - ${monthlyCost}`, netCF],
    ["Total Returns", "Net Monthly Cash Flow × Duration", `${netCF} × ${duration}`, results.totalReturns],
    ["Net Present Value (NPV)", "SUM(CF_t / (1 + r)^t) for t=0..n", `CF0=-${budget}; CF1..${duration}=${netCF}; r=${(monthlyRate * 100).toFixed(4)}%/mo`, results.npv.toFixed(2)],
    ["Return on Investment (ROI)", "((Total Returns - Budget) / Budget) × 100", `(${results.totalReturns} - ${budget}) / ${budget}`, `${results.roi.toFixed(2)}%`],
    ["Payback Period", "Budget / Net Monthly Cash Flow", `${budget} / ${netCF}`, results.paybackMonth !== null ? `${results.paybackMonth.toFixed(2)} months` : "Never"],
    ["Internal Rate of Return (IRR)", "Rate r where NPV=0 annualized: (1+r_monthly)^12 - 1", `Solve NPV(r [-${budget} ${netCF}x${duration}])=0`, results.irr !== null ? `${results.irr.toFixed(2)}%` : "N/A"],
    ["Cost per Customer", "Budget / Estimated Customers", `${budget} / ${estimatedCustomers}`, results.costPerCustomer.toFixed(2)],
    ["Budget % of Total Profit", "(Budget / Total Profit) × 100", `(${budget} / ${results.totalProfit}) × 100`, `${results.spendPct.toFixed(2)}%`],
    ["CPC / Customer Value Ratio", "Cost per Customer / Avg Customer Profit", `${results.costPerCustomer.toFixed(2)} / ${results.avgCustomerValue}`, results.avgCustomerValue > 0 ? `${results.cpcToValueRatio.toFixed(2)}x` : "N/A"],
    ["Reach % of Customer Base", "(Estimated Customers / Total Customers) x 100", `(${estimatedCustomers} / ${results.totalCustomers}) x 100`, results.totalCustomers > 0 ? `${results.reachPct.toFixed(2)}%` : "N/A"],
    ["Campaign Score", "Weighted: NPV(20) + Payback(15) + ROI(15) + IRR(10) + CPC vs Value(25) + Reach(15)", `NPV=${results.npv.toFixed(2)} ROI=${results.roi.toFixed(2)}% CPC/Value=${results.cpcToValueRatio.toFixed(2)}x Reach=${results.reachPct.toFixed(2)}%`, `${results.score}/100`],
    [],
    ["--- INPUTS ---"],
    ["Campaign Budget", "", "", budget],
    ["Campaign Duration (months)", "", "", duration],
    ["Expected Monthly Revenue", "", "", monthlyRevenue],
    ["Ongoing Monthly Cost", "", "", monthlyCost],
    ["Discount Rate (Annual %)", "", "", `${discountRate}%`],
    ["Estimated Customer Reach", "", "", estimatedCustomers],
    [],
    ["--- CUSTOMER DATA BENCHMARKS ---"],
    ["Avg Customer Profit (from data)", "", "", results.avgCustomerValue],
    ["Median Customer Profit (from data)", "", "", results.medianProfit],
    ["Total Customers in Database", "", "", results.totalCustomers],
    ["Avg Household Income (from data)", "", "", results.avgIncome],
    [],
    ["--- CASH FLOWS ---"],
    ["Month", "Cash Flow", "Cumulative Cash Flow"],
  ];

  results.cumulativeCF.forEach((cum, i) => {
    const cf = i === 0 ? -budget : netCF;
    rows.push([`Month ${i}`, cf, cum.toFixed(2)]);
  });

  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [header.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "campaign_simulator_formulas.csv";
  a.click();
  URL.revokeObjectURL(url);
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

  const cpc = results.costPerCustomer;
  const avgVal = results.avgCustomerValue;
  const ratio = results.cpcToValueRatio;

  if (avgVal > 0 && cpc > 0) {
    if (ratio > 5) {
      lines.push(`CRITICAL: At ${fmt$(cpc)} per customer, you are spending ${ratio.toFixed(1)}× the average customer value of ${fmt$(avgVal)}. This campaign will almost certainly lose money on a per-customer basis. Reduce the budget or dramatically increase reach.`);
    } else if (ratio > 2) {
      lines.push(`WARNING: Customer acquisition cost of ${fmt$(cpc)} is ${ratio.toFixed(1)}× the average customer value of ${fmt$(avgVal)}. You are paying significantly more to acquire each customer than they are worth. This is not sustainable.`);
    } else if (ratio > 1) {
      lines.push(`Customer acquisition cost of ${fmt$(cpc)} exceeds the average customer value of ${fmt$(avgVal)} (${ratio.toFixed(1)}×). Each new customer costs more than their expected profit contribution. Consider lowering spend or improving targeting.`);
    } else if (ratio > 0.5) {
      lines.push(`At ${fmt$(cpc)} per customer (${(ratio * 100).toFixed(0)}% of avg customer value ${fmt$(avgVal)}), customer acquisition cost is moderate. There is a positive margin per customer, but room to improve efficiency.`);
    } else {
      lines.push(`Customer acquisition cost of ${fmt$(cpc)} is well below the average customer value of ${fmt$(avgVal)} (${(ratio * 100).toFixed(0)}%), indicating efficient spend with strong per-customer economics.`);
    }
  } else if (cpc > 0) {
    lines.push(`Cost per customer is ${fmt$(cpc)}. Connect customer profit data to benchmark this against actual customer value.`);
  }

  if (results.totalCustomers > 0 && results.reachPct < 1) {
    lines.push(`This campaign targets only ${results.reachPct.toFixed(2)}% of the ${results.totalCustomers.toLocaleString("en-US")} customer base. At such a narrow reach, even strong financial projections may not justify the investment. Consider whether the audience can realistically be expanded.`);
  } else if (results.totalCustomers > 0 && results.reachPct < 5) {
    lines.push(`Reaching ${results.reachPct.toFixed(1)}% of the ${results.totalCustomers.toLocaleString("en-US")} customer base. This is a focused campaign — ensure the targeting criteria justify the limited audience.`);
  }

  return lines;
}

export default function CampaignSimulator({ summaryData, onClose }) {
  const [budget, setBudget] = useState(PRESETS.conservative.budget);
  const [duration, setDuration] = useState(PRESETS.conservative.duration);
  const [monthlyRevenue, setMonthlyRevenue] = useState(PRESETS.conservative.monthlyRevenue);
  const [monthlyCost, setMonthlyCost] = useState(PRESETS.conservative.monthlyCost);
  const [discountRate, setDiscountRate] = useState(PRESETS.conservative.discountRate);
  const [activePreset, setActivePreset] = useState("conservative");
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [estimatedCustomers, setEstimatedCustomers] = useState(PRESETS.conservative.estimatedCustomers);

  const applyPreset = (key) => {
    const p = PRESETS[key];
    setBudget(p.budget);
    setDuration(p.duration);
    setMonthlyRevenue(p.monthlyRevenue);
    setMonthlyCost(p.monthlyCost);
    setDiscountRate(p.discountRate);
    setEstimatedCustomers(p.estimatedCustomers);
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

    const avgCustomerValue = summaryData?.avg_profit || 0;
    const totalCustomers = summaryData?.total_customers || 0;
    const medianProfit = summaryData?.median_profit || 0;
    const avgIncome = summaryData?.avg_household_income || 0;

    const costPerCustomer = estimatedCustomers > 0 ? budget / estimatedCustomers : 0;
    const cpcToValueRatio = avgCustomerValue > 0 && costPerCustomer > 0 ? costPerCustomer / avgCustomerValue : 0;
    const reachPct = totalCustomers > 0 && estimatedCustomers > 0 ? (estimatedCustomers / totalCustomers) * 100 : 0;

    const score = calcScore(npv, paybackMonth, duration, roi, irr, discountRate, costPerCustomer, estimatedCustomers, avgCustomerValue, totalCustomers);

    return {
      npv, irr, paybackMonth, roi, totalReturns, netMonthlyCF,
      spendPct, totalProfit, cashFlows, cumulativeCF,
      score, duration, discountRate, budget, costPerCustomer,
      avgCustomerValue, totalCustomers, medianProfit, avgIncome,
      cpcToValueRatio, reachPct,
    };
  }, [budget, duration, monthlyRevenue, monthlyCost, discountRate, estimatedCustomers, summaryData]);

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
      benchmark: true,
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
    {
      label: "Estimated Reach",
      value: estimatedCustomers.toLocaleString("en-US"),
      status: results.reachPct >= 10 ? "positive" : results.reachPct >= 1 ? "neutral" : "negative",
      hint: results.totalCustomers > 0
        ? `${results.reachPct.toFixed(1)}% of ${results.totalCustomers.toLocaleString("en-US")} customers`
        : "Customers targeted",
    },
    {
      label: "Cost per Customer",
      value: fmt$(results.costPerCustomer),
      status: results.cpcToValueRatio <= 0.5 ? "positive" : results.cpcToValueRatio <= 1 ? "neutral" : "negative",
      hint: results.avgCustomerValue > 0
        ? `${results.cpcToValueRatio.toFixed(1)}× avg value (${fmt$(results.avgCustomerValue)})`
        : "Budget ÷ estimated reach",
    },
  ];

  return (
    <div className="cluster-banner sim-container" style={{ "--cluster-color": "#0891b2" }}>
      <div className="cluster-banner-header">
        <div>
          <h2 className="cluster-banner-title">Campaign Simulator</h2>
          <p className="cluster-banner-subtitle">Model financial outcomes and forecast marketing campaign ROI</p>
        </div>
        <button className="cluster-banner-close sim-back-full" onClick={onClose}>
          ← Back to All Segments
        </button>
        <button className="sim-back-icon" onClick={onClose} aria-label="Back to All Segments">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="sim-back-icon-tooltip">Back to All Segments</span>
        </button>
      </div>

      {/* Scenario Presets */}
      <div className="sim-presets">
        <span className="sim-presets-label">Quick Scenarios:</span>
        <div className="sim-presets-btns-row">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`sim-preset-btn ${activePreset === key ? "active" : ""}`}
              data-preset={key}
              onClick={() => applyPreset(key)}
            >
              <span className="sim-preset-name">{preset.label}</span>
              <span className="sim-preset-desc">{preset.desc}</span>
            </button>
          ))}
        </div>
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
          <InputGroup label="Campaign Duration" suffix="months" value={duration} onChange={(v) => { setDuration(v); setActivePreset(null); }} min={1} max={60} step={1} integer helpText="How long the campaign runs" />
          <InputGroup label="Expected Monthly Revenue" prefix="$" value={monthlyRevenue} onChange={(v) => { setMonthlyRevenue(v); setActivePreset(null); }} step={500} helpText="Revenue generated per month" />
          <InputGroup label="Ongoing Monthly Cost" prefix="$" value={monthlyCost} onChange={(v) => { setMonthlyCost(v); setActivePreset(null); }} step={500} helpText="Recurring costs per month" />
          <InputGroup label="Estimated Customer Reach" value={estimatedCustomers} onChange={(v) => { setEstimatedCustomers(v); setActivePreset(null); }} min={1} step={50} integer helpText="Customers you expect to reach" />
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

      {/* Customer Economics Benchmark */}
      {results.avgCustomerValue > 0 && (
        <div className="sim-section">
          <div className="cluster-section-header">
            <svg className="cluster-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
              <path d="M16 3l2 2-2 2" />
            </svg>
            <h4 className="cluster-section-label">Customer Economics</h4>
            <span className="sim-econ-source">Based on {results.totalCustomers.toLocaleString("en-US")} customers in your data</span>
          </div>
          <div className="sim-econ-grid">
            <div className="sim-econ-card">
              <span className="sim-econ-card-label">Avg Customer Value</span>
              <span className="sim-econ-card-value">{fmt$(results.avgCustomerValue)}</span>
              <span className="sim-econ-card-hint">Average profit per customer</span>
            </div>
            <div className="sim-econ-card">
              <span className="sim-econ-card-label">Median Customer Value</span>
              <span className="sim-econ-card-value">{fmt$(results.medianProfit)}</span>
              <span className="sim-econ-card-hint">Midpoint customer profit</span>
            </div>
            <div className="sim-econ-card">
              <span className="sim-econ-card-label">Your Cost per Customer</span>
              <span className={`sim-econ-card-value ${results.cpcToValueRatio > 1 ? "sim-econ-danger" : results.cpcToValueRatio > 0.5 ? "sim-econ-warn" : "sim-econ-good"}`}>
                {fmt$(results.costPerCustomer)}
              </span>
              <span className="sim-econ-card-hint">Budget ÷ estimated reach</span>
            </div>
            <div className="sim-econ-card">
              <span className="sim-econ-card-label">CPC ÷ Customer Value</span>
              <span className={`sim-econ-card-value ${results.cpcToValueRatio > 1 ? "sim-econ-danger" : results.cpcToValueRatio > 0.5 ? "sim-econ-warn" : "sim-econ-good"}`}>
                {results.cpcToValueRatio.toFixed(1)}×
              </span>
              <span className="sim-econ-card-hint">{results.cpcToValueRatio <= 0.5 ? "Efficient — well below value" : results.cpcToValueRatio <= 1 ? "Caution — nearing customer value" : "Overspend — exceeds customer value"}</span>
            </div>
          </div>
          <div className="sim-econ-bar-wrap">
            <div className="sim-econ-bar-header">
              <span>Customer Acquisition Cost vs Customer Value</span>
              <span className={results.cpcToValueRatio > 1 ? "sim-econ-danger" : results.cpcToValueRatio > 0.5 ? "sim-econ-warn" : "sim-econ-good"}>
                {results.cpcToValueRatio > 1 ? "Overspending" : results.cpcToValueRatio > 0.5 ? "Moderate" : "Efficient"}
              </span>
            </div>
            <div className="sim-econ-bar-track">
              <div className="sim-econ-bar-benchmark" />
              <div
                className={`sim-econ-bar-fill ${results.cpcToValueRatio > 1 ? "danger" : results.cpcToValueRatio > 0.5 ? "warn" : "good"}`}
                style={{ width: `${Math.min(results.cpcToValueRatio * 100, 200) / 2}%` }}
              />
              <div className="sim-econ-bar-marker" style={{ left: "50%" }}>
                <span>Avg Value: {fmt$(results.avgCustomerValue)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="sim-formulas-actions">
            <button
              className={`sim-formulas-toggle-btn ${showFormulas ? "active" : ""}`}
              onClick={() => setShowFormulas((v) => !v)}
              title="View formulas used in calculations"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 17h6M17 14v6" />
              </svg>
              {showFormulas ? "Hide Formulas" : "Show Formulas"}
            </button>
            <button
              className="sim-csv-btn"
              onClick={() => downloadFormulasCSV(budget, duration, monthlyRevenue, monthlyCost, discountRate, estimatedCustomers, results)}
              title="Download formulas and outputs as CSV"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV
            </button>
          </div>
        </div>

        {showFormulas && (
          <FormulasPanel
            budget={budget}
            duration={duration}
            monthlyRevenue={monthlyRevenue}
            monthlyCost={monthlyCost}
            discountRate={discountRate}
            estimatedCustomers={estimatedCustomers}
            results={results}
          />
        )}

        <div className="sim-results-grid">
          {resultCards.map((card) => {
            const bench = card.benchmark ? getIrrBenchmark(activePreset) : null;
            const irrStatus = bench ? getIrrStatus(results.irr, bench) : null;
            return (
              <div key={card.label} className={`sim-result-card ${card.status}`}>
                <span className="sim-result-value">{card.value}</span>
                <span className="sim-result-label">{card.label}</span>
                <span className={`sim-result-hint ${card.status}`}>{card.hint}</span>
                {bench && results.irr !== null && (
                  <span className={`sim-irr-badge sim-irr-${irrStatus}`}>
                    {irrStatus === "within" && "✓ Within industry range"}
                    {irrStatus === "below" && "▼ Below industry range"}
                    {irrStatus === "above" && "▲ Above industry range"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Industry IRR Benchmark */}
        {(() => {
          const bench = getIrrBenchmark(activePreset);
          const irrStatus = getIrrStatus(results.irr, bench);
          const irrVal = results.irr;
          return (
            <div className={`sim-benchmark-panel sim-benchmark-${irrStatus}`}>
              <div className="sim-benchmark-header">
                <svg className="sim-benchmark-eq-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect className="sim-eq-bar sim-eq-bar-1" x="2"  y="14" width="4" height="6" rx="1" />
                  <rect className="sim-eq-bar sim-eq-bar-2" x="10" y="10" width="4" height="10" rx="1" />
                  <rect className="sim-eq-bar sim-eq-bar-3" x="18" y="6"  width="4" height="14" rx="1" />
                </svg>
                <span className="sim-benchmark-title">Industry IRR Benchmark</span>
                <span className="sim-benchmark-source">{bench.label}</span>
              </div>
              <div className="sim-benchmark-bar-wrap">
                <div className="sim-benchmark-bar-track">
                  <div
                    className="sim-benchmark-bar-range"
                    style={{
                      left: `${(bench.irrLow / 60) * 100}%`,
                      width: `${((bench.irrHigh - bench.irrLow) / 60) * 100}%`,
                    }}
                  />
                  {irrVal !== null && irrVal >= -10 && (
                    <div
                      className={`sim-benchmark-bar-marker sim-irr-${irrStatus}`}
                      style={{ left: `${Math.max(0, Math.min((irrVal / 60) * 100, 100))}%` }}
                    >
                      <span className="sim-benchmark-marker-label">{irrVal.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div className="sim-benchmark-bar-labels">
                  <span>0%</span>
                  <span>{bench.irrLow}%</span>
                  <span>{bench.irrHigh}%</span>
                  <span>60%</span>
                </div>
              </div>
              <div className="sim-benchmark-ranges">
                <div className="sim-benchmark-range-item">
                  <span className="sim-benchmark-dot" style={{ background: "#d97706" }} />
                  <span>Conservative: 8–20% IRR</span>
                </div>
                <div className="sim-benchmark-range-item">
                  <span className="sim-benchmark-dot" style={{ background: "#0891b2" }} />
                  <span>Moderate: 15–35% IRR</span>
                </div>
                <div className="sim-benchmark-range-item">
                  <span className="sim-benchmark-dot" style={{ background: "#059669" }} />
                  <span>Aggressive: 25–50% IRR</span>
                </div>
              </div>
              {irrStatus !== "within" && irrVal !== null && (
                <div className={`sim-benchmark-note sim-benchmark-note-${irrStatus}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    {irrStatus === "below"
                      ? `Your projected IRR of ${irrVal.toFixed(1)}% is below the typical ${bench.irrLow}–${bench.irrHigh}% range for ${bench.label.toLowerCase()} campaigns. This may indicate insufficient revenue relative to costs, or an overly conservative discount rate. Consider adjusting campaign parameters or targeting higher-value segments.`
                      : `Your projected IRR of ${irrVal.toFixed(1)}% exceeds the typical ${bench.irrLow}–${bench.irrHigh}% range for ${bench.label.toLowerCase()} campaigns. While ambitious, verify that revenue projections are realistic given the declining pay TV market — overly optimistic assumptions can lead to underperformance.`
                    }
                  </span>
                </div>
              )}
            </div>
          );
        })()}
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
            <ScrollReveal key={i} delay={i * 150}>
              <div className="cluster-ai-rec">
                <span className="cluster-ai-rec-num">{i + 1}</span>
                <span>{text}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <button className="sim-back-bottom" onClick={onClose}>
        ← Back to All Segments
      </button>
    </div>
  );
}
