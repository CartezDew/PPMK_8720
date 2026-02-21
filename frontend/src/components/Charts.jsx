import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#db2777", "#2563eb",
];

function CurrencyTick({ x, y, payload }) {
  const val = payload.value;
  const display =
    Math.abs(val) >= 1_000_000
      ? `$${(val / 1_000_000).toFixed(1)}M`
      : Math.abs(val) >= 1_000
        ? `$${(val / 1_000).toFixed(0)}K`
        : `$${val}`;
  return (
    <text x={x} y={y} textAnchor="end" dominantBaseline="middle" fontSize={12} fill="#64748b">
      {display}
    </text>
  );
}

function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">
        ${Number(payload[0].value).toLocaleString("en-US")}
      </p>
    </div>
  );
}

function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">
        {Number(payload[0].value).toLocaleString("en-US")} records
      </p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {children}
    </div>
  );
}

export default function Charts({ data }) {
  if (!data) return null;

  return (
    <section className="charts-grid">
      {/* Profit by Cluster */}
      <ChartCard title="Total Profit by Cluster">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.profit_by_cluster} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" fontSize={12} tick={{ fill: "#64748b" }} />
            <YAxis tick={<CurrencyTick />} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.profit_by_cluster.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Avg Profit by Age Group */}
      <ChartCard title="Average Profit by Age Group">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.avg_profit_by_age} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" fontSize={12} tick={{ fill: "#64748b" }} />
            <YAxis tick={<CurrencyTick />} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Profit Distribution */}
      <ChartCard title="Profit Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.profit_distribution} margin={{ top: 5, right: 20, bottom: 40, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="bin"
              fontSize={10}
              tick={{ fill: "#64748b" }}
              angle={-35}
              textAnchor="end"
              interval={1}
            />
            <YAxis fontSize={12} tick={{ fill: "#64748b" }} />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Dwelling Type Profit */}
      <ChartCard title="Total Profit by Dwelling Type">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.dwelling_profit} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={<CurrencyTick />} />
            <YAxis dataKey="name" type="category" fontSize={12} tick={{ fill: "#64748b" }} width={90} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}
