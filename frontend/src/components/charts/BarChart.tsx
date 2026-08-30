import { useState, useCallback } from "react";

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  /** Primary series color; falls back to categorical slot. */
  color?: string;
  /** Vertical padding between bars in px. Default 4. */
  gap?: number;
  /** Show value label at bar end. Default true. */
  showValue?: boolean;
  /** Max bar length as fraction of axis (0-1). Default 1. */
  maxRatio?: number;
  /** Format value for display. Default: toLocaleString. */
  formatValue?: (v: number) => string;
  /** Extra CSS class. */
  className?: string;
}

const CATEGORY_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

function fmtNum(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)       return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-IN");
}

/**
 * Horizontal bar chart — thin marks, 4px rounded ends, hover tooltip.
 * Uses VOJAS dark palette. Thin = short bar height, generous gap.
 */
export function BarChart({
  data,
  color,
  gap = 4,
  showValue = true,
  maxRatio,
  formatValue = fmtNum,
  className = "",
}: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxVal = maxRatio != null
    ? Math.max(...data.map((d) => d.value)) / maxRatio
    : Math.max(...data.map((d) => d.value), 1);

  const getColor = useCallback(
    (index: number, itemColor?: string) => {
      if (itemColor) return itemColor;
      return color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    },
    [color]
  );

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-24 text-slate-600 text-xs ${className}`}>
        No data
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {data.map((item, i) => {
        const barWidth = Math.max(2, (item.value / maxVal) * 100);
        const itemColor = getColor(i, item.color);
        const isHovered = hovered === i;

        return (
          <div key={item.label} className="group relative">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ paddingTop: gap / 2, paddingBottom: gap / 2 }}
            >
              {/* Label */}
              <span className="text-[11px] text-slate-400 w-28 shrink-0 truncate font-mono">
                {item.label}
              </span>

              {/* Bar track + fill */}
              <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: isHovered ? itemColor : `${itemColor}cc`,
                  }}
                />
              </div>

              {/* Value */}
              {showValue && (
                <span
                  className="text-[10px] font-mono font-semibold shrink-0 w-16 text-right"
                  style={{ color: isHovered ? itemColor : "#c3c2b7" }}
                >
                  {formatValue(item.value)}
                </span>
              )}
            </div>

            {/* Hover tooltip */}
            {isHovered && (
              <div
                className="absolute z-10 left-0 -top-10 bg-navy-800 border border-white/10 rounded-lg px-2.5 py-1.5 pointer-events-none shadow-xl whitespace-nowrap"
                style={{ transform: "translateX(0)" }}
              >
                <div className="text-[10px] text-slate-400">{item.label}</div>
                <div className="text-xs font-bold text-white font-mono">
                  {formatValue(item.value)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
