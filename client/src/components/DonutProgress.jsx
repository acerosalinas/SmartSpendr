import { PieChart, Pie, Cell } from "recharts";
import { useTheme } from "../context/ThemeContext.jsx";
import { formatPercent } from "../utils/format.js";

export default function DonutProgress({ percent, size = 128 }) {
  const { theme } = useTheme();
  const clamped = Math.min(Math.max(percent, 0), 100);
  const data = [
    { name: "completed", value: clamped },
    { name: "remaining", value: 100 - clamped },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={size * 0.34}
          outerRadius={size * 0.48}
          startAngle={90}
          endAngle={-270}
          stroke="none"
          isAnimationActive={false}
        >
          <Cell fill={theme.accent} />
          <Cell fill={theme.accentSoft} />
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold text-heading">{formatPercent(clamped)}</span>
      </div>
    </div>
  );
}
