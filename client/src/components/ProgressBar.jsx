import { formatPercent } from "../utils/format.js";

export default function ProgressBar({ percent, showLabel = true }) {
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--accent-soft)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: "var(--accent)" }}
        />
      </div>
      {showLabel && <p className="mt-1 text-right text-xs text-subtle">{formatPercent(clamped)} complete</p>}
    </div>
  );
}
