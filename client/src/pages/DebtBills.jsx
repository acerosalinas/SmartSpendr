import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import DebtBillForm from "../components/DebtBillForm.jsx";
import client from "../api/client.js";
import { useMonth } from "../context/MonthContext.jsx";
import { useCategories } from "../hooks/useCategories.js";
import { formatCurrency, formatDate } from "../utils/format.js";

const FILTERS = [
  { value: "", label: "All" },
  { value: "debt", label: "Debt" },
  { value: "bill", label: "Bills" },
];

export default function DebtBills() {
  const { currentMonth } = useMonth();
  const { categories: allCategories } = useCategories();
  const debtBillCategories = useMemo(
    () => allCategories.filter((c) => c.type === "debt" || c.type === "bill"),
    [allCategories]
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get("/debt-bills", {
        params: { month: currentMonth, ...(kind ? { kind } : {}) },
      });
      setItems(data.items);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Could not load debt & bills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, kind]);

  async function handleCreate(payload) {
    await client.post("/debt-bills", payload);
    setShowForm(false);
    await load();
  }

  async function toggleCompleted(item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_completed: !i.is_completed } : i))
    );
    try {
      await client.patch(`/debt-bills/${item.id}`, { is_completed: !item.is_completed });
    } catch {
      await load();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    await client.delete(`/debt-bills/${id}`);
    await load();
  }

  return (
    <Layout title="Debt & Bills" showMonthSwitcher>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-heading">Recurring obligations</h2>
          <p className="text-sm text-subtle">Sorted by nearest due date, so nothing sneaks up on you.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-accent">
          + New Item
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setKind(f.value)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={
              kind === f.value
                ? { backgroundColor: "var(--accent-soft)", color: "var(--accent)" }
                : { color: "var(--text-muted)" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-subtle">Loading...</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : items.length === 0 ? (
        <div className="card border-dashed p-12 text-center text-subtle">
          No debt or bill items for this month yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b divider">
                  <th className="px-4 py-3 font-semibold text-subtle">Done</th>
                  <th className="px-4 py-3 font-semibold text-subtle">Category</th>
                  <th className="px-4 py-3 font-semibold text-subtle">Due Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-subtle">Expected</th>
                  <th className="px-4 py-3 text-right font-semibold text-subtle">Actual</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b divider last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!item.is_completed}
                        onChange={() => toggleCompleted(item)}
                        className="h-5 w-5 rounded"
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={item.is_completed ? "text-subtle line-through" : "text-heading"}
                        >
                          {item.category_name}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          {item.category_type === "debt" ? "Debt" : "Bill"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-heading">{formatDate(item.due_date)}</td>
                    <td className="px-4 py-3 text-right text-heading">{formatCurrency(item.expected)}</td>
                    <td className="px-4 py-3 text-right text-heading">{formatCurrency(item.actual)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(item.id)} className="text-sm text-red-500">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <DebtBillForm
          categories={debtBillCategories}
          month={currentMonth}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </Layout>
  );
}
