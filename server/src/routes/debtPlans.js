import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeMonth } from "../utils/month.js";
import { ensureMonthExists } from "../utils/ensureMonth.js";
import { splitAmountAcrossMonths } from "../utils/splitAmount.js";

const router = Router();
router.use(requireAuth);

function buildDueDate(monthLabel, dueDay) {
  const [year, month] = monthLabel.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

router.post("/", asyncHandler(async (req, res) => {
  const { category_id, bank, total_amount, period_months, starting_month, due_day } = req.body;

  if (!category_id) return res.status(400).json({ error: "Category is required" });
  const totalAmount = Number(total_amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return res.status(400).json({ error: "Total amount must be a positive number" });
  }
  const periodMonths = Number(period_months);
  if (!Number.isInteger(periodMonths) || periodMonths <= 0) {
    return res.status(400).json({ error: "Period must be a positive whole number of months" });
  }
  const startingMonth = normalizeMonth(starting_month);
  if (!startingMonth) return res.status(400).json({ error: "A valid starting month (YYYY-MM) is required" });
  const dueDay = Number(due_day);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    return res.status(400).json({ error: "Due day must be a whole number between 1 and 31" });
  }

  const [categoryRows] = await pool.query("SELECT id, type FROM categories WHERE id = ? AND user_id = ?", [
    category_id,
    req.user.id,
  ]);
  const category = categoryRows[0];
  if (!category || !["debt", "bill"].includes(category.type)) {
    return res.status(400).json({ error: "Category must be a Debt or Bill category" });
  }

  const planId = crypto.randomUUID();
  const months = splitAmountAcrossMonths(totalAmount, periodMonths, startingMonth);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO debt_plans (id, user_id, category_id, bank, total_amount, period_months, starting_month, due_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [planId, req.user.id, category_id, bank?.trim() || null, totalAmount, periodMonths, startingMonth, dueDay]
    );

    for (const month of months) {
      await connection.query(
        `INSERT INTO debt_bill_items (id, user_id, category_id, month, due_date, plan_id, installment_amount, bank)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          req.user.id,
          category_id,
          month.month_label,
          buildDueDate(month.month_label, dueDay),
          planId,
          month.amount,
          bank?.trim() || null,
        ]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  await Promise.all(months.map((m) => ensureMonthExists(req.user.id, m.month_label)));

  res.status(201).json({ plan_id: planId, months_created: months.length });
}));

export default router;
