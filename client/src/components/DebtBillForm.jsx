import { useState } from "react";
import { useToast } from "../context/ToastContext.jsx";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function DebtBillForm({ categories, month, onSubmit, onClose }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [dueDate, setDueDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!categoryId) return toast.error("Category is required");
    if (!dueDate) return toast.error("Due date is required");

    setSubmitting(true);
    try {
      await onSubmit({ category_id: categoryId, month, due_date: dueDate });
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
            <label className="field-label">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field-input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting || categories.length === 0} className="btn-accent">
              {submitting ? "Saving..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
