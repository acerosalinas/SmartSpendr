import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// Personal Savings: an open-ended tracker (no target amount or deadline),
// distinct from Goals -- just a running all-time total per savings category.
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id AS category_id, c.name AS category_name, COALESCE(SUM(t.amount), 0) AS total
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
     WHERE c.user_id = ? AND c.type = 'savings'
     GROUP BY c.id, c.name
     ORDER BY c.name ASC`,
    [req.user.id]
  );

  const categories = rows.map((r) => ({
    category_id: r.category_id,
    category_name: r.category_name,
    total: Number(r.total),
  }));
  const totalSaved = categories.reduce((sum, c) => sum + c.total, 0);

  res.json({ total_saved: totalSaved, categories });
}));

export default router;
