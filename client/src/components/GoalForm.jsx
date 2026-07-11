import { useState } from "react";
import { useToast } from "../context/ToastContext.jsx";

const todayFirstOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

export default function GoalForm({ onSubmit, onClose }) {
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [periodMonths, setPeriodMonths] = useState("");
  const [bank, setBank] = useState("");
  const [startingMonth, setStartingMonth] = useState(todayFirstOfMonth());
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();

    const amount = Number(targetAmount);
    const months = Number(periodMonths);
    if (!goalName.trim()) return toast.error("Goal name is required");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Target amount must be a positive number");
    if (!Number.isInteger(months) || months <= 0)
      return toast.error("Period must be a positive whole number of months");

    setSubmitting(true);
    try {
      await onSubmit({
        goal_name: goalName.trim(),
        target_amount: amount,
        period_months: months,
        bank: bank.trim(),
        starting_month: startingMonth,
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create goal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">New Goal</h2>
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
          <div>
            <label className="field-label">Starting Month</label>
            <input
              type="date"
              value={startingMonth}
              onChange={(e) => setStartingMonth(e.target.value)}
              className="field-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-accent">
              {submitting ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
