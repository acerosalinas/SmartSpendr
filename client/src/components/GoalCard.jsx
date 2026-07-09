import { Link } from "react-router-dom";
import DonutProgress from "./DonutProgress.jsx";
import ProgressBar from "./ProgressBar.jsx";
import { formatCurrency } from "../utils/format.js";

export default function GoalCard({ goal }) {
  return (
    <Link
      to={`/goals/${goal.id}`}
      className="card block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--accent)]"
    >
      <h3 className="mb-3 text-center text-base font-semibold text-heading">{goal.goal_name}</h3>

      <div className="flex justify-center">
        <DonutProgress percent={goal.progress_percent} />
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-subtle">Target</span>
          <span className="font-medium text-heading">{formatCurrency(goal.target_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-subtle">Saved</span>
          <span className="font-medium text-heading">{formatCurrency(goal.amount_saved)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-subtle">Remaining</span>
          <span className="font-medium text-heading">{formatCurrency(goal.remaining_balance)}</span>
        </div>
        {goal.bank && (
          <div className="flex justify-between">
            <span className="text-subtle">Bank</span>
            <span className="font-medium text-heading">{goal.bank}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <ProgressBar percent={goal.progress_percent} />
      </div>
    </Link>
  );
}
