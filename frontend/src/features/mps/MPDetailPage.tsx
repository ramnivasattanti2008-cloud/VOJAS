/**
 * VOJAS — MP Detail Page
 *
 * IBM Carbon–inspired light theme. Professional data-management layout.
 * No glassmorphism, no gradients, no glow effects, no decorative animations.
 * All data from real hooks (no fake numbers).
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
import { cn } from "@/lib/utils";

// ── Formatters ──────────────────────────────────────────────────────────────

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

// ── Shared Components ────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const barColor: Record<string, string> = {
    blue:  "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red:   "bg-red-500",
    slate: "bg-gray-400",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 hover:border-gray-300 transition-all">
      <div className={cn("h-0.5 rounded-t mb-2", barColor[accent])} aria-hidden />
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn("text-xs text-gray-700", mono ? "font-mono" : "")}>{value}</p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-semibold", accent)}>{value}</p>
    </div>
  );
}

function Sep() { return <div className="w-px h-7 bg-gray-200" />; }

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-lg font-semibold font-mono", color)}>{value}</p>
    </div>
  );
}

function Bar({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="text-gray-700">{label}</span>
        <span className="font-mono text-gray-500">{formatINR(amount)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

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
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate("/mps")}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to MPs</span>
      </button>

      {/* Hero header */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <div className="h-0.5 bg-blue-500 rounded-t mb-4" aria-hidden />
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600">
                {mp.party || "Independent"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500">
                {getHouseLabel(mp.house)} · {getTermLabel(mp.term)}
              </span>
              {satelliteData && satelliteData.activeConstruction > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-600 flex items-center gap-1">
                  <Satellite className="w-2.5 h-2.5" />
                  {satelliteData.activeConstruction} active sites
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900 leading-tight">{mp.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
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
                <span className="flex items-center gap-1 text-green-600">
                  <Activity className="w-3 h-3" />
                  {mp.attendance} attendance
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-right">
            <Stat label="Projects" value={String(totalProjects)} accent="text-blue-600" />
            <Sep />
            <Stat label="Approved" value={formatINR(totalApproved)} accent="text-gray-900" />
            <Sep />
            <Stat
              label="Spent"
              value={formatINR(totalSpent)}
              accent={totalSpent > totalApproved ? "text-red-600" : "text-amber-600"}
            />
            <Sep />
            <Stat
              label="Util %"
              value={`${utilization.toFixed(0)}%`}
              accent={utilization > 100 ? "text-red-600" : utilization > 80 ? "text-green-600" : "text-amber-600"}
            />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div role="tablist" className="flex items-center gap-1 overflow-x-auto px-1">
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
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                activeTab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
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

// ── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ mp, stats, totalProjects, satelliteData, weeklyData }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* MP Profile Card */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <div className="h-0.5 bg-blue-500 rounded-t mb-4" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
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
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Projects by Sector
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.bySector)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([sector, count]) => {
                  const pct = ((count as number) / totalProjects) * 100;
                  const sectorKey = sector as ProjectSector;
                  const colorClass = SECTOR_COLORS[sectorKey] ?? "bg-gray-100 text-gray-500";
                  return (
                    <div key={sector}>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="text-gray-700 capitalize">
                          {sector.toLowerCase().replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-500 font-mono">{count as number} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", colorClass.split(" ")[0]?.replace("/10", "/100") ?? "bg-blue-500")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent weekly snapshot */}
        {weeklyData?.series && (
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Last 4 Weeks Activity
            </h3>
            <div className="space-y-1.5">
              {weeklyData.series.slice(-4).reverse().map((w: any) => (
                <div key={w.weekStart} className="flex items-center justify-between text-[11px] py-1 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500 font-mono">Wk of {shortDate(w.weekStart)}</span>
                  <div className="flex items-center gap-3 text-[10px]">
                    {w.projectsCompleted > 0 && (
                      <span className="text-green-600">+ {w.projectsCompleted} done</span>
                    )}
                    {w.projectsStarted > 0 && (
                      <span className="text-blue-600">+ {w.projectsStarted} started</span>
                    )}
                    {w.expenditure > 0 && (
                      <span className="text-amber-600 font-mono">{formatINR(w.expenditure)}</span>
                    )}
                    {w.newAnomalies > 0 && (
                      <span className="text-red-600">{w.newAnomalies} issues</span>
                    )}
                    {w.newReports > 0 && (
                      <span className="text-gray-600">{w.newReports} reports</span>
                    )}
                    {w.projectsCompleted === 0 && w.projectsStarted === 0 && w.expenditure === 0 && w.newAnomalies === 0 && w.newReports === 0 && (
                      <span className="text-gray-400">no activity</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Satellite quick view */}
        {satelliteData && (
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="h-0.5 bg-cyan-500 rounded-t mb-3" aria-hidden />
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-cyan-600" />
              Satellite Overview
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Metric label="Active Sites" value={String(satelliteData.activeConstruction)} color="text-cyan-600" />
              <Metric label="Avg Score" value={`${satelliteData.avgDevelopmentScore}%`} color="text-blue-600" />
            </div>
            {Object.keys(satelliteData.byStatusLabel).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(satelliteData.byStatusLabel).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono text-gray-700">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {stats && (
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className={cn("h-0.5 rounded-t mb-3", stats.anomalyCount > 0 ? "bg-red-500" : "bg-green-500")} aria-hidden />
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              Anomalies Detected
            </h3>
            <p className={cn("text-2xl font-bold", stats.anomalyCount > 0 ? "text-red-600" : "text-green-600")}>
              {stats.anomalyCount}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">across {totalProjects} projects</p>
          </div>
        )}

        {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Status Breakdown
            </h3>
            <div className="space-y-1">
              {Object.entries(stats.byStatus)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count]) => {
                  const style = STATUS_COLORS[status as ProjectStatus];
                  return (
                    <div key={status} className="flex items-center justify-between text-[11px]">
                      <span className={cn("flex items-center gap-1.5", style?.text || "text-gray-500")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", style?.dot || "bg-gray-400")} />
                        {PROJECT_STATUSES.find((s) => s.value === (status as ProjectStatus))?.label ?? status}
                      </span>
                      <span className="font-mono text-gray-700">{count as number}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h3 className="text-xs font-semibold text-gray-900 mb-2.5">External Links</h3>
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
                className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-blue-600 transition-colors group py-1"
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

// ── Projects Tab (enhanced) ────────────────────────────────────────────────

function ProjectsTab({ projectsData, isLoading, page, onPageChange, onProjectClick }: any) {
  if (isLoading) return <LoadingState message="Loading projects..." />;
  const items = projectsData?.items ?? [];
  const totalPages = projectsData?.totalPages ?? 1;
  const total = projectsData?.total ?? 0;

  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
        <Briefcase className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-500">No projects found for this MP</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{total} projects</p>
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
            className="px-3 py-1.5 text-xs rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-xs rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
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
    score >= 80 ? "text-green-600" :
    score >= 50 ? "text-cyan-600" :
    score >= 20 ? "text-amber-600" : "text-gray-500";
  const isOverdue = project.expectedEndDate && project.status !== "COMPLETED" && project.status !== "VERIFIED" && new Date(project.expectedEndDate) < new Date();

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-md p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", style?.bg ?? "bg-gray-100", style?.text ?? "text-gray-600")}>
              <span className={cn("w-1 h-1 rounded-full", style?.dot ?? "bg-gray-400")} />
              {PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status}
            </span>
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded", sectorClass)}>
              {sectorLabel}
            </span>
            {isConstruction && (
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 flex items-center gap-1">
                <Hammer className="w-2.5 h-2.5" />
                Construction
              </span>
            )}
            {isOverdue && (
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {project.name}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">{project.district}, {project.state}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-blue-600 font-mono">{formatINR(approved)}</p>
          <p className={cn("text-[10px] font-mono", utilPct > 100 ? "text-red-600" : utilPct > 80 ? "text-green-600" : "text-amber-600")}>
            {utilPct}% util
          </p>
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-gray-500">Spent: <span className="text-gray-700 font-mono">{formatINR(spent)}</span></span>
          <span className="text-gray-500">Approved: <span className="text-gray-700 font-mono">{formatINR(approved)}</span></span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", utilPct > 100 ? "bg-red-500" : utilPct > 80 ? "bg-green-500" : "bg-amber-500")}
            style={{ width: `${Math.min(100, utilPct)}%` }}
          />
        </div>
      </div>

      {/* Works breakdown (compact) */}
      {project.works && project.works.length > 0 && (
        <div className="mb-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Hammer className="w-2.5 h-2.5 text-orange-600" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-orange-600">Works</span>
            <WorksBreakdown works={project.works} variant="compact" className="ml-1" />
          </div>
        </div>
      )}

      {/* Footer: timeline + satellite + risk indicators */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
        {project.startDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {shortDate(project.startDate)} – {project.completedAt ? shortDate(project.completedAt) : shortDate(project.expectedEndDate) || "—"}
          </span>
        )}
        {project.satellite?.hasCoordinates && (
          <span className={cn("flex items-center gap-1", scoreColor)}>
            <Satellite className="w-2.5 h-2.5" />
            {project.satellite.statusLabel} · {score}%
          </span>
        )}
        {project.anomalyCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="w-2.5 h-2.5" />
            {project.anomalyCount} {project.criticalAnomalies > 0 && <span className="font-semibold">({project.criticalAnomalies} critical)</span>}
          </span>
        )}
        {project.risk?.overallScore > 50 && (
          <span className="flex items-center gap-1 text-red-600">
            <ShieldAlert className="w-2.5 h-2.5" />
            Risk {project.risk.overallScore}
          </span>
        )}
        {project.expenditureSummary?.count > 0 && (
          <span className="flex items-center gap-1 text-gray-500">
            <IndianRupee className="w-2.5 h-2.5" />
            {project.expenditureSummary.count} txns
          </span>
        )}
        {project.documentSummary?.total > 0 && (
          <span className="flex items-center gap-1 text-gray-500">
            <FileText className="w-2.5 h-2.5" />
            {project.documentSummary.total} docs
          </span>
        )}
      </div>
    </button>
  );
}

// ── Weekly Progress Tab ─────────────────────────────────────────────────────

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
        <KpiCard label="Total Expenditure" value={formatINR(summary.totalExpenditure)} sub={`${weeklyData.weeks} weeks`} accent="green" />
        <KpiCard label="Projects Completed" value={String(summary.totalCompleted)} sub={`across ${weeklyData.weeks} weeks`} accent="blue" />
        <KpiCard label="Projects Started" value={String(summary.totalStarted)} sub={`across ${weeklyData.weeks} weeks`} accent="amber" />
        <KpiCard label="Anomalies" value={String(summary.totalAnomalies)} sub="total flagged" accent={summary.totalAnomalies > 0 ? "red" : "green"} />
      </div>

      {/* Expenditure bar chart */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <div className="h-0.5 bg-green-500 rounded-t mb-4" aria-hidden />
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-green-600" />
          Weekly Expenditure
        </h3>
        <div className="flex items-end gap-1 h-32">
          {series.map((w: any, i: number) => {
            const heightPct = maxExp > 0 ? (w.expenditure / maxExp) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                <div className="text-[9px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatINR(w.expenditure)}
                </div>
                <div
                  className="w-full bg-green-500 rounded-t transition-all group-hover:bg-green-600"
                  style={{ height: `${Math.max(2, heightPct)}%` }}
                />
                <div className="text-[8px] text-gray-500 font-mono">{shortDate(w.weekStart)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Projects completed bar chart */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <div className="h-0.5 bg-green-500 rounded-t mb-3" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Projects Completed per Week
          </h3>
          <div className="flex items-end gap-1 h-24">
            {series.map((w: any, i: number) => {
              const h = maxCompleted > 0 ? (w.projectsCompleted / maxCompleted) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[9px] font-mono text-green-600">{w.projectsCompleted || ""}</div>
                  <div className="w-full bg-green-500 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomalies bar chart */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <div className="h-0.5 bg-red-500 rounded-t mb-3" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Anomalies per Week
          </h3>
          <div className="flex items-end gap-1 h-24">
            {series.map((w: any, i: number) => {
              const h = maxAnomalies > 0 ? (w.newAnomalies / maxAnomalies) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[9px] font-mono text-red-600">{w.newAnomalies || ""}</div>
                  <div className="w-full bg-red-500 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly table */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Weekly Summary Table
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-100">
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
                <tr key={w.weekStart} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-gray-700">{fmtDate(w.weekStart)}</td>
                  <td className="text-right py-2 px-2 font-mono text-blue-600">{w.projectsStarted || "—"}</td>
                  <td className="text-right py-2 px-2 font-mono text-green-600">{w.projectsCompleted || "—"}</td>
                  <td className="text-right py-2 px-2 font-mono text-amber-600">{formatINR(w.expenditure)}</td>
                  <td className="text-right py-2 px-2 font-mono text-gray-600">{w.newReports || "—"}</td>
                  <td className="text-right py-2 pl-2 font-mono">
                    {w.newAnomalies > 0 ? (
                      <span className={w.criticalAnomalies > 0 ? "text-red-600" : "text-orange-600"}>
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

// ── Satellite Tab ────────────────────────────────────────────────────────────

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
        <KpiCard label="Total Projects" value={String(totalProjects)} sub="tracked" accent="blue" />
        <KpiCard label="Geocoded" value={String(withCoordinates)} sub="with coordinates" accent="slate" />
        <KpiCard label="Active Sites" value={String(activeConstruction)} sub="under construction" accent="amber" />
        <KpiCard label="Completed" value={String(completed)} sub="near or done" accent="green" />
        <KpiCard label="Avg Score" value={`${avgDevelopmentScore}%`} sub="development" accent="amber" />
      </div>

      {/* Status label distribution */}
      {Object.keys(byStatusLabel).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <div className="h-0.5 bg-cyan-500 rounded-t mb-3" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-600" />
            Status Distribution (from satellite imagery)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(byStatusLabel).map(([label, count]) => {
              const total = Object.values(byStatusLabel).reduce((s: number, c: any) => s + c, 0) as number;
              const pct = total > 0 ? (Number(count) / total) * 100 : 0;
              return (
                <div key={label} className="bg-gray-50 rounded p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-lg font-semibold font-mono text-gray-900">{count as number}</p>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1.5">
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
            className={cn(
              "px-3 py-1.5 text-[11px] rounded border transition-colors",
              filter === key
                ? "border-blue-300 bg-blue-50 text-blue-600"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Top projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white border border-gray-200 rounded-md p-8 text-center text-gray-500 text-sm">
            <Satellite className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            No projects match this filter
          </div>
        ) : (
          filtered.map((p: any) => {
            const score = p.score ?? 0;
            const scoreColor =
              score >= 80 ? "bg-green-500 text-green-600" :
              score >= 50 ? "bg-cyan-500 text-cyan-600" :
              score >= 20 ? "bg-amber-500 text-amber-600" : "bg-gray-500 text-gray-600";
            const scoreBg = scoreColor.split(" ")[0];
            const scoreText = scoreColor.split(" ")[1];
            return (
              <button
                key={p.id}
                onClick={() => onProjectClick(p.id)}
                className="bg-white border border-gray-200 rounded-md p-4 hover:border-cyan-300 hover:shadow-sm transition-all text-left group"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={cn("w-12 h-12 rounded-lg border flex items-center justify-center shrink-0", scoreBg + "/10", scoreBg + "/20")}>
                    <span className={cn("text-sm font-bold font-mono", scoreText)}>{score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 group-hover:text-cyan-600 transition-colors line-clamp-2 leading-snug">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">{p.district}, {p.state}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-gray-500">{p.statusLabel}</span>
                  <span className="text-gray-700 font-mono">{formatINR(p.approvedAmount)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", scoreBg)} style={{ width: `${score}%` }} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── MPLADS Spending Panel ────────────────────────────────────────────────────

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
        <KpiCard label="Entitlement" value={formatINR(entINR)} sub="GOI allocation" accent="blue" />
        <KpiCard label="Received" value={formatINR(recINR)} sub="From Govt of India" accent="slate" />
        <KpiCard label="Works Cost" value={formatINR(worksINR)} sub="Sanctioned works" accent="amber" />
        <KpiCard label="Actual Spent" value={formatINR(expINR)} sub="Real expenditure" accent="green" />
      </div>

      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-md p-5">
        <div className="h-0.5 bg-blue-500 rounded-t mb-3" aria-hidden />
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Utilization Performance
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-600">Utilization over Release</span>
              <span className={cn("font-mono font-semibold", mpladUtil > 100 ? "text-red-600" : mpladUtil > 80 ? "text-green-600" : "text-amber-600")}>
                {mpladUtil.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", mpladUtil > 100 ? "bg-red-500" : mpladUtil > 80 ? "bg-green-500" : "bg-amber-500")}
                style={{ width: `${Math.min(100, mpladUtil)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 space-y-2 border-t border-gray-100">
            <Bar label="Entitlement" amount={entINR} max={entINR} color="bg-blue-500" />
            <Bar label="Received" amount={recINR} max={entINR} color="bg-gray-400" />
            <Bar label="Works Cost" amount={worksINR} max={entINR} color="bg-amber-500" />
            <Bar label="Actual Spent" amount={expINR} max={entINR} color="bg-green-500" />
            <Bar label="Unspent" amount={unspentINR} max={entINR} color="bg-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-5">
        <div className="h-0.5 bg-blue-500 rounded-t mb-3" aria-hidden />
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
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
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-500">
              Government figures: {mpladExp.toFixed(2)} Cr actual expenditure
            </p>
            <p className="text-[10px] text-gray-500">
              VOJAS tracked: {formatINR(totalSpent)}
            </p>
            <p className="text-[10px] text-gray-600 mt-1 italic">
              Differences are normal — VOJAS tracks project-level disbursements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
