import { useEffect, useState } from "react";
import { riskApi, type ProjectRisk, type RiskLevel, type RiskFactor } from "@/services/risk-api";
import { ApiError } from "@/services/api";
import {
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  Users,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; dot: string; gradient: string }> = {
  LOW:      { bg: "bg-emerald-500/10",  text: "text-emerald-400", border: "border-emerald-500/20",  dot: "bg-emerald-400", gradient: "from-emerald-500 to-green-400" },
  MEDIUM:   { bg: "bg-amber-500/10",    text: "text-amber-400",   border: "border-amber-500/20",    dot: "bg-amber-400",   gradient: "from-amber-500 to-yellow-400" },
  HIGH:     { bg: "bg-orange-500/10",   text: "text-orange-400",  border: "border-orange-500/20",   dot: "bg-orange-400",  gradient: "from-orange-500 to-amber-400" },
  CRITICAL: { bg: "bg-red-500/10",      text: "text-red-400",     border: "border-red-500/20",     dot: "bg-red-400",     gradient: "from-red-500 to-rose-400" },
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical",
};

function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const c = RISK_COLORS[level];
  // Calculate arc: 0% to 100% maps to -90deg to 90deg (180deg arc)
  const angle = -90 + (score / 100) * 180;
  const radius = 70;
  const cx = 90;
  const cy = 90;
  const rad = (angle * Math.PI) / 180;
  const x = cx + radius * Math.cos(rad);
  const y = cy + radius * Math.sin(rad);

  return (
    <div className="relative w-[180px] h-[110px] mx-auto">
      <svg viewBox="0 0 180 110" className="w-full h-full" role="img" aria-label={`Risk gauge: score ${score} out of 100, ${level} risk`}>
        {/* Background arc */}
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          stroke="rgb(51 65 85 / 0.3)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          stroke={`url(#riskGradient)`}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 220} 220`}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={
              level === "CRITICAL" ? "#ef4444" :
              level === "HIGH"     ? "#f97316" :
              level === "MEDIUM"   ? "#f59e0b" :
              "#10b981"
            } />
            <stop offset="100%" stopColor={
              level === "CRITICAL" ? "#f43f5e" :
              level === "HIGH"     ? "#fbbf24" :
              level === "MEDIUM"   ? "#fbbf24" :
              "#22c55e"
            } />
          </linearGradient>
        </defs>
        {/* Indicator dot */}
        <circle cx={x} cy={y} r="6" fill="white" className="drop-shadow-lg" />
        <circle cx={x} cy={y} r="3" fill={c.dot.replace("bg-", "").replace("-400", "")} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className={`text-4xl font-bold ${c.text}`}>{score}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">out of 100</p>
      </div>
    </div>
  );
}

function ScoreBar({ score, max, color, label }: { score: number; max: number; color: string; label: string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-300">{score}<span className="text-slate-600">/{max}</span></span>
      </div>
      <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProjectRiskTab({ projectId }: { projectId: string }) {
  const [risk, setRisk] = useState<ProjectRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await riskApi.get(projectId);
      setRisk(r);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load risk data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [projectId]);

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    try {
      const r = await riskApi.recalculateOne(projectId);
      setRisk(r);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-electric-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-slate-300">{error}</p>
        <button onClick={load} className="mt-4 text-xs text-electric-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!risk) return null;

  const colors = RISK_COLORS[risk.riskLevel];
  const computedDate = new Date(risk.computedAt);

  return (
    <div className="space-y-4">
      {/* Top: Gauge + Level + Recalculate */}
      <div className="glass rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Gauge */}
          <div>
            <RiskGauge score={risk.overallScore} level={risk.riskLevel} />
          </div>

          {/* Level + Summary */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Risk Level</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.bg} ${colors.border}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
                <span className={`text-lg font-bold ${colors.text}`}>{RISK_LABELS[risk.riskLevel]} Risk</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Computed {computedDate.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="flex items-center gap-2 px-3 py-1.5 bg-electric-500/10 border border-electric-500/20 text-electric-400 rounded-lg text-xs font-medium hover:bg-electric-500/20 transition-colors disabled:opacity-50"
              >
                {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {recalculating ? "Recalculating..." : "Recalculate"}
              </button>
              <a
                href="/risk"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
              >
                View risk dashboard
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-electric-400" />
            Score Breakdown
          </h3>
          <span className="text-xs text-slate-500 font-mono">{risk.overallScore}/100</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <ScoreBar label="Anomaly Signals"   score={risk.anomalyScore}   max={40} color="bg-red-500" />
          <ScoreBar label="Financial Health"  score={risk.financialScore}  max={25} color="bg-amber-500" />
          <ScoreBar label="Citizen Reports"   score={risk.reportScore}     max={20} color="bg-blue-500" />
          <ScoreBar label="Timeline Status"   score={risk.timelineScore}   max={15} color="bg-purple-500" />
        </div>
      </div>

      {/* Risk Factors */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-electric-400" />
          Risk Factors ({risk.factors.length})
        </h3>
        {risk.factors.length === 0 ? (
          <div className="py-8 text-center">
            <ShieldAlert className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No risk factors detected — this project looks clean.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {risk.factors
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((f: RiskFactor, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-navy-800/40 border border-white/5"
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                      f.points > 0
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                    }`}
                  >
                    +{f.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{f.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.detail}</p>
                  </div>
                  {f.code.startsWith("ANOMALY") && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-1" />}
                  {f.code.startsWith("FINANCIAL") && <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-1" />}
                  {f.code.startsWith("REPORT") && <Users className="w-4 h-4 text-blue-400 shrink-0 mt-1" />}
                  {f.code.startsWith("TIMELINE") && <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-1" />}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Trust note */}
      <div className="glass rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400 border border-dashed border-slate-700">
        <ShieldAlert className="w-4 h-4 text-electric-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-300 font-medium mb-0.5">About this risk score</p>
          <p className="leading-relaxed">
            Combines anomaly signals, financial utilization, citizen reports, and timeline status
            into a single 0–100 indicator. Higher scores signal elevated risk and warrant review
            by an authorized officer — they indicate <em>risk</em>, not confirmed fraud.
          </p>
        </div>
      </div>
    </div>
  );
}
