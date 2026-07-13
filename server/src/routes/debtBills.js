import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeMonth } from "../utils/month.js";
import { ensureMonthExists } from "../utils/ensureMonth.js";

const router = Router();
router.use(requireAuth);

async function fetchItemWithRollup(itemId, userId) {
  const [rows] = await pool.query(
    `SELECT d.id, d.month, d.due_date, d.is_completed, d.completed_at, d.plan_id, d.bank,
       c.id AS category_id, c.name AS category_name, c.type AS category_type,
       COALESCE(d.installment_amount, cb.expected_amount, 0) AS expected,
       COALESCE((
         SELECT SUM(t.amount) FROM transactions t
         WHERE t.user_id = d.user_id AND t.category_id = d.category_id
           AND date_trunc('month', t.txn_date)::date = d.month
       ), 0) AS actual
     FROM debt_bill_items d
     JOIN categories c ON c.id = d.category_id
     LEFT JOIN category_budgets cb
       ON cb.category_id = d.category_id AND cb.user_id = d.user_id AND cb.month = d.month
     WHERE d.id = ? AND d.user_id = ?`,
    [itemId, userId]
  );
  return rows[0] || null;
}

router.get("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });
  const { kind } = req.query;

  const params = [req.user.id, month];
  let sql = `
    SELECT d.id, d.month, d.due_date, d.is_completed, d.completed_at, d.plan_id, d.bank,
       c.id AS category_id, c.name AS category_name, c.type AS category_type,
       COALESCE(d.installment_amount, cb.expected_amount, 0) AS expected,
       COALESCE((
         SELECT SUM(t.amount) FROM transactions t
         WHERE t.user_id = d.user_id AND t.category_id = d.category_id
           AND date_trunc('month', t.txn_date)::date = d.month
       ), 0) AS actual
    FROM debt_bill_items d
    JOIN categories c ON c.id = d.category_id
    LEFT JOIN category_budgets cb
      ON cb.category_id = d.category_id AND cb.user_id = d.user_id AND cb.month = d.month
    WHERE d.user_id = ? AND d.month = ?`;
  if (kind) {
    if (!["debt", "bill"].includes(kind)) return res.status(400).json({ error: "Invalid kind" });
    sql += " AND c.type = ?";
    params.push(kind);
  } else {
    sql += " AND c.type IN ('debt', 'bill')";
  }
  sql += " ORDER BY d.due_date ASC";

  const [rows] = await pool.query(sql, params);
  const items = rows.map((row) => ({
    ...row,
    expected: Number(row.expected),
    actual: Number(row.actual),
  }));
  res.json({ items });
}));

router.post("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.body.month);
  const { category_id, due_date, bank } = req.body;
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });
  if (!category_id) return res.status(400).json({ error: "Category is required" });
  if (!due_date || !normalizeMonth(due_date)) return res.status(400).json({ error: "A valid due date is required" });

  const [categoryRows] = await pool.query(
    "SELECT id, type FROM categories WHERE id = ? AND user_id = ?",
    [category_id, req.user.id]
  );
  const category = categoryRows[0];
  if (!category || !["debt", "bill"].includes(category.type)) {
    return res.status(400).json({ error: "Category must be a Debt or Bill category" });
  }

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO debt_bill_items (id, user_id, category_id, month, due_date, bank) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, req.user.id, category_id, month, due_date, bank?.trim() || null]
  );
  await ensureMonthExists(req.user.id, month);

  const item = await fetchItemWithRollup(id, req.user.id);
  res.status(201).json({ item });
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM debt_bill_items WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (!existing[0]) return res.status(404).json({ error: "Item not found" });

  const updates = [];
  const params = [];

  if (typeof req.body.is_completed === "boolean") {
    updates.push("is_completed = ?", "completed_at = ?");
    params.push(req.body.is_completed, req.body.is_completed ? new Date() : null);
  }
  if (req.body.due_date) {
    if (!normalizeMonth(req.body.due_date)) return res.status(400).json({ error: "Invalid due date" });
    updates.push("due_date = ?");
    params.push(req.body.due_date);
  }

  if (updates.length === 0) return res.status(400).json({ error: "Nothing to update" });

  params.push(req.params.id);
  await pool.query(`UPDATE debt_bill_items SET ${updates.join(", ")} WHERE id = ?`, params);

  const item = await fetchItemWithRollup(req.params.id, req.user.id);
  res.json({ item });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const [existing] = await pool.query("SELECT id FROM debt_bill_items WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (!existing[0]) return res.status(404).json({ error: "Item not found" });

  await pool.query("DELETE FROM debt_bill_items WHERE id = ?", [req.params.id]);
  res.json({ message: "Item deleted" });
}));

export default router;
