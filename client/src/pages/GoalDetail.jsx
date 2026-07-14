import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import DonutProgress from "../components/DonutProgress.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import GoalForm from "../components/GoalForm.jsx";
import client from "../api/client.js";
import { formatCurrency, formatMonthLabel } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";

function AmountSavedEditor({ goal, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal.amount_saved);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const hasOverride = goal.actual_saved_override !== null && goal.actual_saved_override !== undefined;

  function startEdit() {
    setValue(goal.amount_saved);
    setEditing(true);
  }

  async function save() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Amount saved must be zero or a positive number");
      return;
    }
    setSaving(true);
    try {
      await onSaved(amount);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update amount saved");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      await onSaved(null);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not reset amount saved");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          className="field-input w-28 text-right"
        />
        <button onClick={save} disabled={saving} className="text-xs link-accent">
          Save
        </button>
        <button onClick={() => setEditing(false)} disabled={saving} className="text-xs text-subtle">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-heading">{formatCurrency(goal.amount_saved)}</span>
      <button onClick={startEdit} className="text-xs link-accent">
        Edit
      </button>
      {hasOverride && (
        <button onClick={reset} disabled={saving} className="text-xs text-subtle hover:underline">
          Reset
        </button>
      )}
    </div>
  );
}

function ActualAmountEditor({ month, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(month.actual_amount ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const hasActual = month.actual_amount !== null && month.actual_amount !== undefined;

  function startEdit() {
    setValue(month.actual_amount ?? "");
    setEditing(true);
  }

  async function save() {
    const trimmed = String(value).trim();
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      toast.error("Actual amount must be zero or a positive number");
      return;
    }
    setSaving(true);
    try {
      await onSaved(amount);
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update actual amount");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          disabled={saving}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          className="field-input w-24 text-right"
        />
        <button onClick={save} disabled={saving} className="text-xs link-accent">
          Save
        </button>
        <button onClick={() => setEditing(false)} disabled={saving} className="text-xs text-subtle">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="font-semibold hover:underline"
      style={{ color: hasActual ? "var(--accent)" : "var(--text-muted)" }}
    >
      {hasActual ? formatCurrency(month.actual_amount) : "Set amount"}
    </button>
  );
}

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showEditForm, setShowEditForm] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get(`/goals/${id}`);
      setGoal(data.goal);
      setMonths(data.months);
    } catch (err) {
      const message = err.response?.data?.error || "Could not load this goal";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleMonth(month) {
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
      toast.error(err.response?.data?.error || "Could not update month");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${goal.goal_name}"? This cannot be undone.`)) return;
    try {
      await client.delete(`/goals/${id}`);
      toast.success("Goal deleted");
      navigate("/goals");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete goal");
    }
  }

  async function handleEditSubmit(payload) {
    const { data } = await client.put(`/goals/${id}`, payload);
    setGoal(data.goal);
    setMonths(data.months);
    setShowEditForm(false);
    toast.success("Goal updated");
  }

  async function handleActualSaved(amount) {
    const { data } = await client.patch(`/goals/${id}/actual`, { actual_saved: amount });
    setGoal(data.goal);
    setMonths(data.months);
    toast.success(amount === null ? "Reset to checklist total" : "Amount saved updated");
  }

  async function handleMonthActual(month, amount) {
    const { data } = await client.patch(`/goals/${id}/months/${month.id}/actual`, { actual_amount: amount });
    setGoal(data.goal);
    setMonths(data.months);
    toast.success(amount === null ? "Actual amount cleared" : "Actual amount updated");
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

        <div className="mb-4 flex items-center justify-center gap-2">
          <h2 className="text-center text-2xl font-bold text-heading">{goal.goal_name}</h2>
          <button onClick={() => setShowEditForm(true)} className="text-sm link-accent">
            Edit
          </button>
        </div>

        <div className="card p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
            <DonutProgress percent={goal.progress_percent} size={160} />
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-subtle">Target Amount</span>
                <span className="font-semibold text-heading">{formatCurrency(goal.target_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-subtle">Amount Saved</span>
                <AmountSavedEditor goal={goal} onSaved={handleActualSaved} />
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

        <div className="card mt-6 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-subtle">
            Monthly Breakdown
          </h3>
          <ul className="divide-y divider">
            {months.map((month) => {
              const prevMonth = months.find((m) => m.month_number === month.month_number - 1);
              const carriedOver = Number(prevMonth?.rollover_to_next) || 0;
              return (
                <li key={month.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
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
                  <div className="flex items-center gap-5 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-subtle">Expected</p>
                      <p
                        className="font-semibold"
                        style={{ color: month.is_completed ? "var(--accent)" : "var(--text)" }}
                      >
                        {formatCurrency(month.target_amount)}
                      </p>
                      {carriedOver > 0 && (
                        <p className="text-xs text-subtle">+{formatCurrency(carriedOver)} carried over</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-subtle">Actual</p>
                      <ActualAmountEditor month={month} onSaved={(amount) => handleMonthActual(month, amount)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 text-right">
          <button onClick={handleDelete} className="text-sm text-red-500 hover:underline">
            Delete this goal
          </button>
        </div>
      </div>

      {showEditForm && (
        <GoalForm initial={goal} onSubmit={handleEditSubmit} onClose={() => setShowEditForm(false)} />
      )}
    </Layout>
  );
}
