import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.id, g.goal_name, g.target_amount,
       COALESCE(SUM(CASE WHEN gm.is_completed THEN gm.target_amount ELSE 0 END), 0) AS amount_saved
     FROM goals g
     LEFT JOIN goal_months gm ON gm.goal_id = g.id
     WHERE g.user_id = ?
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [req.user.id]
  );

  const goals = rows.map((g) => {
    const targetAmount = Number(g.target_amount);
    const amountSaved = Number(g.amount_saved) || 0;
    const progressPercent = targetAmount > 0 ? Math.min((amountSaved / targetAmount) * 100, 100) : 0;
    return {
      id: g.id,
      goal_name: g.goal_name,
      target_amount: targetAmount,
      amount_saved: amountSaved,
      progress_percent: progressPercent,
    };
  });

  const totalSaved = goals.reduce((sum, g) => sum + g.amount_saved, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const completedGoals = goals.filter((g) => g.progress_percent >= 100).length;

  res.json({
    total_saved: totalSaved,
    total_remaining: Math.max(totalTarget - totalSaved, 0),
    active_goals_count: goals.length - completedGoals,
    completed_goals_count: completedGoals,
    goals,
  });
}));

export default router;
