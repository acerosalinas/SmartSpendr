import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeMonth } from "../utils/month.js";

const router = Router();
router.use(requireAuth);

// Category Summary (step 2): expense categories only, for the selected month.
// Expected comes from category_budgets; Actual is always summed live from
// transactions -- never stored, so it can never drift from the Expense Log.
router.get("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });

  const [rows] = await pool.query(
    `SELECT c.id AS category_id, c.name AS category_name,
       COALESCE(cb.expected_amount, 0) AS expected,
       COALESCE(t.actual_amount, 0) AS actual
     FROM categories c
     LEFT JOIN category_budgets cb
       ON cb.category_id = c.id AND cb.user_id = c.user_id AND cb.month = ?
     LEFT JOIN (
       SELECT category_id, SUM(amount) AS actual_amount
       FROM transactions
       WHERE user_id = ? AND DATE_FORMAT(txn_date, '%Y-%m-01') = ?
       GROUP BY category_id
     ) t ON t.category_id = c.id
     WHERE c.user_id = ? AND c.type = 'expense'
     ORDER BY c.name ASC`,
    [month, req.user.id, month, req.user.id]
  );

  const summary = rows.map((row) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    expected: Number(row.expected),
    actual: Number(row.actual),
    balance: Number(row.expected) - Number(row.actual),
  }));

  res.json({ month, summary });
}));

export default router;
