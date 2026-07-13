import { splitAmountAcrossMonths } from "./splitAmount.js";

export function buildGoalMonths(targetAmount, periodMonths, startingMonth) {
  return splitAmountAcrossMonths(targetAmount, periodMonths, startingMonth).map((m) => ({
    month_number: m.month_number,
    month_label: m.month_label,
    target_amount: m.amount,
  }));
}
