import { useState } from "react";
import client from "../api/client.js";
import { useCategories } from "../hooks/useCategories.js";

const TYPE_LABELS = {
  expense: "Expense",
  income: "Income",
  savings: "Savings",
  debt: "Debt",
  bill: "Bill",
};
const TYPES = Object.keys(TYPE_LABELS);

export default function CategoriesManager() {
  const { categories, loading, refresh } = useCategories();
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("expense");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Category name is required");
    setSubmitting(true);
    try {
      await client.post("/categories", { name: name.trim(), type });
      setName("");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add category");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
    setError("");
  }

  async function handleSaveEdit(id) {
    if (!editName.trim()) return setError("Category name is required");
    setError("");
    try {
      await client.put(`/categories/${id}`, { name: editName.trim(), type: editType });
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update category");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this category?")) return;
    setError("");
    try {
      await client.delete(`/categories/${id}`);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete category");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-subtle">Categories</h2>
      <p className="mb-5 text-sm text-subtle">
        Manage the shared category list used across the Expense Log, Category Summary, Income,
        Savings, and Debt & Bills sections.
      </p>

      <form onSubmit={handleAdd} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="field-input sm:flex-1"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="field-input sm:w-40">
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={submitting} className="btn-accent whitespace-nowrap">
          + Add
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-subtle">Loading categories...</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-subtle">No categories yet. Add your first one above.</p>
      ) : (
        <ul className="divide-y divider">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 py-2.5">
              {editingId === category.id ? (
                <>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="field-input sm:flex-1"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="field-input sm:w-36"
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => handleSaveEdit(category.id)} className="text-sm link-accent">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-subtle">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-heading">{category.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {TYPE_LABELS[category.type]}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button onClick={() => startEdit(category)} className="text-sm link-accent">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="text-sm text-red-500">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
