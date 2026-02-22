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

function HorizontalBarChart({ data, valueKey, fills, title, subtitle, onBarClick }) {
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
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 120, bottom: 5, left: 100 }}>
          <CartesianGrid />
          <XAxis type="number" tick={<CurrencyTick />} />
          <YAxis dataKey="name" type="category" width={90} />
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

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 120, bottom: 5, left: 90 }}>
          <CartesianGrid />
          <XAxis type="number" unit="%" />
          <YAxis dataKey="name" type="category" width={80} />
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

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={true}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onClick={onClick}
          >
            {fills.map((fill, i) => (
              <Cell key={i} fill={fill} fillOpacity={opacity(i)} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function Charts({ data, onClusterClick, onAgeClick, onGenderClick, onHomeownerClick, onDwellingClick, onEducationClick }) {
  if (!data) return null;

  const clusterFills = rankedFills(data.profit_by_cluster, "value");
  const ageFills = rankedFills(data.avg_profit_by_age, "value");
  const genderFills = data.profit_by_gender ? rankedFills(data.profit_by_gender, "total_profit") : [];
  const ownerFills = data.profit_by_homeowner ? rankedFills(data.profit_by_homeowner, "total_profit") : [];
  const dwellingFills = rankedFills(data.dwelling_profit, "value");
  const lifestyleFills = data.lifestyle_data ? rankedFills(data.lifestyle_data, "pct") : [];
  const eduFills = data.profit_by_education ? rankedFills(data.profit_by_education, "avg_profit") : [];
  const pieFills = data.profit_components ? rankedFills(data.profit_components, "value") : [];

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
      </div>
    </section>
  );
}
