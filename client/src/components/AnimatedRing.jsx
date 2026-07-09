import { useEffect, useState } from "react";

export default function AnimatedRing({ percent, size = 120, stroke = 8, delay = 0, className = "" }) {
  const [filled, setFilled] = useState(false);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (filled ? percent : 0) / 100);

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 250 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <svg width={size} height={size} className={`-rotate-90 ${className}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
    </svg>
  );
}
