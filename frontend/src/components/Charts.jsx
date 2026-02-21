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
  Legend,
} from "recharts";

const COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#db2777", "#2563eb",
];

const GENDER_COLORS = { Female: "#db2777", Male: "#2563eb", Unknown: "#94a3b8" };
const OWNER_COLORS = { Homeowner: "#059669", Renter: "#d97706", Unknown: "#94a3b8" };

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
        {Number(payload[0].value).toLocaleString("en-US")} customers
      </p>
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{d.name}</p>
      <p className="chart-tooltip-value">
        ${Number(d.value).toLocaleString("en-US")}
      </p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      {children}
    </div>
  );
}

export default function Charts({ data }) {
  if (!data) return null;

  return (
    <section className="charts-section">
      <h2 className="section-heading">Marketing Analytics</h2>

      <div className="charts-grid">
        {/* Revenue by Service Component */}
        {data.profit_components?.length > 0 && (
          <ChartCard title="Revenue by Service Component" subtitle="Which services drive the most profit?">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.profit_components}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                  fontSize={11}
                >
                  {data.profit_components.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Profit by Customer Segment (Cluster) */}
        <ChartCard title="Total Profit by Customer Segment" subtitle="Segment profitability for targeting">
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
        <ChartCard title="Avg Customer Profit by Age Group" subtitle="Which age demographics are most valuable?">
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

        {/* Profit by Gender */}
        {data.profit_by_gender?.length > 0 && (
          <ChartCard title="Total Profit by Gender" subtitle="Gender-based profitability comparison">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.profit_by_gender} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: "#64748b" }} />
                <YAxis tick={<CurrencyTick />} />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar dataKey="total_profit" radius={[4, 4, 0, 0]}>
                  {data.profit_by_gender.map((entry, i) => (
                    <Cell key={i} fill={GENDER_COLORS[entry.name] || COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Profit by Homeowner Status */}
        {data.profit_by_homeowner?.length > 0 && (
          <ChartCard title="Profit: Homeowners vs Renters" subtitle="Ownership segment comparison">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.profit_by_homeowner} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: "#64748b" }} />
                <YAxis tick={<CurrencyTick />} />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar dataKey="total_profit" radius={[4, 4, 0, 0]}>
                  {data.profit_by_homeowner.map((entry, i) => (
                    <Cell key={i} fill={OWNER_COLORS[entry.name] || COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Customer Profit Distribution */}
        <ChartCard title="Customer Profit Distribution" subtitle="How is profit spread across the customer base?">
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

        {/* Profit by Dwelling Type */}
        <ChartCard title="Profit by Dwelling Type" subtitle="Which housing types generate the most revenue?">
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

        {/* Customer Lifestyle Interests */}
        {data.lifestyle_data?.length > 0 && (
          <ChartCard title="Customer Lifestyle Interests" subtitle="% of customers with each interest indicator">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.lifestyle_data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" unit="%" fontSize={12} tick={{ fill: "#64748b" }} />
                <YAxis dataKey="name" type="category" fontSize={12} tick={{ fill: "#64748b" }} width={80} />
                <Tooltip
                  formatter={(val) => [`${val}%`, "Penetration"]}
                  contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="pct" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Avg Profit by Education Level */}
        {data.profit_by_education?.length > 0 && (
          <ChartCard title="Avg Profit by Education Level" subtitle="Does education correlate with customer value?">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.profit_by_education} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: "#64748b" }} />
                <YAxis tick={<CurrencyTick />} />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar dataKey="avg_profit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </section>
  );
}
