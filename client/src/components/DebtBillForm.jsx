import { useState } from "react";
import { useToast } from "../context/ToastContext.jsx";

const todayISO = () => new Date().toISOString().slice(0, 10);
const todayFirstOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

export default function DebtBillForm({ categories, month, onSubmitSingle, onSubmitPlan, onClose }) {
  const [mode, setMode] = useState("single");

  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [dueDate, setDueDate] = useState(todayISO());
  const [bank, setBank] = useState("");

  const [totalAmount, setTotalAmount] = useState("");
  const [periodMonths, setPeriodMonths] = useState("");
  const [startingMonth, setStartingMonth] = useState(todayFirstOfMonth());
  const [dueDay, setDueDay] = useState("15");

  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!categoryId) return toast.error("Category is required");

    setSubmitting(true);
    try {
      if (mode === "single") {
        if (!dueDate) return toast.error("Due date is required");
        await onSubmitSingle({ category_id: categoryId, month, due_date: dueDate, bank: bank.trim() });
      } else {
        const total = Number(totalAmount);
        const period = Number(periodMonths);
        const day = Number(dueDay);
        if (!Number.isFinite(total) || total <= 0) return toast.error("Total amount must be a positive number");
        if (!Number.isInteger(period) || period <= 0)
          return toast.error("Period must be a positive whole number of months");
        if (!Number.isInteger(day) || day < 1 || day > 31) return toast.error("Due day must be between 1 and 31");

        await onSubmitPlan({
          category_id: categoryId,
          bank: bank.trim(),
          total_amount: total,
          period_months: period,
          starting_month: startingMonth,
          due_day: day,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">New Debt / Bill</h2>
          <button onClick={onClose} className="text-subtle hover:text-heading">
            &times;
          </button>
        </div>

        <div className="mb-4 inline-flex overflow-hidden rounded-lg border divider">
          {[
            { id: "single", label: "Single item" },
            { id: "plan", label: "Installment plan" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === opt.id ? "var(--accent)" : "transparent",
                color: mode === opt.id ? "var(--on-accent)" : "var(--text-muted)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field-input">
              {categories.length === 0 && <option value="">No debt/bill categories yet</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "debt" ? "Debt" : "Bill"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Bank / Lender (optional)</label>
            <input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="field-input"
              placeholder="e.g. BPI, GCash, BDO"
            />
          </div>

          {mode === "single" ? (
            <div>
              <label className="field-label">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field-input" />
            </div>
          ) : (
            <>
              <div>
                <label className="field-label">Total Amount (PHP)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="field-input"
                  placeholder="12000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="field-label">Due Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="field-input"
                  />
                </div>
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
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting || categories.length === 0} className="btn-accent">
              {submitting ? "Saving..." : mode === "single" ? "Add Item" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
