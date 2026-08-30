import { Polygon, Tooltip, Popup } from "react-leaflet";
import { INDIA_STATES, type StateBoundary } from "@/data/india-states";

interface BoundariesLayerProps {
  /**
   * State name to highlight (e.g. "Maharashtra").
   * Pass "" to show all states with a default fill.
   */
  highlightedState?: string;
  /** Opacity of unhighlighted state fills */
  fillOpacity?: number;
  /** Stroke weight */
  weight?: number;
  /**
   * Project count by state name — enables a choropleth color scale:
   * states with more projects are rendered darker / hotter.
   */
  stateCounts?: Record<string, number>;
  /** Click handler — sets the state filter to the clicked state name */
  onStateClick?: (state: string) => void;
}

// Choropleth color scale (cool → hot). HSL hue is constant; lightness varies with count.
function getChoroplethColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "#1e3a5f"; // navy-800 (no projects)
  const ratio = Math.min(1, Math.log(count + 1) / Math.log(maxCount + 1));
  // Interpolate from cool blue → warm orange
  const hue = 220 - ratio * 220; // 220 (blue) → 0 (red)
  const sat = 70;
  const light = 28 + ratio * 22; // 28% (dim) → 50% (bright)
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function getFillOpacity(name: string, highlighted: string, base: number, hasCount: number): number {
  if (highlighted && name === highlighted) return Math.min(0.85, base * 4);
  if (hasCount > 0) return Math.min(0.65, base * (1 + hasCount / 4));
  return base;
}

export function BoundariesLayer({
  highlightedState = "",
  fillOpacity = 0.08,
  weight = 1.5,
  stateCounts = {},
  onStateClick,
}: BoundariesLayerProps) {
  const maxCount = Math.max(...Object.values(stateCounts), 0);
  const totalProjects = Object.values(stateCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      {INDIA_STATES.map((state: StateBoundary) => {
        const isHighlighted = state.name === highlightedState;
        const count = stateCounts[state.name] ?? 0;
        const stroke = isHighlighted ? "#a5b4fc" : count > 0 ? "#475569" : "#2d4a6f";
        const fo = getFillOpacity(state.name, highlightedState, fillOpacity, count);
        const fill = isHighlighted
          ? "#6366f1"
          : getChoroplethColor(count, maxCount);

        return (
          <Polygon
            key={state.name}
            positions={state.polygon}
            pathOptions={{
              color: stroke,
              fillColor: fill,
              fillOpacity: fo,
              weight: isHighlighted ? 2.5 : weight,
              opacity: isHighlighted ? 0.95 : count > 0 ? 0.7 : 0.4,
              dashArray: isHighlighted ? undefined : "4 4",
            }}
            eventHandlers={{
              click: () => {
                if (onStateClick) onStateClick(state.name);
              },
              mouseover: (e) => {
                e.target.setStyle({
                  fillOpacity: Math.min(0.9, fo * 1.5),
                  weight: 2.5,
                });
              },
              mouseout: (e) => {
                e.target.setStyle({
                  fillOpacity: fo,
                  weight: isHighlighted ? 2.5 : weight,
                });
              },
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -4]}>
              <div className="text-[11px] leading-snug">
                <p className="font-semibold text-slate-900">{state.name}</p>
                {count > 0 ? (
                  <p className="text-slate-700">
                    {count} project{count !== 1 ? "s" : ""} mapped
                    {totalProjects > 0 && maxCount > 0 && (
                      <span className="text-slate-500"> · {Math.round((count / totalProjects) * 100)}%</span>
                    )}
                  </p>
                ) : (
                  <p className="text-slate-500 italic">No projects yet</p>
                )}
                {onStateClick && (
                  <p className="text-[10px] text-blue-600 mt-0.5">Click to filter →</p>
                )}
              </div>
            </Tooltip>
            {onStateClick && (
              <Popup>
                <div className="text-xs space-y-1 min-w-[180px]">
                  <p className="font-semibold text-slate-900">{state.name}</p>
                  <p className="text-slate-600">
                    {count > 0
                      ? `${count} project${count !== 1 ? "s" : ""} mapped in this state`
                      : "No projects in this state yet."}
                  </p>
                  <button
                    onClick={() => onStateClick(state.name)}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Filter to {state.name} →
                  </button>
                </div>
              </Popup>
            )}
          </Polygon>
        );
      })}
    </>
  );
}
