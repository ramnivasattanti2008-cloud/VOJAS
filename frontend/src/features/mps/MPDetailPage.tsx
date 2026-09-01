/**
 * VOJAS — MP Detail Page
 *
 * Shows complete MP profile + all their projects + analytics.
 * Tabs: Overview, Projects (enhanced), MPLADS Spending, Weekly Progress, Satellite
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  IndianRupee,
  Activity,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  FileText,
  Briefcase,
  BarChart3,
  Satellite,
  Hammer,
  CalendarDays,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  useMPDetail,
  useMPStats,
  useMPProjectsEnhanced,
  useMPWeeklyActivity,
  useMPSatelliteSummary,
} from "@/hooks/useMPs";
import { LoadingState, ErrorState } from "@/components/ui";
import {
  type ProjectStatus,
  type ProjectSector,
  PROJECT_STATUSES,
  STATUS_COLORS,
  SECTOR_COLORS,
  PROJECT_SECTORS,
  getTermLabel,
  getHouseLabel,
} from "@/types";
import WorksBreakdown from "@/features/projects/WorksBreakdown";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(3)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function shortDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

type Tab = "overview" | "projects" | "spending" | "weekly" | "satellite";

const CONSTRUCTION_SECTORS: ProjectSector[] = [
  "PUBLIC_INFRASTRUCTURE", "HOUSING", "WATER_SANITATION", "HEALTH",
  "EDUCATION", "TRANSPORT", "ENERGY",
];

export default function MPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleProjectClick = (projectId: string) => navigate(`/projects/${projectId}`);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [projectPage, setProjectPage] = useState(1);

  const mpQuery = useMPDetail(id);
  const statsQuery = useMPStats(id);
  const projectsEnhancedQuery = useMPProjectsEnhanced(id, projectPage, 20);
  const weeklyQuery = useMPWeeklyActivity(id, 12);
  const satelliteQuery = useMPSatelliteSummary(id);

  const mp = mpQuery.data;
  const stats = statsQuery.data;
  const projectsData = projectsEnhancedQuery.data;
  const weeklyData = weeklyQuery.data;
  const satelliteData = satelliteQuery.data;
  const loading = mpQuery.isLoading;
  const error = mpQuery.error?.message ?? null;

  if (loading) return <LoadingState message="Loading MP profile..." />;
  if (error || !mp) return <ErrorState message={error || "MP not found"} onRetry={() => mpQuery.refetch()} />;

  const totalProjects = stats?.totalProjects ?? mp.projects?.length ?? 0;
  const totalApproved = stats?.totalApproved ?? 0;
  const totalSpent = stats?.totalSpent ?? 0;
  const utilization = totalApproved > 0 ? (totalSpent / totalApproved) * 100 : 0;

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Back button */}
      <button
        onClick={() => navigate("/mps")}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>MPs</span>
      </button>

      {/* Hero header */}
      <div className="glass rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-electric-500/20 to-blue-700/20 border border-electric-500/30 flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-electric-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-electric-500/30 bg-electric-500/10 text-electric-400">
                {mp.party || "Independent"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400">
                {getHouseLabel(mp.house)} · {getTermLabel(mp.term)}
              </span>
              {satelliteData && satelliteData.activeConstruction > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 flex items-center gap-1">
                  <Satellite className="w-2.5 h-2.5" />
                  {satelliteData.activeConstruction} active sites
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white leading-tight">{mp.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {mp.constituency}, {mp.state}
              </span>
              {mp.termStart && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {fmtDate(mp.termStart)} – {mp.termEnd ? fmtDate(mp.termEnd) : "Incumbent"}
                </span>
              )}
              {mp.attendance && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Activity className="w-3 h-3" />
                  {mp.attendance} attendance
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-right">
            <Stat label="Projects" value={String(totalProjects)} accent="text-electric-400" />
            <Sep />
            <Stat label="Approved" value={formatINR(totalApproved)} accent="text-white" />
            <Sep />
            <Stat
              label="Spent"
              value={formatINR(totalSpent)}
              accent={totalSpent > totalApproved ? "text-red-400" : "text-saffron-400"}
            />
            <Sep />
            <Stat
              label="Util %"
              value={`${utilization.toFixed(0)}%`}
              accent={utilization > 100 ? "text-red-400" : utilization > 80 ? "text-emerald-400" : "text-saffron-400"}
            />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-5 px-4 md:px-5 bg-navy-950/80 backdrop-blur-xl border-b border-white/5">
        <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: User },
            { key: "projects", label: `Projects (${totalProjects})`, icon: Briefcase },
            { key: "weekly", label: "Weekly Progress", icon: CalendarDays },
            { key: "satellite", label: "Satellite", icon: Satellite },
            { key: "spending", label: "MPLADS Spending", icon: IndianRupee },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all shrink-0 ${
                activeTab === key
                  ? "border-electric-500 text-electric-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {activeTab === "overview" && (
          <OverviewTab
            mp={mp}
            stats={stats}
            totalProjects={totalProjects}
            satelliteData={satelliteData}
            weeklyData={weeklyData}
          />
        )}

        {activeTab === "projects" && (
          <ProjectsTab
            projectsData={projectsData}
            isLoading={projectsEnhancedQuery.isLoading}
            page={projectPage}
            onPageChange={setProjectPage}
            onProjectClick={handleProjectClick}
          />
        )}

        {activeTab === "weekly" && (
          <WeeklyProgressTab weeklyData={weeklyData} isLoading={weeklyQuery.isLoading} />
        )}

        {activeTab === "satellite" && (
          <SatelliteTab
            satelliteData={satelliteData}
            isLoading={satelliteQuery.isLoading}
            onProjectClick={handleProjectClick}
          />
        )}

        {activeTab === "spending" && (
          <MPLADSSpending mp={mp} totalApproved={totalApproved} totalSpent={totalSpent} />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────

function OverviewTab({ mp, stats, totalProjects, satelliteData, weeklyData }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-electric-400" />
            MP Profile
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <Field label="Full Name" value={mp.name} />
            <Field label="Party" value={mp.party} />
            <Field label="House" value={getHouseLabel(mp.house)} />
            <Field label="Term" value={getTermLabel(mp.term)} />
            <Field label="Constituency" value={mp.constituency} />
            <Field label="State" value={mp.state} />
            <Field label="Term Start" value={fmtDate(mp.termStart)} />
            <Field label="Term End" value={fmtDate(mp.termEnd)} />
            <Field label="Attendance" value={mp.attendance || "—"} />
            {mp.lgdCode && <Field label="LGD Code" value={mp.lgdCode} mono />}
          </div>
        </div>

        {/* Sector breakdown */}
        {stats?.bySector && Object.keys(stats.bySector).length > 0 && (
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-electric-400" />
              Projects by Sector
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.bySector)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([sector, count]) => {
                  const pct = ((count as number) / totalProjects) * 100;
                  const sectorKey = sector as ProjectSector;
                  const colorClass = SECTOR_COLORS[sectorKey] ?? "bg-slate-500/10 text-slate-400";
                  return (
                    <div key={sector}>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="text-slate-300 capitalize">
                          {sector.toLowerCase().replace(/_/g, " ")}
                        </span>
                        <span className="text-slate-500 font-mono">{count as number} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${colorClass.split(" ")[0]?.replace("/10", "") ?? "bg-electric-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent weekly snapshot */}
        {weeklyData?.series && (
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-electric-400" />
              Last 4 Weeks Activity
            </h3>
            <div className="space-y-1.5">
              {weeklyData.series.slice(-4).reverse().map((w: any) => (
                <div key={w.weekStart} className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.03] last:border-0">
                  <span className="text-slate-400 font-mono">Wk of {shortDate(w.weekStart)}</span>
                  <div className="flex items-center gap-3 text-[10px]">
                    {w.projectsCompleted > 0 && (
                      <span className="text-emerald-400">✓ {w.projectsCompleted} done</span>
                    )}
                    {w.projectsStarted > 0 && (
                      <span className="text-electric-400">▶ {w.projectsStarted} started</span>
                    )}
                    {w.expenditure > 0 && (
                      <span className="text-saffron-400 font-mono">{formatINR(w.expenditure)}</span>
                    )}
                    {w.newAnomalies > 0 && (
                      <span className="text-red-400">⚠ {w.newAnomalies}</span>
                    )}
                    {w.newReports > 0 && (
                      <span className="text-blue-400">📋 {w.newReports}</span>
                    )}
                    {w.projectsCompleted === 0 && w.projectsStarted === 0 && w.expenditure === 0 && w.newAnomalies === 0 && w.newReports === 0 && (
                      <span className="text-slate-600">no activity</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Satellite quick view */}
        {satelliteData && (
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              Satellite Overview
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Metric label="Active Sites" value={String(satelliteData.activeConstruction)} color="text-cyan-400" />
              <Metric label="Avg Score" value={`${satelliteData.avgDevelopmentScore}%`} color="text-electric-400" />
            </div>
            {Object.keys(satelliteData.byStatusLabel).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(satelliteData.byStatusLabel).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-mono text-slate-300">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {stats && (
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              Anomalies Detected
            </h3>
            <p className={`text-2xl font-bold ${stats.anomalyCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {stats.anomalyCount}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">across {totalProjects} projects</p>
          </div>
        )}

        {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-electric-400" />
              Status Breakdown
            </h3>
            <div className="space-y-1">
              {Object.entries(stats.byStatus)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count]) => {
                  const style = STATUS_COLORS[status as ProjectStatus];
                  return (
                    <div key={status} className="flex items-center justify-between text-[11px]">
                      <span className={`flex items-center gap-1.5 ${style?.text || "text-slate-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style?.dot || "bg-slate-500"}`} />
                        {PROJECT_STATUSES.find((s) => s.value === (status as ProjectStatus))?.label ?? status}
                      </span>
                      <span className="font-mono text-slate-300">{count as number}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-2.5">External Links</h3>
          <div className="space-y-1">
            {[
              { label: "PRS Legislative", url: `https://prsindia.org/mptrack/${mp.id}` },
              { label: "Lok Sabha Profile", url: "https://loksabha.nic.in/Members.html" },
              { label: "MPLADS Portal", url: "https://www.mplads.gov.in/" },
            ].map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-electric-400 transition-colors group py-1"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Projects Tab (enhanced) ──────────────────────────────────────────────

function ProjectsTab({ projectsData, isLoading, page, onPageChange, onProjectClick }: any) {
  if (isLoading) return <LoadingState message="Loading projects..." />;
  const items = projectsData?.items ?? [];
  const totalPages = projectsData?.totalPages ?? 1;
  const total = projectsData?.total ?? 0;

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Briefcase className="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <p className="text-sm text-slate-400">No projects found for this MP</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{total} projects</p>
      <div className="space-y-1.5">
        {items.map((p: any) => (
          <ProjectCard key={p.id} project={p} onClick={() => onProjectClick(p.id)} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 text-xs rounded border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-xs rounded border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: any; onClick: () => void }) {
  const style = STATUS_COLORS[project.status as ProjectStatus];
  const sectorKey = project.sector as ProjectSector;
  const sectorClass = SECTOR_COLORS[sectorKey] ?? "";
  const sectorLabel = PROJECT_SECTORS.find((s) => s.value === sectorKey)?.label ?? project.sector;
  const approved = project.approvedAmount ?? 0;
  const spent = project.spentAmount ?? 0;
  const utilPct = approved > 0 ? Math.min(150, Math.round((spent / approved) * 100)) : 0;
  const isConstruction = CONSTRUCTION_SECTORS.includes(sectorKey);
  const score = project.satellite?.score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-400" :
    score >= 50 ? "text-cyan-400" :
    score >= 20 ? "text-saffron-400" : "text-slate-500";
  const isOverdue = project.expectedEndDate && project.status !== "COMPLETED" && project.status !== "VERIFIED" && new Date(project.expectedEndDate) < new Date();

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass rounded-xl p-4 border border-white/5 hover:border-electric-500/30 transition-all group"
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style?.bg} ${style?.text}`}>
              <span className={`w-1 h-1 rounded-full ${style?.dot}`} />
              {PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${sectorClass}`}>
              {sectorLabel}
            </span>
            {isConstruction && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 flex items-center gap-1">
                <Hammer className="w-2.5 h-2.5" />
                Construction
              </span>
            )}
            {isOverdue && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-200 group-hover:text-electric-400 transition-colors line-clamp-2 leading-snug">
            {project.name}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{project.district}, {project.state}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-electric-400 font-mono">{formatINR(approved)}</p>
          <p className={`text-[10px] font-mono ${utilPct > 100 ? "text-red-400" : utilPct > 80 ? "text-emerald-400" : "text-saffron-400"}`}>
            {utilPct}% util
          </p>
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-500">Spent: <span className="text-slate-300 font-mono">{formatINR(spent)}</span></span>
          <span className="text-slate-500">Approved: <span className="text-slate-300 font-mono">{formatINR(approved)}</span></span>
        </div>
        <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              utilPct > 100 ? "bg-red-500" : utilPct > 80 ? "bg-emerald-500" : "bg-saffron-500"
            }`}
            style={{ width: `${Math.min(100, utilPct)}%` }}
          />
        </div>
      </div>

      {/* Works breakdown (compact) */}
      {project.works && project.works.length > 0 && (
        <div className="mb-2 pb-2 border-b border-white/[0.03]">
          <div className="flex items-center gap-2 mb-1.5">
            <Hammer className="w-2.5 h-2.5 text-orange-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400">Works</span>
            <WorksBreakdown works={project.works} variant="compact" className="ml-1" />
          </div>
        </div>
      )}

      {/* Footer: timeline + satellite + risk indicators */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
        {project.startDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {shortDate(project.startDate)} – {project.completedAt ? shortDate(project.completedAt) : shortDate(project.expectedEndDate) || "—"}
          </span>
        )}
        {project.satellite?.hasCoordinates && (
          <span className={`flex items-center gap-1 ${scoreColor}`}>
            <Satellite className="w-2.5 h-2.5" />
            {project.satellite.statusLabel} · {score}%
          </span>
        )}
        {project.anomalyCount > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle className="w-2.5 h-2.5" />
            {project.anomalyCount} {project.criticalAnomalies > 0 && <span className="font-bold">({project.criticalAnomalies} critical)</span>}
          </span>
        )}
        {project.risk?.overallScore > 50 && (
          <span className="flex items-center gap-1 text-red-400">
            <ShieldAlert className="w-2.5 h-2.5" />
            Risk {project.risk.overallScore}
          </span>
        )}
        {project.expenditureSummary?.count > 0 && (
          <span className="flex items-center gap-1 text-slate-500">
            <IndianRupee className="w-2.5 h-2.5" />
            {project.expenditureSummary.count} txns
          </span>
        )}
        {project.documentSummary?.total > 0 && (
          <span className="flex items-center gap-1 text-slate-500">
            <FileText className="w-2.5 h-2.5" />
            {project.documentSummary.total} docs
          </span>
        )}
      </div>
    </button>
  );
}

// ── Weekly Progress Tab ──────────────────────────────────────────────────

function WeeklyProgressTab({ weeklyData, isLoading }: any) {
  if (isLoading) return <LoadingState message="Computing weekly activity..." />;
  if (!weeklyData) return <ErrorState message="No weekly data available" />;

  const { series, summary } = weeklyData;
  const maxExp = Math.max(...series.map((w: any) => w.expenditure), 1);
  const maxCompleted = Math.max(...series.map((w: any) => w.projectsCompleted), 1);
  const maxAnomalies = Math.max(...series.map((w: any) => w.newAnomalies), 1);

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Expenditure" value={formatINR(summary.totalExpenditure)} sub={`${weeklyData.weeks} weeks`} accent="text-emerald-400" />
        <KPI label="Projects Completed" value={String(summary.totalCompleted)} sub={`across ${weeklyData.weeks} weeks`} accent="text-electric-400" />
        <KPI label="Projects Started" value={String(summary.totalStarted)} sub={`across ${weeklyData.weeks} weeks`} accent="text-saffron-400" />
        <KPI label="Anomalies" value={String(summary.totalAnomalies)} sub={`total flagged`} accent={summary.totalAnomalies > 0 ? "text-red-400" : "text-emerald-400"} />
      </div>

      {/* Expenditure bar chart */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-emerald-400" />
          Weekly Expenditure
        </h3>
        <div className="flex items-end gap-1 h-32">
          {series.map((w: any, i: number) => {
            const heightPct = maxExp > 0 ? (w.expenditure / maxExp) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                <div className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatINR(w.expenditure)}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-emerald-500/40 to-emerald-400 rounded-t transition-all group-hover:from-emerald-500/60 group-hover:to-emerald-300"
                  style={{ height: `${Math.max(2, heightPct)}%` }}
                />
                <div className="text-[8px] text-slate-500 font-mono">{shortDate(w.weekStart)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Projects completed bar chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Projects Completed per Week
          </h3>
          <div className="flex items-end gap-1 h-24">
            {series.map((w: any, i: number) => {
              const h = maxCompleted > 0 ? (w.projectsCompleted / maxCompleted) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[9px] font-mono text-emerald-400">{w.projectsCompleted || ""}</div>
                  <div className="w-full bg-emerald-500/50 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomalies bar chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Anomalies per Week
          </h3>
          <div className="flex items-end gap-1 h-24">
            {series.map((w: any, i: number) => {
              const h = maxAnomalies > 0 ? (w.newAnomalies / maxAnomalies) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[9px] font-mono text-red-400">{w.newAnomalies || ""}</div>
                  <div className="w-full bg-red-500/50 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly table */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-electric-400" />
          Weekly Summary Table
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                <th className="text-left py-2 pr-3">Week</th>
                <th className="text-right py-2 px-2">Started</th>
                <th className="text-right py-2 px-2">Completed</th>
                <th className="text-right py-2 px-2">Expenditure</th>
                <th className="text-right py-2 px-2">Reports</th>
                <th className="text-right py-2 pl-2">Anomalies</th>
              </tr>
            </thead>
            <tbody>
              {series.map((w: any) => (
                <tr key={w.weekStart} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 pr-3 font-mono text-slate-300">{fmtDate(w.weekStart)}</td>
                  <td className="text-right py-2 px-2 font-mono text-electric-400">{w.projectsStarted || "—"}</td>
                  <td className="text-right py-2 px-2 font-mono text-emerald-400">{w.projectsCompleted || "—"}</td>
                  <td className="text-right py-2 px-2 font-mono text-saffron-400">{formatINR(w.expenditure)}</td>
                  <td className="text-right py-2 px-2 font-mono text-blue-400">{w.newReports || "—"}</td>
                  <td className="text-right py-2 pl-2 font-mono">
                    {w.newAnomalies > 0 ? (
                      <span className={w.criticalAnomalies > 0 ? "text-red-400" : "text-orange-400"}>
                        {w.newAnomalies} {w.criticalAnomalies > 0 && `(${w.criticalAnomalies} crit)`}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Satellite Tab ────────────────────────────────────────────────────────

function SatelliteTab({ satelliteData, isLoading, onProjectClick }: any) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  if (isLoading) return <LoadingState message="Loading satellite data..." />;
  if (!satelliteData) return <ErrorState message="No satellite data available" />;

  const { topProjectsByDevelopment, byStatusLabel, totalProjects, withCoordinates, activeConstruction, completed, avgDevelopmentScore } = satelliteData;

  let filtered = topProjectsByDevelopment;
  if (filter === "active") {
    filtered = topProjectsByDevelopment.filter((p: any) => p.score > 10 && p.score < 95);
  } else if (filter === "completed") {
    filtered = topProjectsByDevelopment.filter((p: any) => p.score >= 95);
  }

  return (
    <div className="space-y-4">
      {/* Satellite KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Total Projects" value={String(totalProjects)} sub="tracked" accent="text-electric-400" />
        <KPI label="Geocoded" value={String(withCoordinates)} sub="with coordinates" accent="text-cyan-400" />
        <KPI label="Active Sites" value={String(activeConstruction)} sub="under construction" accent="text-orange-400" />
        <KPI label="Completed" value={String(completed)} sub="near or done" accent="text-emerald-400" />
        <KPI label="Avg Score" value={`${avgDevelopmentScore}%`} sub="development" accent="text-saffron-400" />
      </div>

      {/* Status label distribution */}
      {Object.keys(byStatusLabel).length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Status Distribution (from satellite imagery)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(byStatusLabel).map(([label, count]) => {
              const total = Object.values(byStatusLabel).reduce((s: number, c: any) => s + c, 0) as number;
              const pct = total > 0 ? (Number(count) / total) * 100 : 0;
              return (
                <div key={label} className="bg-navy-900/40 rounded-lg p-3 border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-lg font-bold font-mono text-white">{count as number}</p>
                  <div className="h-1 bg-navy-800 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {[
          { key: "all", label: "Top 5" },
          { key: "active", label: "Active Construction" },
          { key: "completed", label: "Completed" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-3 py-1.5 text-[11px] rounded border transition-colors ${
              filter === key
                ? "border-electric-500/40 bg-electric-500/15 text-electric-400"
                : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Top projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-2 glass rounded-xl p-8 text-center text-slate-500 text-sm">
            <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No projects match this filter
          </div>
        ) : (
          filtered.map((p: any) => {
            const score = p.score ?? 0;
            const scoreColor =
              score >= 80 ? "bg-emerald-500" :
              score >= 50 ? "bg-cyan-500" :
              score >= 20 ? "bg-saffron-500" : "bg-slate-500";
            return (
              <button
                key={p.id}
                onClick={() => onProjectClick(p.id)}
                className="glass rounded-xl p-4 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-lg ${scoreColor}/20 border ${scoreColor}/30 flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-bold font-mono ${scoreColor.replace("bg-", "text-")}`}>{score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{p.district}, {p.state}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-slate-500">{p.statusLabel}</span>
                  <span className="text-slate-400 font-mono">{formatINR(p.approvedAmount)}</span>
                </div>
                <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                  <div className={`h-full ${scoreColor} rounded-full transition-all`} style={{ width: `${score}%` }} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── MPLADS Spending Panel (unchanged) ──────────────────────────────────────

function MPLADSSpending({ mp, totalApproved, totalSpent }: { mp: any; totalApproved: number; totalSpent: number }) {
  const mpladExp = mp.mpladExpenditure ?? 0;
  const mpladEnt = mp.mpladEntitlement ?? 0;
  const mpladRec = mp.mpladFundReceived ?? 0;
  const mpladWorks = mp.mpladWorksCost ?? 0;
  const mpladUtil = mp.mpladUtilization ?? 0;
  const mpladUnspent = mp.mpladUnspentBalance ?? 0;

  const expINR = mpladExp * 1_00_00_000;
  const entINR = mpladEnt * 1_00_00_000;
  const recINR = mpladRec * 1_00_00_000;
  const worksINR = mpladWorks * 1_00_00_000;
  const unspentINR = mpladUnspent * 1_00_00_000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Entitlement" value={formatINR(entINR)} sub="GOI allocation" accent="text-electric-400" />
        <KPI label="Received" value={formatINR(recINR)} sub="From Govt of India" accent="text-blue-400" />
        <KPI label="Works Cost" value={formatINR(worksINR)} sub="Sanctioned works" accent="text-saffron-400" />
        <KPI label="Actual Spent" value={formatINR(expINR)} sub="Real expenditure" accent="text-emerald-400" />
      </div>

      <div className="lg:col-span-2 glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-electric-400" />
          Utilization Performance
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Utilization over Release</span>
              <span className={`font-mono font-bold ${mpladUtil > 100 ? "text-red-400" : mpladUtil > 80 ? "text-emerald-400" : "text-saffron-400"}`}>
                {mpladUtil.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  mpladUtil > 100 ? "bg-red-500" :
                  mpladUtil > 80 ? "bg-emerald-500" :
                  "bg-saffron-500"
                }`}
                style={{ width: `${Math.min(100, mpladUtil)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 space-y-2 border-t border-white/5">
            <Bar label="Entitlement" amount={entINR} max={entINR} color="bg-electric-500" />
            <Bar label="Received" amount={recINR} max={entINR} color="bg-blue-500" />
            <Bar label="Works Cost" amount={worksINR} max={entINR} color="bg-saffron-500" />
            <Bar label="Actual Spent" amount={expINR} max={entINR} color="bg-emerald-500" />
            <Bar label="Unspent" amount={unspentINR} max={entINR} color="bg-red-500" />
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-electric-400" />
          VOJAS Project Records
        </h3>
        <div className="space-y-2">
          <Field label="Projects Recorded" value={String(mp.projects?.length ?? "—")} />
          <Field label="Total Approved" value={formatINR(totalApproved)} />
          <Field label="Total Spent (VOJAS)" value={formatINR(totalSpent)} />
          {totalApproved > 0 && (
            <Field
              label="VOJAS Utilization"
              value={`${((totalSpent / totalApproved) * 100).toFixed(0)}%`}
            />
          )}
        </div>
        {mpladExp > 0 && totalSpent > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[10px] text-slate-500">
              Government figures: ₹{mpladExp.toFixed(2)} Cr actual expenditure
            </p>
            <p className="text-[10px] text-slate-500">
              VOJAS tracked: {formatINR(totalSpent)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              Differences are normal — VOJAS tracks project-level disbursements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}
function Sep() { return <div className="w-px h-7 bg-white/10" />; }
function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${accent}`}>{value}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </div>
  );
}
function Bar({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400">{formatINR(amount)}</span>
      </div>
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
