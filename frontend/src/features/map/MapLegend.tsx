import { CheckCircle2, Layers } from "lucide-react";
import type { LayerMode } from "./MapLayers";
import type { AnomalySeverity } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: "#94a3b8",
  APPROVED: "#60a5fa",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#22c55e",
  VERIFIED: "#10b981",
  CANCELLED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposed",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
  CANCELLED: "Cancelled",
};

const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#facc15",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

interface MapLegendProps {
  layerMode: LayerMode;
  showBoundaries?: boolean;
  showDistricts?: boolean;
}

export function MapLegend({ layerMode, showBoundaries, showDistricts }: MapLegendProps) {
  const showHeatmapLegend = layerMode === "heatmap" || layerMode === "both";

  return (
    <div className="glass rounded-xl p-3 space-y-3">
      {/* Status legend */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
          Project Status
        </p>
        <div className="flex items-center gap-4 flex-wrap text-[10px]">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-400">{STATUS_LABELS[status]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">Verified</span>
          </div>
        </div>
      </div>

      {/* Heatmap legend */}
      {showHeatmapLegend && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            Anomaly Severity (Heatmap)
          </p>
          <div className="flex items-center gap-4 flex-wrap text-[10px]">
            {(Object.keys(SEVERITY_COLORS) as AnomalySeverity[]).map((sev) => {
              const color = SEVERITY_COLORS[sev];
              const radius = { LOW: 14, MEDIUM: 22, HIGH: 32, CRITICAL: 44 }[sev];
              return (
                <div key={sev} className="flex items-center gap-1.5">
                  <span
                    className="rounded-full border-2"
                    style={{
                      width: (radius * 2) / 3,
                      height: (radius * 2) / 3,
                      backgroundColor: `${color}30`,
                      borderColor: color,
                      opacity: 0.7,
                    }}
                  />
                  <span className="text-slate-400">{SEVERITY_LABELS[sev]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* State boundaries legend */}
      {showBoundaries && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            State Boundaries (Choropleth)
          </p>
          <div className="flex items-center gap-3 flex-wrap text-[10px]">
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-3 rounded"
                style={{ background: "linear-gradient(to right, hsl(220,70%,28%), hsl(110,70%,40%), hsl(40,70%,45%), hsl(0,70%,50%))" }}
              />
              <span className="text-slate-400">Fewer → More projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-3 rounded border-2 border-dashed"
                style={{ borderColor: "#2d4a6f", background: "#1e3a5f" }}
              />
              <span className="text-slate-400">No projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-0.5 border-t-2"
                style={{ borderColor: "#a5b4fc" }}
              />
              <span className="text-slate-400">Active filter</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-electric-400" />
              <span className="text-slate-400">Click a state to filter</span>
            </div>
          </div>
        </div>
      )}

      {/* District boundaries legend */}
      {showDistricts && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            District Boundaries (visible at zoom ≥ 9)
          </p>
          <div className="flex items-center gap-3 flex-wrap text-[10px]">
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-3 rounded"
                style={{ background: "linear-gradient(to right, hsl(220,68%,24%), hsl(110,68%,38%), hsl(40,68%,44%), hsl(0,68%,48%))" }}
              />
              <span className="text-slate-400">District project density</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-4 h-0.5 border-t-2"
                style={{ borderColor: "#a5b4fc" }}
              />
              <span className="text-slate-400">Active state filter</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
