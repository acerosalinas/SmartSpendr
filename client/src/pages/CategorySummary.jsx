import { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import client from "../api/client.js";
import { useMonth } from "../context/MonthContext.jsx";
import { formatCurrency } from "../utils/format.js";

function ExpectedInput({ row, month, onSaved }) {
  const [value, setValue] = useState(row.expected);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(row.expected), [row.expected]);

  async function save() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount === row.expected) {
      setValue(row.expected);
      return;
    }
    setSaving(true);
    try {
      await client.put("/budgets", { category_id: row.category_id, month, expected_amount: amount });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      className="field-input w-32 text-right"
    />
  );
}

export default function CategorySummary() {
  const { currentMonth } = useMonth();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get("/category-summary", { params: { month: currentMonth } });
      setSummary(data.summary);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Could not load category summary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const totals = summary.reduce(
    (acc, row) => ({
      expected: acc.expected + row.expected,
      actual: acc.actual + row.actual,
      balance: acc.balance + row.balance,
    }),
    { expected: 0, actual: 0, balance: 0 }
  );

  return (
    <Layout title="Category Summary" showMonthSwitcher>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-heading">Expected vs. Actual, by category</h2>
        <p className="text-sm text-subtle">
          Actual is calculated live from the Expense Log — edit Expected to update your budget.
        </p>
      </div>

      {loading ? (
        <p className="text-subtle">Loading...</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : summary.length === 0 ? (
        <div className="card border-dashed p-12 text-center text-subtle">
          No expense categories yet. Add some in Settings.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b divider">
                  <th className="px-4 py-3 font-semibold text-subtle">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-subtle">Expected</th>
                  <th className="px-4 py-3 text-right font-semibold text-subtle">Actual</th>
                  <th className="px-4 py-3 text-right font-semibold text-subtle">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.category_id} className="border-b divider last:border-0">
                    <td className="px-4 py-3 font-medium text-heading">{row.category_name}</td>
                    <td className="px-4 py-3 text-right">
                      <ExpectedInput row={row} month={currentMonth} onSaved={load} />
                    </td>
                    <td className="px-4 py-3 text-right text-heading">{formatCurrency(row.actual)}</td>
                    <td
                      className="px-4 py-3 text-right font-medium"
                      style={{ color: row.balance < 0 ? "#ef4444" : "var(--text)" }}
                    >
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t divider font-semibold">
                  <td className="px-4 py-3 text-heading">Total</td>
                  <td className="px-4 py-3 text-right text-heading">{formatCurrency(totals.expected)}</td>
                  <td className="px-4 py-3 text-right text-heading">{formatCurrency(totals.actual)}</td>
                  <td
                    className="px-4 py-3 text-right"
                    style={{ color: totals.balance < 0 ? "#ef4444" : "var(--text)" }}
                  >
                    {formatCurrency(totals.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
