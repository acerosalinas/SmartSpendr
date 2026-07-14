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

// Per-month contribution: an entered actual_amount takes precedence over the
// checklist checkbox (which still contributes its full target_amount when
// checked and no actual_amount has been recorded yet).
function monthContribution(m) {
  if (m.actual_amount !== null && m.actual_amount !== undefined) return Number(m.actual_amount);
  return m.is_completed ? Number(m.target_amount) : 0;
}

// The checklist (goal_months) always computes its own total independently of
// this. actual_saved_override, when set, replaces that computed total for
// display/progress purposes -- it's a manual override, not a schedule change.
function resolveAmountSaved(goal, months) {
  if (goal.actual_saved_override !== null && goal.actual_saved_override !== undefined) {
    return Number(goal.actual_saved_override);
  }
  return months.reduce((sum, m) => sum + monthContribution(m), 0);
}

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.*,
       COALESCE(g.actual_saved_override,
         SUM(CASE WHEN gm.actual_amount IS NOT NULL THEN gm.actual_amount
                  WHEN gm.is_completed THEN gm.target_amount ELSE 0 END),
       0) AS amount_saved
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

  const amountSaved = resolveAmountSaved(goal, months);

  res.json({ goal: withProgress({ ...goal, amount_saved: amountSaved }), months });
}));

// Editable fields are limited to goal_name and bank. target_amount,
// period_months, and starting_month stay fixed after creation because they
// define the already-generated goal_months schedule (including any months
// already checked off) -- users who need to change those delete and
// recreate the goal.
router.put("/:id", asyncHandler(async (req, res) => {
  const goal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const { goal_name, bank } = req.body;
  if (!goal_name?.trim()) return res.status(400).json({ error: "Goal name is required" });

  await pool.query("UPDATE goals SET goal_name = ?, bank = ? WHERE id = ?", [
    goal_name.trim(),
    bank?.trim() || null,
    req.params.id,
  ]);

  const [months] = await pool.query(
    "SELECT * FROM goal_months WHERE goal_id = ? ORDER BY month_number ASC",
    [req.params.id]
  );

  const updatedGoal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  const amountSaved = resolveAmountSaved(updatedGoal, months);
  res.json({ goal: withProgress({ ...updatedGoal, amount_saved: amountSaved }), months });
}));

// Manual override for the goal's total Amount Saved, independent of which
// checklist months are checked off. Pass null to clear the override and go
// back to the checklist-computed total.
router.patch("/:id/actual", asyncHandler(async (req, res) => {
  const goal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const { actual_saved } = req.body;
  let override = null;
  if (actual_saved !== null && actual_saved !== undefined) {
    const amount = Number(actual_saved);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: "Actual saved must be zero or a positive number" });
    }
    override = amount;
  }

  await pool.query("UPDATE goals SET actual_saved_override = ? WHERE id = ?", [override, req.params.id]);

  const [months] = await pool.query(
    "SELECT * FROM goal_months WHERE goal_id = ? ORDER BY month_number ASC",
    [req.params.id]
  );
  const updatedGoal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  const amountSaved = resolveAmountSaved(updatedGoal, months);
  res.json({ goal: withProgress({ ...updatedGoal, amount_saved: amountSaved }), months });
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
  const amountSaved = resolveAmountSaved(goal, months);

  res.json({ goal: withProgress({ ...goal, amount_saved: amountSaved }), months });
}));

// Records how much was actually saved in a given month. If it falls short of
// that month's target_amount, the shortfall is added onto the NEXT month's
// target_amount (rollover) -- re-editing (or clearing) reverses the old
// rollover before applying the new one, so this stays correct across edits.
// There's no month past the last one to roll into, so a shortfall on the
// final month simply isn't carried anywhere.
router.patch("/:id/months/:monthId/actual", asyncHandler(async (req, res) => {
  const goal = await fetchGoalOwnedByUser(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const [monthRows] = await pool.query("SELECT * FROM goal_months WHERE id = ? AND goal_id = ?", [
    req.params.monthId,
    goal.id,
  ]);
  const month = monthRows[0];
  if (!month) return res.status(404).json({ error: "Month not found" });

  const { actual_amount } = req.body;
  let newActual = null;
  if (actual_amount !== null && actual_amount !== undefined && actual_amount !== "") {
    const amount = Number(actual_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: "Actual amount must be zero or a positive number" });
    }
    newActual = amount;
  }

  const [nextRows] = await pool.query("SELECT * FROM goal_months WHERE goal_id = ? AND month_number = ?", [
    goal.id,
    month.month_number + 1,
  ]);
  const nextMonth = nextRows[0] || null;

  const oldRollover = Number(month.rollover_to_next) || 0;
  const shortfall = newActual !== null ? Math.max(Number(month.target_amount) - newActual, 0) : 0;
  const newRollover = nextMonth ? shortfall : 0;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (nextMonth && oldRollover !== newRollover) {
      await connection.query("UPDATE goal_months SET target_amount = target_amount - ? + ? WHERE id = ?", [
        oldRollover,
        newRollover,
        nextMonth.id,
      ]);
    }

    await connection.query("UPDATE goal_months SET actual_amount = ?, rollover_to_next = ? WHERE id = ?", [
      newActual,
      newRollover,
      month.id,
    ]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const [months] = await pool.query(
    "SELECT * FROM goal_months WHERE goal_id = ? ORDER BY month_number ASC",
    [goal.id]
  );
  const amountSaved = resolveAmountSaved(goal, months);

  res.json({ goal: withProgress({ ...goal, amount_saved: amountSaved }), months });
}));

export default router;
