import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import client from "../api/client.js";
import { useCategories } from "../hooks/useCategories.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatCurrency } from "../utils/format.js";

function StatCard({ label, value }) {
  return (
    <div className="card p-5" style={{ borderColor: "var(--accent)" }}>
      <p className="text-sm text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--accent)" }}>
        {value}
      </p>
    </div>
  );
}

export default function PersonalSavings() {
  const { categories: allCategories } = useCategories();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  const hasSavingsCategories = allCategories.some((c) => c.type === "savings");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get("/savings");
      setData(data);
    } catch (err) {
      const message = err.response?.data?.error || "Could not load personal savings";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(payload) {
    await client.post("/transactions", payload);
    setShowForm(false);
    await load();
    toast.success("Savings logged");
  }

  return (
    <Layout title="Personal Savings">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-heading">Money set aside, no deadline attached</h2>
          <p className="text-sm text-subtle">
            An open-ended running total, separate from your goal-tracking in My Goals.
          </p>
        </div>
        {hasSavingsCategories && (
          <button onClick={() => setShowForm(true)} className="btn-accent">
            + Add Savings
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-subtle">Loading...</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : !hasSavingsCategories ? (
        <div className="card border-dashed p-12 text-center text-subtle">
          You don't have any Savings categories yet.{" "}
          <Link to="/settings" className="link-accent">
            Create one in Settings
          </Link>{" "}
          to start tracking.
        </div>
      ) : (
        <>
          <StatCard label="Total Saved" value={formatCurrency(data.total_saved)} />

          <div className="card mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b divider">
                    <th className="px-4 py-3 font-semibold text-subtle">Category</th>
                    <th className="px-4 py-3 text-right font-semibold text-subtle">Total Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-10 text-center text-subtle">
                        No savings categories yet.
                      </td>
                    </tr>
                  ) : (
                    data.categories.map((c) => (
                      <tr key={c.category_id} className="border-b divider last:border-0">
                        <td className="px-4 py-3 text-heading">{c.category_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-heading">
                          {formatCurrency(c.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <TransactionForm
          categories={allCategories}
          defaultType="savings"
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </Layout>
  );
}
