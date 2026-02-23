import { useState, useCallback, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
  Sector,
} from "recharts";

const RANKED = [
  "#0891b2", "#4f46e5", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#db2777", "#2563eb",
  "#64748b", "#94a3b8",
];

const FULL_OPACITY = 1;
const DIM_OPACITY = 0.55;

function shortCurrency(val) {
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${Math.round(val / 1_000)}K`;
  return `$${Math.round(val)}`;
}

function customerPct(data, index) {
  const totalCustomers = data.reduce((s, d) => s + (d.count || 0), 0);
  const groupCount = data[index]?.count || 0;
  return totalCustomers > 0 ? Math.round((groupCount / totalCustomers) * 100) : 0;
}

function findMaxIndex(data, key) {
  let maxIdx = 0;
  let maxVal = -Infinity;
  data.forEach((d, i) => {
    if ((d[key] || 0) > maxVal) {
      maxVal = d[key] || 0;
      maxIdx = i;
    }
  });
  return maxIdx;
}

function rankedFills(data, key) {
  const ranked = data
    .map((d, i) => ({ i, v: d[key] || 0 }))
    .sort((a, b) => b.v - a.v);
  const fills = new Array(data.length);
  ranked.forEach(({ i }, rank) => {
    fills[i] = RANKED[rank % RANKED.length];
  });
  return fills;
}

function useBarFocus(maxIdx) {
  const [hovered, setHovered] = useState(null);
  const [clicked, setClicked] = useState(null);
  const hoverTimer = useRef(null);

  const focal = clicked ?? hovered;
  const showLabel = hovered === null;
  const labelIdx = showLabel ? (clicked ?? maxIdx) : -1;

  const opacity = useCallback(
    (i) => {
      if (focal === null) return i === maxIdx ? FULL_OPACITY : DIM_OPACITY;
      return i === focal ? FULL_OPACITY : DIM_OPACITY;
    },
    [focal, maxIdx]
  );

  const onEnter = useCallback((_, idx) => {
    clearTimeout(hoverTimer.current);
    setHovered(idx);
  }, []);

  const onLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(null), 80);
  }, []);

  const onClick = useCallback(
    (_, idx) => setClicked((prev) => (prev === idx ? null : idx)),
    []
  );

  return { labelIdx, opacity, onEnter, onLeave, onClick };
}

function makeBarLabel(data, valueKey, layout, focalIdx, withBg) {
  return function BarLabel(props) {
    const { x, y, width, height, index, value } = props;
    if (focalIdx < 0 || index !== focalIdx) return null;

    const pct = customerPct(data, index);
    const label = shortCurrency(value);
    const line2 = `${pct}% of customers`;

    if (layout === "vertical") {
      const fitsInside = height > 36 && width > 80;
      if (fitsInside) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        return (
          <g>
            {withBg && (
              <rect
                x={cx - 52} y={cy - 16}
                width={104} height={32} rx={6}
                className="chart-label-bg"
              />
            )}
            <text x={cx} y={cy - 3} className="chart-label-value text-anchor-middle">{label}</text>
            <text x={cx} y={cy + 11} className="chart-label-subtitle text-anchor-middle">{line2}</text>
          </g>
        );
      }
      const cx = x + width / 2;
      const ty = y - 6;
      const outsideCls = withBg ? "" : " chart-label-outside";
      return (
        <g>
          {withBg && (
            <rect
              x={cx - 52} y={ty - 20}
              width={104} height={32} rx={6}
              className="chart-label-bg"
            />
          )}
          <text x={cx} y={ty - 7} className={`chart-label-value text-anchor-middle${outsideCls}`}>{label}</text>
          <text x={cx} y={ty + 7} className={`chart-label-subtitle text-anchor-middle${outsideCls}`}>{line2}</text>
        </g>
      );
    }

    const fitsInside = width > 160;
    if (fitsInside) {
      const cx = x + width - 12;
      const cy = y + height / 2;
      return (
        <g>
          <text x={cx} y={cy - 4} className="chart-label-value text-anchor-end">{label}</text>
          <text x={cx} y={cy + 10} className="chart-label-subtitle text-anchor-end">{line2}</text>
        </g>
      );
    }
    const lx = x + width + 10;
    const cy = y + height / 2;
    return (
      <g>
        <text x={lx} y={cy - 4} className="chart-label-value chart-label-outside">{label}</text>
        <text x={lx} y={cy + 10} className="chart-label-subtitle chart-label-outside">{line2}</text>
      </g>
    );
  };
}

function makePctLabel(data, focalIdx) {
  return function PctLabel(props) {
    const { x, y, width, height, index, value } = props;
    if (focalIdx < 0 || index !== focalIdx) return null;

    const pct = customerPct(data, index);
    const fitsInside = width > 160;

    if (fitsInside) {
      const cx = x + width - 12;
      const cy = y + height / 2;
      return (
        <g>
          <text x={cx} y={cy - 4} className="chart-label-pct text-anchor-end">{value}%</text>
          <text x={cx} y={cy + 10} className="chart-label-subtitle text-anchor-end">{pct}% of customers</text>
        </g>
      );
    }
    const lx = x + width + 10;
    const cy = y + height / 2;
    return (
      <g>
        <text x={lx} y={cy - 4} className="chart-label-pct chart-label-outside">{value}%</text>
        <text x={lx} y={cy + 10} className="chart-label-subtitle chart-label-outside">{pct}% of customers</text>
      </g>
    );
  };
}

function CurrencyTick({ x, y, payload }) {
  return (
    <text x={x} y={y} className="chart-tick-label text-anchor-end">
      {shortCurrency(payload.value)}
    </text>
  );
}

function CurrencyTooltip({ active, payload, label, totalCustomers }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const count = entry?.count || 0;
  const pct = totalCustomers > 0 ? Math.round((count / totalCustomers) * 100) : 0;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">
        ${Number(payload[0].value).toLocaleString("en-US")}
      </p>
      {count > 0 && (
        <>
          <p className="chart-tooltip-detail">{Number(count).toLocaleString("en-US")} customers ({pct}%)</p>
        </>
      )}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const pct = typeof d.percent === "number" ? (d.percent * 100).toFixed(1) : d.payload?.percent != null ? (d.payload.percent * 100).toFixed(1) : null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{d.name}</p>
      <p className="chart-tooltip-value">
        ${Number(d.value).toLocaleString("en-US")}
      </p>
      {pct != null && <p className="chart-tooltip-detail">{pct}% of total</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  const cardRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold: 0.15, rootMargin: "0px 0px -20px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="chart-card" ref={cardRef}>
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      {inView ? children : <div style={{ height: 300 }} />}
    </div>
  );
}

function VerticalBarChart({ data, valueKey, fills, title, subtitle, labelBg, onBarClick }) {
  const maxIdx = findMaxIndex(data, valueKey);
  const { labelIdx, opacity, onEnter, onLeave, onClick } = useBarFocus(maxIdx);
  const totalCustomers = data.reduce((s, d) => s + (d.count || 0), 0);

  const handleClick = useCallback((entry, idx) => {
    onClick(entry, idx);
    if (onBarClick) onBarClick(data[idx], idx);
  }, [onClick, onBarClick, data]);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 30, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid />
          <XAxis dataKey="name" />
          <YAxis tick={<CurrencyTick />} />
          <Tooltip content={<CurrencyTooltip totalCustomers={totalCustomers} />} />
          <Bar
            dataKey={valueKey}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onClick={handleClick}
            cursor={onBarClick ? "pointer" : undefined}
          >
            {fills.map((fill, i) => (
              <Cell key={i} fill={fill} fillOpacity={opacity(i)} />
            ))}
            <LabelList content={makeBarLabel(data, valueKey, "vertical", labelIdx, labelBg && data.length > 3)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function useNarrow(breakpoint = 550) {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return narrow;
}

function HorizontalBarChart({ data, valueKey, fills, title, subtitle, onBarClick }) {
  const maxIdx = findMaxIndex(data, valueKey);
  const { labelIdx, opacity, onEnter, onLeave, onClick } = useBarFocus(maxIdx);
  const totalCustomers = data.reduce((s, d) => s + (d.count || 0), 0);
  const narrow = useNarrow();

  const handleClick = useCallback((entry, idx) => {
    onClick(entry, idx);
    if (onBarClick) onBarClick(data[idx], idx);
  }, [onClick, onBarClick, data]);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: narrow ? 20 : 120, bottom: 5, left: narrow ? 0 : 100 }}>
          <CartesianGrid />
          <XAxis type="number" tick={narrow ? false : <CurrencyTick />} />
          <YAxis dataKey="name" type="category" width={narrow ? 70 : 90} tick={{ fontSize: narrow ? 10 : 12 }} />
          <Tooltip content={<CurrencyTooltip totalCustomers={totalCustomers} />} />
          <Bar
            dataKey={valueKey}
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onClick={handleClick}
            cursor={onBarClick ? "pointer" : undefined}
          >
            {fills.map((fill, i) => (
              <Cell key={i} fill={fill} fillOpacity={opacity(i)} />
            ))}
            <LabelList content={makeBarLabel(data, valueKey, "horizontal", labelIdx)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function LifestyleBarChart({ data, fills, title, subtitle }) {
  const maxIdx = findMaxIndex(data, "pct");
  const { labelIdx, opacity, onEnter, onLeave, onClick } = useBarFocus(maxIdx);
  const narrow = useNarrow();

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: narrow ? 20 : 120, bottom: 5, left: narrow ? 0 : 90 }}>
          <CartesianGrid />
          <XAxis type="number" unit="%" />
          <YAxis dataKey="name" type="category" width={narrow ? 65 : 80} tick={{ fontSize: narrow ? 10 : 12 }} />
          <Tooltip formatter={(val) => [`${val}%`, "Penetration"]} />
          <Bar
            dataKey="pct"
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onClick={onClick}
          >
            {fills.map((fill, i) => (
              <Cell key={i} fill={fill} fillOpacity={opacity(i)} />
            ))}
            <LabelList content={makePctLabel(data, labelIdx)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function PieChartCard({ data, fills, title, subtitle }) {
  const maxIdx = findMaxIndex(data, "value");
  const { labelIdx, opacity, onEnter, onLeave, onClick } = useBarFocus(maxIdx);
  const compact = useNarrow(660);
  const veryCompact = useNarrow(430);

  const cleanName = (name) => name.replace(" Revenue", "");

  const shortName = (name) => {
    if (!compact) return cleanName(name);
    if (name === "Receiver Revenue") return "Receiver";
    if (name === "DVR Revenue") return "DVR";
    if (name === "HD Revenue") return "HD";
    if (name === "PPV Revenue") return "PPV";
    return cleanName(name);
  };

  const explodedShape = useCallback((props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, fillOpacity } = props;
    const RADIAN = Math.PI / 180;
    const offset = 6;
    const dx = offset * Math.cos(-midAngle * RADIAN);
    const dy = offset * Math.sin(-midAngle * RADIAN);
    return (
      <g>
        <Sector cx={cx + dx} cy={cy + dy} innerRadius={innerRadius} outerRadius={outerRadius}
          startAngle={startAngle} endAngle={endAngle}
          fill={fill} fillOpacity={fillOpacity}
          stroke="#fff" strokeWidth={2} />
      </g>
    );
  }, []);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={veryCompact ? 340 : 300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy={veryCompact ? "42%" : "50%"}
            outerRadius={compact ? 85 : 100}
            activeIndex={compact ? maxIdx : undefined}
            activeShape={compact ? explodedShape : undefined}
            label={(props) => {
              const { name, percent, x, y, cx, cy, outerRadius: or, index } = props;
              const pctStr = (percent * 100).toFixed(1) + "%";
              const isMax = index === maxIdx;

              if (!compact) {
                const nudge = x > cx ? -5 : 5;
                return (
                  <text x={x + nudge} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
                    fill={isMax ? "#0f172a" : "#666"} fontSize={12} fontWeight={isMax ? 800 : 400}>
                    {cleanName(name)} {pctStr}
                  </text>
                );
              }

              const color = fills[index];

              if (isMax) {
                const textY = cy - or - 20;
                const arrowStart = textY + 6;
                const arrowEnd = cy - or - 2;
                return (
                  <g>
                    <circle cx={cx - 68} cy={textY} r={5} fill={color} />
                    <text x={cx + 5} y={textY} textAnchor="middle" dominantBaseline="central"
                      fill="#0f172a" fontSize={12.5} fontWeight={800}>
                      {shortName(name)} {pctStr}
                    </text>
                    <line x1={cx} y1={arrowStart} x2={cx} y2={arrowEnd}
                      stroke="#0f172a" strokeWidth={1.5} />
                    <polygon
                      points={`${cx},${arrowEnd + 5} ${cx - 4},${arrowEnd - 1} ${cx + 4},${arrowEnd - 1}`}
                      fill="#0f172a" />
                  </g>
                );
              }

              if (veryCompact) {
                const nonMaxItems = data
                  .filter((_, i) => i !== maxIdx)
                  .sort((a, b) => (b.value || 0) - (a.value || 0));
                const rank = nonMaxItems.findIndex((d) => d.name === name);
                const baseY = cy + or + 18;
                const labelY = baseY + rank * 16;
                return (
                  <g>
                    <circle cx={cx - 42} cy={labelY} r={4} fill={color} />
                    <text x={cx + 5} y={labelY} textAnchor="middle" dominantBaseline="central"
                      fill="#666" fontSize={11.5} fontWeight={400}>
                      {shortName(name)} {pctStr}
                    </text>
                  </g>
                );
              }

              const anchor = x > cx ? "start" : "end";
              const dotX = anchor === "start" ? x - 8 : x + 8;
              return (
                <g>
                  <circle cx={dotX} cy={y} r={4} fill={color} />
                  <text x={x} y={y} textAnchor={anchor} dominantBaseline="central"
                    fill="#666" fontSize={12.5} fontWeight={400}>
                    {shortName(name)} {pctStr}
                  </text>
                </g>
              );
            }}
            labelLine={({ index, points }) => {
              if (!compact) return true;
              if (index === maxIdx) return null;
              if (veryCompact) return null;
              if (!points || points.length < 2) return null;
              return (
                <path d={`M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`}
                  stroke="#999" fill="none" strokeWidth={1} />
              );
            }}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onClick={onClick}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={fills[i]}
                fillOpacity={opacity(i)}
              />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function LifestyleProfitCard({ data }) {
  if (!data?.length) return null;
  const top3 = data.filter((d) => d.diff > 0).slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <ChartCard
      title="Lifestyle Interest Profit Insights"
      subtitle="Which lifestyle interests correlate with higher-value customers?"
    >
      <div className="lifestyle-profit-list">
        {top3.map((item) => (
          <div key={item.name} className="lifestyle-profit-item">
            <div className="lifestyle-profit-name">{item.name} Enthusiasts</div>
            <div className="lifestyle-profit-stats">
              <span className="lifestyle-profit-diff" style={{ color: "#059669" }}>
                +${Math.abs(item.diff).toLocaleString("en-US")}
              </span>
              <span className="lifestyle-profit-detail">
                higher avg profit vs non-{item.name.toLowerCase()} customers
              </span>
            </div>
            <div className="lifestyle-profit-bar-wrap">
              <div className="lifestyle-profit-bar-row">
                <span className="lifestyle-profit-bar-label">With</span>
                <div className="lifestyle-profit-bar-track">
                  <div
                    className="lifestyle-profit-bar-fill"
                    style={{
                      width: `${Math.min(100, (item.avg_profit_yes / Math.max(item.avg_profit_yes, item.avg_profit_no)) * 100)}%`,
                      background: "#059669",
                    }}
                  />
                </div>
                <span className="lifestyle-profit-bar-val">${item.avg_profit_yes.toLocaleString("en-US")}</span>
              </div>
              <div className="lifestyle-profit-bar-row">
                <span className="lifestyle-profit-bar-label">Without</span>
                <div className="lifestyle-profit-bar-track">
                  <div
                    className="lifestyle-profit-bar-fill"
                    style={{
                      width: `${Math.min(100, (item.avg_profit_no / Math.max(item.avg_profit_yes, item.avg_profit_no)) * 100)}%`,
                      background: "#94a3b8",
                    }}
                  />
                </div>
                <span className="lifestyle-profit-bar-val">${item.avg_profit_no.toLocaleString("en-US")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export default function Charts({ data, onClusterClick, onAgeClick, onGenderClick, onHomeownerClick, onDwellingClick, onEducationClick, onMaritalClick }) {
  if (!data) return null;

  const clusterFills = rankedFills(data.profit_by_cluster, "value");
  const ageFills = rankedFills(data.avg_profit_by_age, "value");
  const genderFills = data.profit_by_gender ? rankedFills(data.profit_by_gender, "total_profit") : [];
  const ownerFills = data.profit_by_homeowner ? rankedFills(data.profit_by_homeowner, "total_profit") : [];
  const dwellingFills = rankedFills(data.dwelling_profit, "value");
  const lifestyleFills = data.lifestyle_data ? rankedFills(data.lifestyle_data, "pct") : [];
  const eduFills = data.profit_by_education ? rankedFills(data.profit_by_education, "avg_profit") : [];
  const pieFills = data.profit_components ? rankedFills(data.profit_components, "value") : [];
  const maritalFills = data.profit_by_marital ? rankedFills(data.profit_by_marital, "total_profit") : [];
  const responderFills = data.responder_data ? rankedFills(data.responder_data, "avg_profit") : [];

  return (
    <section id="section-charts" className="charts-section">
      <h2 className="section-heading">
        <svg className="section-heading-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Marketing Analytics
      </h2>

      <div className="charts-grid">
        {data.profit_components?.length > 0 && (
          <PieChartCard
            data={data.profit_components}
            fills={pieFills}
            title="Revenue by Service Component"
            subtitle="Which services drive the most profit?"
          />
        )}

        <VerticalBarChart
          data={data.profit_by_cluster}
          valueKey="value"
          fills={clusterFills}
          title="Total Profit by Customer Segment"
          subtitle="Segment profitability for targeting"
          labelBg
          onBarClick={onClusterClick}
        />

        <VerticalBarChart
          data={data.avg_profit_by_age}
          valueKey="value"
          fills={ageFills}
          title="Avg Customer Profit by Age Group"
          subtitle="Which age demographics are most valuable?"
          labelBg
          onBarClick={onAgeClick}
        />

        {data.profit_by_gender?.length > 0 && (
          <VerticalBarChart
            data={data.profit_by_gender}
            valueKey="total_profit"
            fills={genderFills}
            title="Total Profit by Gender"
            subtitle="Gender-based profitability comparison"
            onBarClick={onGenderClick}
          />
        )}

        {data.profit_by_homeowner?.length > 0 && (
          <VerticalBarChart
            data={data.profit_by_homeowner}
            valueKey="total_profit"
            fills={ownerFills}
            title="Profit: Homeowners vs Renters"
            subtitle="Ownership segment comparison"
            onBarClick={onHomeownerClick}
          />
        )}

        <HorizontalBarChart
          data={data.dwelling_profit}
          valueKey="value"
          fills={dwellingFills}
          title="Profit by Dwelling Type"
          subtitle="Which housing types generate the most revenue?"
          onBarClick={onDwellingClick}
        />

        {data.lifestyle_data?.length > 0 && (
          <LifestyleBarChart
            data={data.lifestyle_data}
            fills={lifestyleFills}
            title="Customer Lifestyle Interests"
            subtitle="% of customers with each interest indicator"
          />
        )}

        {data.profit_by_education?.length > 0 && (
          <VerticalBarChart
            data={data.profit_by_education}
            valueKey="avg_profit"
            fills={eduFills}
            title="Avg Profit by Education Level"
            subtitle="Does education correlate with customer value?"
            onBarClick={onEducationClick}
          />
        )}

        {data.profit_by_marital?.length > 0 && (
          <VerticalBarChart
            data={data.profit_by_marital}
            valueKey="total_profit"
            fills={maritalFills}
            title="Total Profit by Marital Status"
            subtitle="Single vs married customer profitability"
            onBarClick={onMaritalClick}
          />
        )}

        {data.responder_data?.length > 0 && (
          <VerticalBarChart
            data={data.responder_data}
            valueKey="avg_profit"
            fills={responderFills}
            title="Avg Profit by Responder Rating"
            subtitle="Do more responsive customers generate higher value?"
          />
        )}

        {data.lifestyle_profit?.length > 0 && (
          <LifestyleProfitCard data={data.lifestyle_profit} />
        )}
      </div>
    </section>
  );
}
