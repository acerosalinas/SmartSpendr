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

// Net movement (income minus everything else) for the month, split by which
// account (cash/bank) each transaction was tagged with. Expected/budgeted
// figures stay account-agnostic -- only realized transactions are tied to
// a physical account.
async function getAccountNetTotals(userId, month) {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tc.type = 'income' THEN t.amount ELSE -t.amount END)
         FILTER (WHERE t.account = 'cash'), 0) AS cash_net,
       COALESCE(SUM(CASE WHEN tc.type = 'income' THEN t.amount ELSE -t.amount END)
         FILTER (WHERE t.account = 'bank'), 0) AS bank_net
     FROM transactions t
     JOIN categories tc ON tc.id = t.category_id
     WHERE t.user_id = ? AND to_char(t.txn_date, 'YYYY-MM-01') = ?`,
    [userId, month]
  );
  return { cash: Number(rows[0].cash_net), bank: Number(rows[0].bank_net) };
}

async function computeSingleMonth(userId, month, startingBalance, startingAccounts) {
  const [income, savings, debt, bills, expenses, accountNet] = await Promise.all([
    getCategoryTypeTotals(userId, month, "income"),
    getCategoryTypeTotals(userId, month, "savings"),
    getCategoryTypeTotals(userId, month, "debt"),
    getCategoryTypeTotals(userId, month, "bill"),
    getCategoryTypeTotals(userId, month, "expense"),
    getAccountNetTotals(userId, month),
  ]);

  const leftExpected =
    startingBalance.expected + income.expected - savings.expected - debt.expected - bills.expected - expenses.expected;
  const leftActual =
    startingBalance.actual + income.actual - savings.actual - debt.actual - bills.actual - expenses.actual;

  const accountsEnding = {
    cash: startingAccounts.cash + accountNet.cash,
    bank: startingAccounts.bank + accountNet.bank,
  };

  return {
    month,
    starting_balance: startingBalance,
    income,
    savings,
    debt,
    bills,
    expenses,
    left: { expected: leftExpected, actual: leftActual },
    accounts: {
      cash: { starting: startingAccounts.cash, ending: accountsEnding.cash },
      bank: { starting: startingAccounts.bank, ending: accountsEnding.bank },
    },
    _accountsEnding: accountsEnding,
  };
}

// Walks every tracked month from the user's earliest month up through `targetMonth`,
// carrying each month's computed "Left" balance forward as the next month's Starting
// Balance -- so only the very first month (or an explicit override) is ever manually set.
export async function computeMonthRollup(userId, targetMonth) {
  const [monthRows] = await pool.query(
    "SELECT month, cash_starting_override, bank_starting_override FROM months WHERE user_id = ? AND month <= ? ORDER BY month ASC",
    [userId, targetMonth]
  );

  const months = monthRows.map((r) => ({
    month: r.month,
    cashOverride: r.cash_starting_override,
    bankOverride: r.bank_starting_override,
  }));
  if (!months.some((m) => m.month === targetMonth)) {
    months.push({ month: targetMonth, cashOverride: null, bankOverride: null });
  }
  months.sort((a, b) => compareMonths(a.month, b.month));

  let currentBalance = { expected: 0, actual: 0 };
  let currentAccounts = { cash: 0, bank: 0 };
  let result = null;

  for (const m of months) {
    if (m.cashOverride !== null && m.cashOverride !== undefined) {
      currentAccounts.cash = Number(m.cashOverride);
    }
    if (m.bankOverride !== null && m.bankOverride !== undefined) {
      currentAccounts.bank = Number(m.bankOverride);
    }
    if (m.cashOverride !== null || m.bankOverride !== null) {
      currentBalance = {
        expected: currentAccounts.cash + currentAccounts.bank,
        actual: currentAccounts.cash + currentAccounts.bank,
      };
    }

    const rollup = await computeSingleMonth(userId, m.month, currentBalance, currentAccounts);
    currentBalance = { expected: rollup.left.actual, actual: rollup.left.actual };
    currentAccounts = rollup._accountsEnding;

    if (m.month === targetMonth) {
      const { _accountsEnding, ...publicRollup } = rollup;
      result = { ...publicRollup, is_first_month: months[0].month === targetMonth };
    }
  }

  return result;
}
