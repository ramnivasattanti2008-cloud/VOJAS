import { useState } from "react";

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutItem[];
  size?: number;
  strokeWidth?: number;
  /** Center text. Default shows total. */
  centerText?: string;
  centerSubtext?: string;
  /** Format value for tooltip/center. */
  formatValue?: (v: number) => string;
  className?: string;
}

/** Compute SVG arc for the ring (stroke-based) */
function strokeArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const toRad = (a: number) => (a * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function fmtNum(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `${(v / 1_00_000).toFixed(0)}L`;
  if (v >= 1_000)       return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("en-IN");
}

/**
 * Donut chart — SVG arc-based, hover expand, center stat, legend below.
 */
export function DonutChart({
  data,
  size = 160,
  strokeWidth = 20,
  centerText,
  centerSubtext,
  formatValue = fmtNum,
  className = "",
}: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  // Compute slices
  type Slice = { item: DonutItem; startAngle: number; endAngle: number; pct: number };
  const slices: Slice[] = [];
  let angle = -90; // start at top
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const pct = total > 0 ? item.value / total : 0;
    const sweep = pct * 360;
    const endAngle = angle + sweep;
    slices.push({ item, startAngle: angle, endAngle, pct });
    angle = endAngle;
  }

  const hoverOffset = 6; // px to expand on hover

  if (data.length === 0 || total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="text-slate-600 text-xs">No data</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* SVG donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#1a2030"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice, i) => {
            const isHovered = hovered === i;
            const r2 = isHovered ? r + hoverOffset : r;
            const midAngle = (slice.startAngle + slice.endAngle) / 2;
            const dx = isHovered ? (hoverOffset * Math.cos((midAngle * Math.PI) / 180)) : 0;
            const dy = isHovered ? (hoverOffset * Math.sin((midAngle * Math.PI) / 180)) : 0;

            return (
              <path
                key={slice.item.label}
                d={strokeArcPath(cx + dx, cy + dy, r2, slice.startAngle, slice.endAngle)}
                fill="none"
                stroke={slice.item.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeLinecap="butt"
                opacity={hovered === null || isHovered ? 1 : 0.35}
                style={{ transition: "all 0.2s ease" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              />
            );
          })}
        </svg>

        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ padding: strokeWidth }}
        >
          <span className="text-lg font-bold text-white font-mono leading-none">
            {centerText ?? formatValue(total)}
          </span>
          {centerSubtext && (
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
              {centerSubtext}
            </span>
          )}
          {hovered !== null && (
            <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[80px] text-center">
              {slices[hovered].item.label}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {slices.map((slice, i) => (
          <div
            key={slice.item.label}
            className="flex items-center gap-1.5 cursor-pointer group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: slice.item.color,
                opacity: hovered === null || hovered === i ? 1 : 0.35,
                transition: "opacity 0.2s",
              }}
            />
            <span
              className="text-[10px] font-mono"
              style={{
                color: hovered === null || hovered === i ? "#c3c2b7" : "#52514e",
                transition: "color 0.2s",
              }}
            >
              {slice.item.label}
            </span>
            <span
              className="text-[10px] font-mono font-semibold"
              style={{
                color: hovered === null || hovered === i ? slice.item.color : "#52514e",
                transition: "color 0.2s",
              }}
            >
              {slice.pct >= 0.01 ? `${(slice.pct * 100).toFixed(0)}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
