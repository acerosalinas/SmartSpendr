import { pool } from "../db.js";
import { compareMonths } from "./month.js";

async function getCategoryTypeTotals(userId, month, type) {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(cb.expected_amount), 0) AS expected,
       COALESCE((
         SELECT SUM(t.amount) FROM transactions t
         JOIN categories tc ON tc.id = t.category_id
         WHERE t.user_id = ? AND tc.type = ? AND to_char(t.txn_date, 'YYYY-MM-01') = ?
       ), 0) AS actual
     FROM categories c
     LEFT JOIN category_budgets cb
       ON cb.category_id = c.id AND cb.user_id = c.user_id AND cb.month = ?
     WHERE c.user_id = ? AND c.type = ?`,
    [userId, type, month, month, userId, type]
  );
  return { expected: Number(rows[0].expected), actual: Number(rows[0].actual) };
}

async function computeSingleMonth(userId, month, startingBalance) {
  const [income, savings, debt, bills, expenses] = await Promise.all([
    getCategoryTypeTotals(userId, month, "income"),
    getCategoryTypeTotals(userId, month, "savings"),
    getCategoryTypeTotals(userId, month, "debt"),
    getCategoryTypeTotals(userId, month, "bill"),
    getCategoryTypeTotals(userId, month, "expense"),
  ]);

  const leftExpected =
    startingBalance.expected + income.expected - savings.expected - debt.expected - bills.expected - expenses.expected;
  const leftActual =
    startingBalance.actual + income.actual - savings.actual - debt.actual - bills.actual - expenses.actual;

  return {
    month,
    starting_balance: startingBalance,
    income,
    savings,
    debt,
    bills,
    expenses,
    left: { expected: leftExpected, actual: leftActual },
  };
}

// Walks every tracked month from the user's earliest month up through `targetMonth`,
// carrying each month's computed "Left" balance forward as the next month's Starting
// Balance -- so only the very first month (or an explicit override) is ever manually set.
export async function computeMonthRollup(userId, targetMonth) {
  const [monthRows] = await pool.query(
    "SELECT month, starting_balance_override FROM months WHERE user_id = ? AND month <= ? ORDER BY month ASC",
    [userId, targetMonth]
  );

  const months = monthRows.map((r) => ({ month: r.month, override: r.starting_balance_override }));
  if (!months.some((m) => m.month === targetMonth)) {
    months.push({ month: targetMonth, override: null });
  }
  months.sort((a, b) => compareMonths(a.month, b.month));

  let currentBalance = { expected: 0, actual: 0 };
  let result = null;

  for (const m of months) {
    if (m.override !== null && m.override !== undefined) {
      const overrideAmount = Number(m.override);
      currentBalance = { expected: overrideAmount, actual: overrideAmount };
    }
    const rollup = await computeSingleMonth(userId, m.month, currentBalance);
    currentBalance = { expected: rollup.left.actual, actual: rollup.left.actual };

    if (m.month === targetMonth) {
      result = { ...rollup, is_first_month: months[0].month === targetMonth };
    }
  }

  return result;
}
