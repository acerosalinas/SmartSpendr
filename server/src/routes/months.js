import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeMonth } from "../utils/month.js";
import { computeMonthRollup } from "../utils/rollup.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT month, starting_balance_override FROM months WHERE user_id = ? ORDER BY month ASC",
    [req.user.id]
  );
  res.json({
    months: rows.map((r) => ({
      month: r.month,
      has_override: r.starting_balance_override !== null,
    })),
  });
}));

router.post("/", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.body.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });

  await pool.query(
    "INSERT INTO months (id, user_id, month) VALUES (?, ?, ?) ON CONFLICT (user_id, month) DO NOTHING",
    [crypto.randomUUID(), req.user.id, month]
  );
  res.status(201).json({ month });
}));

router.put("/:month/starting-balance", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.params.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });

  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount)) return res.status(400).json({ error: "Amount must be a number" });

  await pool.query(
    `INSERT INTO months (id, user_id, month, starting_balance_override) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, month) DO UPDATE SET starting_balance_override = EXCLUDED.starting_balance_override`,
    [crypto.randomUUID(), req.user.id, month, amount]
  );

  const rollup = await computeMonthRollup(req.user.id, month);
  res.json({ rollup });
}));

router.get("/:month/rollup", asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.params.month);
  if (!month) return res.status(400).json({ error: "A valid month (YYYY-MM) is required" });

  const rollup = await computeMonthRollup(req.user.id, month);
  res.json({ rollup });
}));

export default router;
