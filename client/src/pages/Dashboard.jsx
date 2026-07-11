import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout.jsx";
import client from "../api/client.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatCurrency, formatPercent } from "../utils/format.js";

const ROLLUP_ROWS = [
  { key: "income", label: "Income" },
  { key: "savings", label: "Savings" },
  { key: "debt", label: "Debt" },
  { key: "bills", label: "Bills" },
  { key: "expenses", label: "Expenses" },
];

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-5" style={accent ? { borderColor: "var(--accent)" } : undefined}>
      <p className="text-sm text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

function GoalChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-semibold text-heading">{item.goal_name}</p>
      <p className="text-subtle">{formatPercent(item.progress_percent)} complete</p>
    </div>
  );
}

function RollupChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-semibold text-heading">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-subtle">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border divider">
      {[
        { id: "table", label: "Table" },
        { id: "chart", label: "Chart" },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className="px-3 py-1.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: view === opt.id ? "var(--accent)" : "transparent",
            color: view === opt.id ? "var(--on-accent)" : "var(--text-muted)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StartingBalanceEditor({ rollup, month, onSaved }) {
  const [value, setValue] = useState(rollup.starting_balance.actual);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => setValue(rollup.starting_balance.actual), [rollup.starting_balance.actual]);

  async function save() {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return setValue(rollup.starting_balance.actual);
    setSaving(true);
    try {
      await client.put(`/months/${month}/starting-balance`, { amount });
      onSaved();
    } catch (err) {
      setValue(rollup.starting_balance.actual);
      toast.error(err.response?.data?.error || "Could not update starting balance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="number"
      step="0.01"
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      className="field-input w-36 text-right"
    />
  );
}

function MonthlyOverviewSection() {
  const { currentMonth } = useMonth();
  const { theme } = useTheme();
  const [rollup, setRollup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState("table");
  const toast = useToast();

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get(`/months/${currentMonth}/rollup`);
      setRollup(data.rollup);
    } catch (err) {
      const message = err.response?.data?.error || "Could not load the monthly overview";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  if (loading) return <p className="text-subtle">Loading...</p>;
  if (loadError) return <p className="text-sm text-red-500">{loadError}</p>;

  const chartData = [
    { name: "Starting Balance", expected: rollup.starting_balance.expected, actual: rollup.starting_balance.actual },
    ...ROLLUP_ROWS.map(({ key, label }) => ({
      name: label,
      expected: rollup[key].expected,
      actual: rollup[key].actual,
    })),
    { name: "Ending Balance", expected: rollup.left.expected, actual: rollup.left.actual },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Current Balance" value={formatCurrency(rollup.left.actual)} accent />
        <StatCard label="Starting Balance" value={formatCurrency(rollup.starting_balance.actual)} />
        <StatCard label="Budgeted Balance" value={formatCurrency(rollup.left.expected)} />
      </div>
      {rollup.is_first_month && (
        <p className="mt-2 text-xs text-subtle">
          Starting Balance is editable in the table below — this is your first tracked month.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "chart" ? (
        <div className="card mt-4 p-6">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ left: 8, right: 24 }}>
              <CartesianGrid vertical={false} stroke={theme.border} />
              <XAxis
                dataKey="name"
                tick={{ fill: theme.textMuted, fontSize: 12 }}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: theme.textMuted, fontSize: 12 }}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<RollupChartTooltip />} cursor={{ fill: theme.accentSoft }} />
              <Legend wrapperStyle={{ fontSize: 12, color: theme.textMuted }} />
              <Bar dataKey="expected" name="Expected" fill={theme.textMuted} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="actual" name="Actual" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b divider">
                <th className="px-4 py-3 font-semibold text-subtle"></th>
                <th className="px-4 py-3 text-right font-semibold text-subtle">Expected</th>
                <th className="px-4 py-3 text-right font-semibold text-subtle">Actual</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b divider">
                <td className="px-4 py-3 font-medium text-heading">Starting Balance</td>
                <td className="px-4 py-3 text-right text-heading">
                  {formatCurrency(rollup.starting_balance.expected)}
                </td>
                <td className="px-4 py-3 text-right">
                  {rollup.is_first_month ? (
                    <StartingBalanceEditor rollup={rollup} month={currentMonth} onSaved={load} />
                  ) : (
                    <span className="text-heading">{formatCurrency(rollup.starting_balance.actual)}</span>
                  )}
                </td>
              </tr>
              {ROLLUP_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b divider">
                  <td className="px-4 py-3 font-medium text-heading">{label}</td>
                  <td className="px-4 py-3 text-right text-heading">{formatCurrency(rollup[key].expected)}</td>
                  <td className="px-4 py-3 text-right text-heading">{formatCurrency(rollup[key].actual)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-4 py-3 text-heading">Ending Balance</td>
                <td className="px-4 py-3 text-right text-heading">{formatCurrency(rollup.left.expected)}</td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--accent)" }}>
                  {formatCurrency(rollup.left.actual)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}
    </>
  );
}

function GoalsProgressSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { theme } = useTheme();
  const toast = useToast();

  useEffect(() => {
    client
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => {
        const message = err.response?.data?.error || "Could not load goals progress";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-subtle">Loading...</p>;
  if (loadError) return <p className="text-sm text-red-500">{loadError}</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Saved" value={formatCurrency(data.total_saved)} />
        <StatCard label="Total Remaining" value={formatCurrency(data.total_remaining)} />
        <StatCard label="Active Goals" value={data.active_goals_count} />
        <StatCard label="Completed Goals" value={data.completed_goals_count} />
      </div>

      <div className="card mt-4 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-subtle">Progress by Goal</h3>

        {data.goals.length === 0 ? (
          <p className="text-subtle">
            No goals yet.{" "}
            <Link to="/goals" className="link-accent">
              Create one
            </Link>
            .
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(data.goals.length * 48, 120)}>
            <BarChart data={data.goals} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke={theme.border} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: theme.textMuted, fontSize: 12 }}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="goal_name"
                width={120}
                tick={{ fill: theme.text, fontSize: 12 }}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
              />
              <Tooltip content={<GoalChartTooltip />} cursor={{ fill: theme.accentSoft }} />
              <Bar dataKey="progress_percent" fill={theme.accent} radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.goals.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.goals.map((g) => (
            <Link
              key={g.id}
              to={`/goals/${g.id}`}
              className="card flex items-center justify-between px-4 py-3 text-sm transition-colors hover:border-[var(--accent)]"
            >
              <span className="font-medium text-heading">{g.goal_name}</span>
              <span className="text-subtle">{formatPercent(g.progress_percent)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  return (
    <Layout title="Dashboard" showMonthSwitcher>
      <section>
        <h2 className="mb-4 text-xl font-bold text-heading">Monthly Overview</h2>
        <MonthlyOverviewSection />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-heading">Goals Progress</h2>
        <GoalsProgressSection />
      </section>
    </Layout>
  );
}
