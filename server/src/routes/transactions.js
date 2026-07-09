import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeMonth } from "../utils/month.js";
import { ensureMonthExists } from "../utils/ensureMonth.js";

const router = Router();
router.use(requireAuth);

async function fetchCategoryOwnedByUser(categoryId, userId) {
  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ? AND user_id = ?", [
    categoryId,
    userId,
  ]);
  return rows[0] || null;
}

function validateTransactionInput(body) {
  const { txn_date, amount, description, category_id } = body;
  if (!txn_date || !normalizeMonth(txn_date)) return "A valid date is required";
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return "Amount must be a positive number";
  if (!description?.trim()) return "Description is required";
  if (!category_id) return "Category is required";
  return null;
}

router.get("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });

  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name, c.type AS category_type
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND DATE_FORMAT(t.txn_date, '%Y-%m-01') = ?
     ORDER BY t.txn_date DESC, t.created_at DESC`,
    [req.user.id, month]
  );
  res.json({ transactions: rows });
}));

router.post("/", asyncHandler(async (req, res) => {
  const validationError = validateTransactionInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { txn_date, amount, description, category_id, notes } = req.body;
  const category = await fetchCategoryOwnedByUser(category_id, req.user.id);
  if (!category) return res.status(400).json({ error: "Invalid category" });

  const id = crypto.randomUUID();
  const month = normalizeMonth(txn_date);
  await pool.query(
    `INSERT INTO transactions (id, user_id, category_id, txn_date, amount, description, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.id, category_id, txn_date, Number(amount), description.trim(), notes?.trim() || null]
  );
  await ensureMonthExists(req.user.id, month);

  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name, c.type AS category_type
     FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?`,
    [id]
  );
  res.status(201).json({ transaction: rows[0] });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const validationError = validateTransactionInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const [existing] = await pool.query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (!existing[0]) return res.status(404).json({ error: "Transaction not found" });

  const { txn_date, amount, description, category_id, notes } = req.body;
  const category = await fetchCategoryOwnedByUser(category_id, req.user.id);
  if (!category) return res.status(400).json({ error: "Invalid category" });

  await pool.query(
    `UPDATE transactions SET txn_date = ?, amount = ?, description = ?, category_id = ?, notes = ?
     WHERE id = ?`,
    [txn_date, Number(amount), description.trim(), category_id, notes?.trim() || null, req.params.id]
  );
  await ensureMonthExists(req.user.id, normalizeMonth(txn_date));

  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name, c.type AS category_type
     FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?`,
    [req.params.id]
  );
  res.json({ transaction: rows[0] });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const [existing] = await pool.query("SELECT id FROM transactions WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (!existing[0]) return res.status(404).json({ error: "Transaction not found" });

  await pool.query("DELETE FROM transactions WHERE id = ?", [req.params.id]);
  res.json({ message: "Transaction deleted" });
}));

export default router;
