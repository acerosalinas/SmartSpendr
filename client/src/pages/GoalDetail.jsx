import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import DonutProgress from "../components/DonutProgress.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import client from "../api/client.js";
import { formatCurrency, formatMonthLabel } from "../utils/format.js";

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get(`/goals/${id}`);
      setGoal(data.goal);
      setMonths(data.months);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Could not load this goal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function toggleMonth(month) {
    setError("");
    const previousGoal = goal;
    const previousMonths = months;

    const nextCompleted = !month.is_completed;
    setMonths((prev) => prev.map((m) => (m.id === month.id ? { ...m, is_completed: nextCompleted } : m)));

    try {
      const { data } = await client.patch(`/goals/${id}/months/${month.id}`, {
        is_completed: nextCompleted,
      });
      setGoal(data.goal);
      setMonths(data.months);
    } catch (err) {
      setGoal(previousGoal);
      setMonths(previousMonths);
      setError(err.response?.data?.error || "Could not update month");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${goal.goal_name}"? This cannot be undone.`)) return;
    await client.delete(`/goals/${id}`);
    navigate("/goals");
  }

  if (loading) {
    return (
      <Layout title="Goal Details">
        <p className="text-subtle">Loading...</p>
      </Layout>
    );
  }

  if (loadError || !goal) {
    return (
      <Layout title="Goal Details">
        <p className="text-sm text-red-500">{loadError || "Goal not found"}</p>
        <button onClick={() => navigate("/goals")} className="mt-4 text-sm link-accent">
          &larr; Back to My Goals
        </button>
      </Layout>
    );
  }

  return (
    <Layout title="Goal Details">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => navigate("/goals")} className="mb-4 text-sm link-accent">
          &larr; Back to My Goals
        </button>

        <h2 className="mb-4 text-center text-2xl font-bold text-heading">{goal.goal_name}</h2>

        <div className="card p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
            <DonutProgress percent={goal.progress_percent} size={160} />
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-subtle">Target Amount</span>
                <span className="font-semibold text-heading">{formatCurrency(goal.target_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Amount Saved</span>
                <span className="font-semibold text-heading">{formatCurrency(goal.amount_saved)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Remaining Balance</span>
                <span className="font-semibold text-heading">{formatCurrency(goal.remaining_balance)}</span>
              </div>
              {goal.bank && (
                <div className="flex justify-between">
                  <span className="text-subtle">Bank</span>
                  <span className="font-semibold text-heading">{goal.bank}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <ProgressBar percent={goal.progress_percent} />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="card mt-6 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-subtle">
            Monthly Breakdown
          </h3>
          <ul className="divide-y divider">
            {months.map((month) => (
              <li key={month.id} className="flex items-center justify-between py-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={month.is_completed}
                    onChange={() => toggleMonth(month)}
                    className="h-5 w-5 rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="text-sm font-medium text-heading">
                    Month {month.month_number} &middot; {formatMonthLabel(month.month_label)}
                  </span>
                </label>
                <span
                  className="text-sm font-semibold"
                  style={{ color: month.is_completed ? "var(--accent)" : "var(--text)" }}
                >
                  {formatCurrency(month.target_amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-right">
          <button onClick={handleDelete} className="text-sm text-red-500 hover:underline">
            Delete this goal
          </button>
        </div>
      </div>
    </Layout>
  );
}
