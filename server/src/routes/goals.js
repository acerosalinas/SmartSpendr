import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { buildGoalMonths } from "../utils/goalMonths.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

function withProgress(goal) {
  const amountSaved = Number(goal.amount_saved) || 0;
  const targetAmount = Number(goal.target_amount);
  return {
    ...goal,
    amount_saved: amountSaved,
    remaining_balance: Math.max(targetAmount - amountSaved, 0),
    progress_percent: targetAmount > 0 ? Math.min((amountSaved / targetAmount) * 100, 100) : 0,
  };
}

async function fetchGoalOwnedByUser(goalId, userId) {
  const [rows] = await pool.query("SELECT * FROM goals WHERE id = ? AND user_id = ?", [goalId, userId]);
  return rows[0] || null;
}

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.*,
       COALESCE(SUM(CASE WHEN gm.is_completed THEN gm.target_amount ELSE 0 END), 0) AS amount_saved
     FROM goals g
     LEFT JOIN goal_months gm ON gm.goal_id = g.id
     WHERE g.user_id = ?
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  res.json({ goals: rows.map(withProgress) });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { goal_name, target_amount, period_months, bank, starting_month } = req.body;

  if (!goal_name?.trim()) return res.status(400).json({ error: "Goal name is required" });
  const targetAmount = Number(target_amount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ error: "Target amount must be a positive number" });
  }
  const periodMonths = Number(period_months);
  if (!Number.isInteger(periodMonths) || periodMonths <= 0) {
    return res.status(400).json({ error: "Period must be a positive whole number of months" });
  }
  if (!starting_month) {
    return res.status(400).json({ error: "Starting month is required" });
  }

  const goalId = crypto.randomUUID();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO goals (id, user_id, goal_name, target_amount, period_months, bank, starting_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [goalId, req.user.id, goal_name.trim(), targetAmount, periodMonths, bank?.trim() || null, starting_month]
    );

    const months = buildGoalMonths(targetAmount, periodMonths, starting_month);
    for (const month of months) {
      await connection.query(
        `INSERT INTO goal_months (id, goal_id, month_number, month_label, target_amount)
         VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), goalId, month.month_number, month.month_label, month.target_amount]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const goal = await fetchGoalOwnedByUser(goalId, req.user.id);
  res.status(201).json({ goal: withProgress({ ...goal, amount_saved: 0 }) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const goal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const [months] = await pool.query(
    "SELECT * FROM goal_months WHERE goal_id = ? ORDER BY month_number ASC",
    [goal.id]
  );

  const amountSaved = months
    .filter((m) => m.is_completed)
    .reduce((sum, m) => sum + Number(m.target_amount), 0);

  res.json({ goal: withProgress({ ...goal, amount_saved: amountSaved }), months });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const goal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  await pool.query("DELETE FROM goals WHERE id = ?", [goal.id]);
  res.json({ message: "Goal deleted" });
}));

router.patch("/:id/months/:monthId", asyncHandler(async (req, res) => {
  const { is_completed } = req.body;
  if (typeof is_completed !== "boolean") {
    return res.status(400).json({ error: "is_completed must be a boolean" });
  }

  const goal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const [monthRows] = await pool.query("SELECT * FROM goal_months WHERE id = ? AND goal_id = ?", [
    req.params.monthId,
    goal.id,
  ]);
  if (!monthRows[0]) return res.status(404).json({ error: "Month not found" });

  await pool.query("UPDATE goal_months SET is_completed = ?, completed_at = ? WHERE id = ?", [
    is_completed,
    is_completed ? new Date() : null,
    req.params.monthId,
  ]);

  const [months] = await pool.query(
    "SELECT * FROM goal_months WHERE goal_id = ? ORDER BY month_number ASC",
    [goal.id]
  );
  const amountSaved = months
    .filter((m) => m.is_completed)
    .reduce((sum, m) => sum + Number(m.target_amount), 0);

  res.json({ goal: withProgress({ ...goal, amount_saved: amountSaved }), months });
}));

export default router;
