import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeMonth } from "../utils/month.js";
import { ensureMonthExists } from "../utils/ensureMonth.js";
import { CATEGORY_TYPES } from "./categories.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });
  const { type } = req.query;

  const params = [month, req.user.id];
  let sql = `
    SELECT c.id AS category_id, c.name AS category_name, c.type AS category_type,
           COALESCE(cb.expected_amount, 0) AS expected_amount
    FROM categories c
    LEFT JOIN category_budgets cb ON cb.category_id = c.id AND cb.month = ? AND cb.user_id = c.user_id
    WHERE c.user_id = ?`;
  if (type) {
    if (!CATEGORY_TYPES.includes(type)) return res.status(400).json({ error: "Invalid category type" });
    sql += " AND c.type = ?";
    params.push(type);
  }
  sql += " ORDER BY c.name ASC";

  const [rows] = await pool.query(sql, params);
  res.json({ budgets: rows });
}));

router.put("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.body.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });

  const { category_id, expected_amount } = req.body;
  const amountNum = Number(expected_amount);
  if (!category_id) return res.status(400).json({ error: "Category is required" });
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: "Expected amount must be zero or a positive number" });
  }

  const [categoryRows] = await pool.query("SELECT id FROM categories WHERE id = ? AND user_id = ?", [
    category_id,
    req.user.id,
  ]);
  if (!categoryRows[0]) return res.status(400).json({ error: "Invalid category" });

  await pool.query(
    `INSERT INTO category_budgets (id, user_id, category_id, month, expected_amount)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE expected_amount = VALUES(expected_amount)`,
    [crypto.randomUUID(), req.user.id, category_id, month, amountNum]
  );
  await ensureMonthExists(req.user.id, month);

  res.json({ category_id, month, expected_amount: amountNum });
}));

export default router;
