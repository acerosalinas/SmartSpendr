import { useState } from "react";
import { useToast } from "../context/ToastContext.jsx";

const todayFirstOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

export default function GoalForm({ initial, onSubmit, onClose }) {
  const isEdit = !!initial;
  const [goalName, setGoalName] = useState(initial?.goal_name || "");
  const [targetAmount, setTargetAmount] = useState(initial?.target_amount ?? "");
  const [periodMonths, setPeriodMonths] = useState(initial?.period_months ?? "");
  const [bank, setBank] = useState(initial?.bank || "");
  const [startingMonth, setStartingMonth] = useState(initial?.starting_month?.slice(0, 10) || todayFirstOfMonth());
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!goalName.trim()) return toast.error("Goal name is required");

    setSubmitting(true);
    try {
      if (isEdit) {
        await onSubmit({ goal_name: goalName.trim(), bank: bank.trim() });
      } else {
        const amount = Number(targetAmount);
        const months = Number(periodMonths);
        if (!Number.isFinite(amount) || amount <= 0) {
          setSubmitting(false);
          return toast.error("Target amount must be a positive number");
        }
        if (!Number.isInteger(months) || months <= 0) {
          setSubmitting(false);
          return toast.error("Period must be a positive whole number of months");
        }
        await onSubmit({
          goal_name: goalName.trim(),
          target_amount: amount,
          period_months: months,
          bank: bank.trim(),
          starting_month: startingMonth,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `Could not ${isEdit ? "update" : "create"} goal`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">{isEdit ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} className="text-subtle hover:text-heading">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Goal Name</label>
            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="field-input"
              placeholder="e.g. Emergency Fund"
            />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="field-label">Target Amount (PHP)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="field-input"
                  placeholder="60000"
                />
              </div>
              <div>
                <label className="field-label">Period (months)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={periodMonths}
                  onChange={(e) => setPeriodMonths(e.target.value)}
                  className="field-input"
                  placeholder="6"
                />
              </div>
            </>
          )}

          <div>
            <label className="field-label">Bank</label>
            <input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="field-input"
              placeholder="BPI Savings"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="field-label">Starting Month</label>
              <input
                type="date"
                value={startingMonth}
                onChange={(e) => setStartingMonth(e.target.value)}
                className="field-input"
              />
            </div>
          )}

          {isEdit && (
            <p className="text-xs text-subtle">
              Target amount, period, and starting month can't be changed after creation. Delete and recreate the
              goal if you need to adjust the schedule.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-accent">
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
