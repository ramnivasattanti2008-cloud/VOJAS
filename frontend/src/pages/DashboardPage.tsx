import { useState, useEffect } from "react";
import { api, ApiError } from "../services/api";
import type { HealthStatus } from "../types";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  Users,
  DollarSign,
} from "lucide-react";

const STAT_CARDS = [
  {
    label: "Total Projects",
    value: "—",
    icon: FileText,
    color: "electric",
    subtext: "MPLADS registry",
  },
  {
    label: "Active Anomalies",
    value: "—",
    icon: AlertTriangle,
    color: "saffron",
    subtext: "Flagged for review",
  },
  {
    label: "Citizen Reports",
    value: "—",
    icon: Users,
    color: "green",
    subtext: "Submitted this month",
  },
  {
    label: "Budget Monitored",
    value: "—",
    icon: DollarSign,
    color: "blue",
    subtext: "₹ in scheme funds",
  },
];

const RECENT_ALERTS = [
  {
    id: 1,
    type: "cost",
    severity: "HIGH",
    title: "Cost outlier detected",
    project: "Road construction — District X",
    amount: "₹48.5L vs ₹12L average",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "delay",
    severity: "MEDIUM",
    title: "Project delayed",
    project: "School building — Constituency Y",
    duration: "8 months overdue",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "duplicate",
    severity: "HIGH",
    title: "Duplicate project suspected",
    project: "Water supply — District Z",
    description: "Similar project exists in neighboring village",
    time: "1 day ago",
  },
  {
    id: 4,
    type: "geo",
    severity: "LOW",
    title: "Location mismatch",
    project: "Drainage work — District A",
    description: "Reported coordinates don't match satellite view",
    time: "2 days ago",
  },
];

const SECTOR_STATUS = [
  { name: "Public Infrastructure", total: 142, flagged: 8, completed: 89 },
  { name: "Water & Sanitation", total: 98, flagged: 3, completed: 72 },
  { name: "Education", total: 76, flagged: 1, completed: 65 },
  { name: "Health", total: 54, flagged: 2, completed: 41 },
  { name: "Transport", total: 63, flagged: 5, completed: 48 },
];

const severityColors: Record<string, string> = {
  HIGH: "text-red-400 bg-red-500/10 border-red-500/20",
  MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  LOW: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<HealthStatus>("/health")
      .then(setHealth)
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            VOJAS Accountability Platform — Real-time MPLAD Scheme Monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">
            System Active
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, subtext }) => (
          <div
            key={label}
            className="glass rounded-xl p-5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  color === "electric"
                    ? "bg-electric-500/15"
                    : color === "saffron"
                    ? "bg-saffron-500/15"
                    : color === "green"
                    ? "bg-green-500/15"
                    : "bg-blue-500/15"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    color === "electric"
                      ? "text-electric-400"
                      : color === "saffron"
                      ? "text-saffron-400"
                      : color === "green"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {subtext}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-saffron-400" />
              Recent Alerts
            </h2>
            <span className="text-xs text-slate-500">
              {RECENT_ALERTS.length} active
            </span>
          </div>
          <div className="space-y-3">
            {RECENT_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-navy-800/40 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
              >
                <div
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${severityColors[alert.severity]}`}
                >
                  {alert.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    {alert.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {alert.project}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {alert.amount || alert.duration || alert.description}
                  </p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {alert.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-electric-400" />
            System Status
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "API Server",
                status: health?.status === "ok" ? "ok" : "error",
                detail: `v${health?.version ?? "—"}`,
              },
              {
                label: "Database",
                status: health?.database === "connected" ? "ok" : "error",
                detail: health?.database ?? "—",
              },
              {
                label: "Map Service",
                status: "ok",
                detail: "Leaflet ready",
              },
              {
                label: "AI Engine",
                status: "pending",
                detail: "Pending Phase 11",
              },
              {
                label: "Document OCR",
                status: "pending",
                detail: "Pending Phase 8",
              },
            ].map(({ label, status, detail }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-sm text-slate-300">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{detail}</span>
                  {status === "ok" && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  )}
                  {status === "error" && (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  {status === "pending" && (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sector summary */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Sector Overview
            </h3>
            <div className="space-y-2.5">
              {SECTOR_STATUS.map((sector) => (
                <div key={sector.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{sector.name}</span>
                    <span className="text-slate-500">
                      {sector.flagged > 0 && (
                        <span className="text-saffron-400 mr-2">
                          {sector.flagged}⚑
                        </span>
                      )}
                      {sector.completed}/{sector.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-electric-500/60 rounded-full transition-all"
                      style={{
                        width: `${(sector.completed / sector.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phase banner */}
      <div className="glass rounded-xl p-4 flex items-center gap-3 border border-dashed border-slate-700">
        <TrendingUp className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="text-xs text-slate-500">
          <span className="text-slate-400 font-medium">
            Phase 2 — UI Shell:
          </span>{" "}
          Layout, routing, and state components complete.{" "}
          <span className="text-electric-400">
            Next: Phase 3 — User Authentication
          </span>
        </p>
      </div>
    </div>
  );
}
