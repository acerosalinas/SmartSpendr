import { useMonth } from "../context/MonthContext.jsx";

function shiftMonth(month, offset) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function formatMonth(month) {
  const date = new Date(`${month}-01T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function MonthSwitcher() {
  const { currentMonth, addMonth } = useMonth();

  function goTo(month) {
    addMonth(month);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => goTo(shiftMonth(currentMonth, -1))}
        className="rounded-lg px-2 py-1.5 text-subtle hover:bg-[var(--accent-soft)]"
        aria-label="Previous month"
      >
        &larr;
      </button>
      <div className="relative">
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-sm font-medium text-heading">
          {formatMonth(currentMonth)}
        </span>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => e.target.value && goTo(e.target.value)}
          className="w-40 cursor-pointer rounded-lg border bg-transparent px-3 py-1.5 text-sm text-transparent divider"
        />
      </div>
      <button
        onClick={() => goTo(shiftMonth(currentMonth, 1))}
        className="rounded-lg px-2 py-1.5 text-subtle hover:bg-[var(--accent-soft)]"
        aria-label="Next month"
      >
        &rarr;
      </button>
    </div>
  );
}
