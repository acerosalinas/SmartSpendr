// Splits target_amount into period_months monthly targets that sum exactly
// to target_amount, distributing the rounding remainder into the last month.
export function buildGoalMonths(targetAmount, periodMonths, startingMonth) {
  const totalCents = Math.round(Number(targetAmount) * 100);
  const baseCents = Math.floor(totalCents / periodMonths);
  const remainderCents = totalCents - baseCents * periodMonths;

  const start = new Date(startingMonth);
  const months = [];

  for (let i = 0; i < periodMonths; i++) {
    const isLast = i === periodMonths - 1;
    const cents = baseCents + (isLast ? remainderCents : 0);
    const monthDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));

    months.push({
      month_number: i + 1,
      month_label: monthDate.toISOString().slice(0, 10),
      target_amount: cents / 100,
    });
  }

  return months;
}
