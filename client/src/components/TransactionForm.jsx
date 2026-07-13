import { useMemo, useState } from "react";
import { useToast } from "../context/ToastContext.jsx";

const todayISO = () => new Date().toISOString().slice(0, 10);
const TYPE_ORDER = ["expense", "income", "savings", "debt", "bill"];
const TYPE_LABELS = {
  expense: "Expense",
  income: "Income",
  savings: "Savings",
  debt: "Debt",
  bill: "Bill",
};

function findInitialType(categories, initial, defaultType) {
  if (initial) {
    const match = categories.find((c) => c.id === initial.category_id);
    if (match) return match.type;
  }
  if (defaultType && categories.some((c) => c.type === defaultType)) return defaultType;
  return categories[0]?.type || "expense";
}

export default function TransactionForm({ categories, initial, defaultType, onSubmit, onClose }) {
  const [txnDate, setTxnDate] = useState(initial?.txn_date?.slice(0, 10) || todayISO());
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [description, setDescription] = useState(initial?.description || "");
  const [categoryType, setCategoryType] = useState(() => findInitialType(categories, initial, defaultType));
  const [categoryId, setCategoryId] = useState(() => {
    if (initial?.category_id) return initial.category_id;
    const initialType = findInitialType(categories, initial, defaultType);
    return categories.find((c) => c.type === initialType)?.id || "";
  });
  const [account, setAccount] = useState(initial?.account || "bank");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const categoriesForType = useMemo(
    () => categories.filter((c) => c.type === categoryType),
    [categories, categoryType]
  );

  function handleTypeChange(nextType) {
    setCategoryType(nextType);
    const nextOptions = categories.filter((c) => c.type === nextType);
    setCategoryId(nextOptions[0]?.id || "");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const amountNum = Number(amount);
    if (!txnDate) return toast.error("Date is required");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return toast.error("Amount must be a positive number");
    if (!description.trim()) return toast.error("Description is required");
    if (!categoryId) return toast.error("Category is required");

    setSubmitting(true);
    try {
      await onSubmit({
        txn_date: txnDate,
        amount: amountNum,
        description: description.trim(),
        category_id: categoryId,
        account,
        notes: notes.trim(),
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">{initial ? "Edit Transaction" : "New Transaction"}</h2>
          <button onClick={onClose} className="text-subtle hover:text-heading">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Date</label>
            <input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Amount (PHP)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field-input"
              placeholder="500"
            />
          </div>
          <div>
            <label className="field-label">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field-input"
              placeholder="e.g. Weekly groceries"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Type</label>
              <select
                value={categoryType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="field-input"
              >
                {TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field-input">
                {categoriesForType.length === 0 && <option value="">No categories yet</option>}
                {categoriesForType.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Account</label>
            <div className="flex gap-2">
              {[
                { value: "cash", label: "Cash on Hand" },
                { value: "bank", label: "Cash in Bank" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccount(opt.value)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors divider"
                  style={
                    account === opt.value
                      ? { backgroundColor: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting || categoriesForType.length === 0} className="btn-accent">
              {submitting ? "Saving..." : initial ? "Save Changes" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
