import { useState, useCallback, useMemo } from "react";

export interface LineSeries {
  name: string;
  data: { period: string; value: number }[];
  color: string;
}

interface LineChartProps {
  series: LineSeries[];
  height?: number;
  /** Format value for tooltip. */
  formatValue?: (v: number) => string;
  /** Show area fill under line. Default true. */
  showArea?: boolean;
  className?: string;
}

const COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"];

function fmtNum(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)       return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("en-IN");
}

interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function ChartSVG({
  series,
  width,
  height,
  margins,
  hovered,
  onHover,
  formatValue,
  showArea,
}: {
  series: LineSeries[];
  width: number;
  height: number;
  margins: Margins;
  hovered: number | null;
  onHover: (index: number | null) => void;
  formatValue: (v: number) => string;
  showArea: boolean;
}) {
  const innerWidth = width - margins.left - margins.right;
  const innerHeight = height - margins.top - margins.bottom;

  // Flatten all data points to find domain
  const allPoints = series.flatMap((s) => s.data);
  const allValues = allPoints.map((p) => p.value ?? 0);
  const yMin = 0;
  const yMax = Math.max(...allValues, 1) * 1.1;
  const xCount = allPoints.length;

  const xScale = (i: number) => margins.left + (i / Math.max(xCount - 1, 1)) * innerWidth;
  const yScale = (v: number) =>
    margins.top + innerHeight - ((v - yMin) / (yMax - yMin)) * innerHeight;

  // Grid lines (horizontal only)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: yScale(yMin + t * (yMax - yMin)),
    label: formatValue(Math.round(yMin + t * (yMax - yMin))),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height, overflow: "visible" }}
    >
      {/* Horizontal grid lines */}
      {gridLines.map((gl, i) => (
        <g key={i}>
          <line
            x1={margins.left}
            y1={gl.y}
            x2={width - margins.right}
            y2={gl.y}
            stroke="#2c2c2a"
            strokeWidth={1}
          />
          <text
            x={margins.left - 4}
            y={gl.y + 4}
            textAnchor="end"
            className="fill-slate-600"
            style={{ fontSize: "9px", fontFamily: "monospace" }}
          >
            {gl.label}
          </text>
        </g>
      ))}

      {/* Series */}
      {series.map((s, si) => {
        const color = s.color ?? COLORS[si % COLORS.length];
        const points = s.data.map((p, pi) => ({
          x: xScale(pi),
          y: yScale(p.value ?? 0),
        }));

        // Build path
        let linePath = "";
        let areaPath = "";
        for (let pi = 0; pi < points.length; pi++) {
          const pt = points[pi];
          if (pi === 0) {
            linePath += `M ${pt.x} ${pt.y}`;
            if (showArea) areaPath += `M ${pt.x} ${margins.top + innerHeight} L ${pt.x} ${pt.y}`;
          } else {
            // Smooth line with bezier curves
            const prev = points[pi - 1];
            const cpx = (prev.x + pt.x) / 2;
            linePath += ` C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
            if (showArea) areaPath += ` C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
          }
        }
        if (showArea) {
          areaPath += ` L ${points[points.length - 1].x} ${margins.top + innerHeight} Z`;
        }

        return (
          <g key={s.name}>
            {/* Area fill */}
            {showArea && (
              <path
                d={areaPath}
                fill={color}
                opacity={hovered === null || hovered === si ? 0.12 : 0.04}
                style={{ transition: "opacity 0.2s" }}
              />
            )}

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={hovered === null || hovered === si ? 2 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={hovered === null || hovered === si ? 1 : 0.3}
              style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
            />

            {/* Dots */}
            {points.map((pt, pi) => (
              <circle
                key={pi}
                cx={pt.x}
                cy={pt.y}
                r={hovered === si && hovered !== null ? 4 : 3}
                fill={color}
                stroke="#1a1a19"
                strokeWidth={1.5}
                opacity={hovered === null || hovered === si ? 1 : 0.3}
                style={{ transition: "opacity 0.2s, r 0.2s" }}
                onMouseEnter={() => onHover(si)}
                onMouseLeave={() => onHover(null)}
                className="cursor-pointer"
              />
            ))}
          </g>
        );
      })}

      {/* X-axis labels */}
      {series[0]?.data.map((p, pi) => {
        const x = xScale(pi);
        return (
          <text
            key={p.period}
            x={x}
            y={height - margins.bottom + 14}
            textAnchor="middle"
            className="fill-slate-600"
            style={{ fontSize: "9px", fontFamily: "monospace" }}
          >
            {p.period}
          </text>
        );
      })}

      {/* Crosshair tooltip when hovering */}
      {hovered !== null && series[hovered] && (
        <g>
          {series[hovered].data.map((p, pi) => {
            const x = xScale(pi);
            const y = yScale(p.value ?? 0);
            return (
              <g key={pi} opacity={0.85}>
                <rect
                  x={x - 50}
                  y={y - 42}
                  width={100}
                  height={34}
                  rx={4}
                  fill="#1a2030"
                  stroke="#2c2c2a"
                />
                <text x={x} y={y - 26} textAnchor="middle" fill="#898781" style={{ fontSize: "9px", fontFamily: "monospace" }}>
                  {p.period}
                </text>
                <text x={x} y={y - 14} textAnchor="middle" fill="white" style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: "bold" }}>
                  {formatValue(p.value ?? 0)}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

/**
 * Multi-series line chart with optional area fill and hover tooltip.
 */
export function LineChart({
  series,
  height = 180,
  formatValue = fmtNum,
  showArea = true,
  className = "",
}: LineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const onHover = useCallback((idx: number | null) => setHovered(idx), []);

  const seriesColors = useMemo(
    () => series.map((s, i) => s.color ?? COLORS[i % COLORS.length]),
    [series]
  );

  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className={`flex items-center justify-center h-${height / 4} text-slate-600 text-xs ${className}`}>
        No data
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Legend */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {series.map((s, i) => (
            <div
              key={s.name}
              className="flex items-center gap-1.5 cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="w-3 h-0.5 rounded-full inline-block"
                style={{
                  backgroundColor: seriesColors[i],
                  opacity: hovered === null || hovered === i ? 1 : 0.3,
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
                {s.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height }}>
        <ChartSVG
          series={series}
          width={800}
          height={height}
          margins={{ top: 10, right: 20, bottom: 30, left: 56 }}
          hovered={hovered}
          onHover={onHover}
          formatValue={formatValue}
          showArea={showArea}
        />
      </div>
    </div>
  );
}
