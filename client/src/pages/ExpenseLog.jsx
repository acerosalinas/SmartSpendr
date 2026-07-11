import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import client from "../api/client.js";
import { useMonth } from "../context/MonthContext.jsx";
import { useCategories } from "../hooks/useCategories.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatCurrency, formatDate } from "../utils/format.js";

const TYPE_LABELS = {
  expense: "Expense",
  income: "Income",
  savings: "Savings",
  debt: "Debt",
  bill: "Bill",
};

export default function ExpenseLog() {
  const { currentMonth } = useMonth();
  const { categories } = useCategories();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get("/transactions", { params: { month: currentMonth } });
      setTransactions(data.transactions);
    } catch (err) {
      const message = err.response?.data?.error || "Could not load the transaction log";
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

  async function handleCreate(payload) {
    await client.post("/transactions", payload);
    setShowForm(false);
    await load();
    toast.success("Transaction added");
  }

  async function handleUpdate(payload) {
    await client.put(`/transactions/${editing.id}`, payload);
    setEditing(null);
    await load();
    toast.success("Transaction updated");
  }

  async function handleDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await client.delete(`/transactions/${id}`);
      await load();
      toast.success("Transaction deleted");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete transaction");
    }
  }

  const subtotalsByType = useMemo(() => {
    const totals = {};
    for (const t of transactions) {
      totals[t.category_type] = (totals[t.category_type] || 0) + Number(t.amount);
    }
    return totals;
  }, [transactions]);

  return (
    <Layout title="Expense Log" showMonthSwitcher>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Every transaction, one row at a time</h2>
          <p className="text-sm text-subtle">
            Log expenses, income, savings, and debt/bill payments here — the source of truth behind
            every summary and rollup.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-accent">
          + New Transaction
        </button>
      </div>

      {loading ? (
        <p className="text-subtle">Loading...</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b divider">
                  <th className="px-4 py-3 font-semibold text-subtle">Date</th>
                  <th className="px-4 py-3 font-semibold text-subtle">Description</th>
                  <th className="px-4 py-3 font-semibold text-subtle">Category</th>
                  <th className="px-4 py-3 font-semibold text-subtle">Notes</th>
                  <th className="px-4 py-3 text-right font-semibold text-subtle">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-subtle">
                      No transactions logged for this month yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-b divider last:border-0">
                      <td className="px-4 py-3 text-heading">{formatDate(t.txn_date)}</td>
                      <td className="px-4 py-3 text-heading">{t.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                          >
                            {t.category_name}
                          </span>
                          <span className="text-xs text-subtle">{TYPE_LABELS[t.category_type]}</span>
                        </div>
                      </td>
                      <td className="max-w-[16rem] truncate px-4 py-3 text-subtle">{t.notes}</td>
                      <td className="px-4 py-3 text-right font-medium text-heading">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditing(t)} className="mr-3 text-sm link-accent">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="text-sm text-red-500">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  {Object.entries(subtotalsByType).map(([type, sum]) => (
                    <tr key={type} className="border-t divider">
                      <td colSpan={4} className="px-4 py-2 text-subtle">
                        Total {TYPE_LABELS[type]}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-heading">
                        {formatCurrency(sum)}
                      </td>
                      <td></td>
                    </tr>
                  ))}
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <TransactionForm categories={categories} onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <TransactionForm
          categories={categories}
          initial={editing}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </Layout>
  );
}
