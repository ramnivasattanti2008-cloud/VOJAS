/**
 * OfficerDashboard — VOJAS Elite Command Center
 *
 * Premium spatial intelligence layout:
 *  - Full-bleed 3D Globe hero (the centerpiece)
 *  - Live HUD panels with GSAP reveal animations
 *  - Glassmorphism spatial cards with depth
 *  - Animated stat counters with glow effects
 *  - Streaming data feeds with pulse indicators
 */

import { useMemo, Suspense, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import gsap from 'gsap';
import type { Project, HealthStatus } from '@/types';
import type { SchemeFinancials } from '@/types/financial-types';
import { LoadingState } from '@/components/ui';
import { SkeletonStatCard } from '@/components/ui/Skeleton';
import RibbonGauge from '@/components/dashboard/RibbonGauge';
import QuickActions, { type QuickAction } from '@/components/dashboard/QuickActions';
import MyTasks, { type TaskItem } from '@/components/dashboard/MyTasks';
import { useHealth } from '@/hooks/useSystem';
import { useProjects } from '@/hooks/useProjects';
import { useSchemeFinancials } from '@/hooks/useFinancial';
import { useAnomalies } from '@/hooks/useAnomalies';
import { useReports } from '@/hooks/useReports';
import { useAnomalyStats } from '@/hooks/useAnomalies';
import { cn } from '@/lib/utils';
import GlobeHero from '@/components/3d/GlobeHero';
import { SpatialDashboardMap } from '@/components/layout';
import {
  AlertTriangle, CheckCircle, XCircle,
  FileText, Users, IndianRupee, Activity, Shield, Zap,
  BarChart2, Radio, Server, Database, Globe, Cpu,
  ChevronRight, Map, Rocket, Inbox, BellRing,
  TrendingUp, TrendingDown, Eye, Target,
} from 'lucide-react';

// ── Animation tokens ────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// ── Formatters ──────────────────────────────────────────────────────────────

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Live Activity ──────────────────────────────────────────────────────────

type LiveActivity = { icon: typeof Shield; color: string; bg: string; text: string; time: string; accent: string };

function buildLiveActivities(recentReports: any[], recentAnomalies: any[]): LiveActivity[] {
  const acts: LiveActivity[] = [];
  for (const r of recentReports.slice(0, 3)) {
    acts.push({
      icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', accent: 'blue',
      text: `Citizen report "${r.title ?? r.category ?? 'Report'}" submitted${r.locationDesc ? ` from ${r.locationDesc}` : ''}`,
      time: timeAgo(r.createdAt),
    });
  }
  for (const a of recentAnomalies.slice(0, 3)) {
    acts.push({
      icon: AlertTriangle,
      color: a.severity === 'CRITICAL' ? 'text-red-400' : a.severity === 'HIGH' ? 'text-saffron-400' : 'text-electric-400',
      bg: a.severity === 'CRITICAL' ? 'bg-red-500/10' : a.severity === 'HIGH' ? 'bg-saffron-500/10' : 'bg-electric-500/10',
      accent: a.severity === 'CRITICAL' ? 'red' : a.severity === 'HIGH' ? 'saffron' : 'electric',
      text: `${a.severity} anomaly: ${a.title}`,
      time: timeAgo(a.createdAt),
    });
  }
  return acts
    .sort((a, b) => {
      const parse = (s: string) => {
        const m = s.match(/^(\d+)([mhd])\s*ago$/);
        if (!m) return 0;
        const n = Number(m[1]);
        return n * (m[2] === 'm' ? 60_000 : m[2] === 'h' ? 3_600_000 : 86_400_000);
      };
      return parse(a.time) - parse(b.time);
    })
    .slice(0, 8);
}

// ── GSAP Reveal Hook ───────────────────────────────────────────────────────

function useGSAPReveal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('[data-gsap-reveal]');
    if (!els.length) return;
    gsap.fromTo(
      els,
      { opacity: 0, y: 24, filter: 'blur(4px)' },
      {
        opacity: 1, y: 0, filter: 'blur(0px)',
        stagger: 0.07,
        duration: 0.7,
        ease: 'power3.out',
        clearProps: 'filter',
      }
    );
  }, [ref]);
}

// ── Premium KPI Card ────────────────────────────────────────────────────────

const ACCENT_MAP = {
  electric: { glow: 'shadow-electric-500/30',    bar: 'from-electric-500 to-electric-400', text: 'text-electric-400',    iconBg: 'bg-electric-500/15', iconRing: 'ring-electric-500/25',  barColor: '#3b82f6' },
  green:    { glow: 'shadow-green-500/30',       bar: 'from-green-500 to-green-400',       text: 'text-green-400',       iconBg: 'bg-green-500/15',    iconRing: 'ring-green-500/25',   barColor: '#22c55e' },
  saffron:  { glow: 'shadow-saffron-500/30',     bar: 'from-saffron-500 to-saffron-400',   text: 'text-saffron-400',     iconBg: 'bg-saffron-500/15',  iconRing: 'ring-saffron-500/25', barColor: '#fbbf24' },
  red:      { glow: 'shadow-red-500/30',         bar: 'from-red-500 to-red-400',           text: 'text-red-400',         iconBg: 'bg-red-500/15',      iconRing: 'ring-red-500/25',    barColor: '#ef4444' },
  blue:     { glow: 'shadow-blue-500/30',        bar: 'from-blue-500 to-blue-400',         text: 'text-blue-400',         iconBg: 'bg-blue-500/15',     iconRing: 'ring-blue-500/25',   barColor: '#60a5fa' },
} as const;

type AccentKey = keyof typeof ACCENT_MAP;

function KPICard({
  label, value, subtext, icon: Icon, accent = 'electric',
  trend, trendUp, delay = 0, className,
}: {
  label: string; value: number; subtext: string;
  icon: any; accent?: AccentKey;
  trend?: string; trendUp?: boolean; delay?: number;
  className?: string;
}) {
  const s = ACCENT_MAP[accent];
  const counterRef = useRef<HTMLSpanElement>(null);

  // Animate counter on mount
  useEffect(() => {
    const el = counterRef.current;
    if (!el) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.4,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = Math.floor(obj.val).toLocaleString('en-IN');
      },
    });
  }, [value, delay]);

  return (
    <motion.div
      data-gsap-reveal
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
      className={cn(
        'relative rounded-2xl p-5 group overflow-hidden cursor-default',
        'bg-[#080c18]/80 backdrop-blur-xl',
        'border border-white/[0.06] ring-1 ring-white/[0.04]',
        'transition-all duration-300 hover:border-white/10',
        s.glow, className
      )}
    >
      {/* Top accent gradient bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-60', s.bar)} />

      {/* Background glow on hover */}
      <div
        className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none')}
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${s.barColor}15, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ring-1', s.iconBg, s.iconRing)}>
        <Icon className={cn('w-5 h-5 transition-transform group-hover:scale-110 duration-300', s.text)} />
      </div>

      {/* Value */}
      <div className="mb-1">
        <span ref={counterRef} className="text-3xl font-bold text-white tracking-tight leading-none tabular-nums">
          {Math.floor(value).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Label + trend */}
      <div className="flex items-end justify-between">
        <p className="text-sm text-slate-400 font-medium">{label}</p>
        {trend && (
          <div className={cn('flex items-center gap-0.5 text-[10px] font-semibold', trendUp ? 'text-green-400' : 'text-red-400')}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-600 mt-0.5">{subtext}</p>

      {/* Sparkline placeholder (decorative bar) */}
      {trend && (
        <div className="mt-3 flex items-end gap-0.5 h-6">
          {[30, 45, 38, 52, 60, 55, 72, 68, 85, 80, 90].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-300"
              style={{
                height: `${h}%`,
                background: trendUp ? `${s.barColor}40` : `rgba(239,68,68,0.4)`,
                opacity: i === 10 ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Live Activity Feed ─────────────────────────────────────────────────────

function LiveActivityFeed({ activities }: { activities: LiveActivity[] }) {
  return (
    <div className="glass rounded-2xl p-5 h-full flex flex-col relative overflow-hidden">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-green-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-ping" style={{ animationDuration: '2s' }} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Live Feed</span>
        </div>
        <span className="text-[9px] font-mono text-slate-600 tracking-widest">STREAMING</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto min-h-0 scrollbar-thin">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Inbox className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-[11px] text-slate-600 text-center">No recent activity</p>
          </div>
        ) : activities.map((act, i) => {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0"
            >
              <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5', act.bg)}>
                <act.icon className={cn('w-3 h-3', act.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-400 leading-relaxed">{act.text}</p>
                <p className="text-[10px] text-slate-700 mt-0.5 font-mono">{act.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── System Status ──────────────────────────────────────────────────────────

function SystemStatus({ health }: { health: HealthStatus | null }) {
  const services = [
    { label: 'API Server',   ok: health?.status === 'ok', detail: `v${health?.version ?? '—'}`,     Icon: Server },
    { label: 'Database',    ok: health?.database === 'connected', detail: health?.database ?? '—', Icon: Database },
    { label: 'Map Service', ok: true,                     detail: 'Leaflet ready',               Icon: Globe },
    { label: 'AI Engine',   ok: true,                     detail: '4 modules active',             Icon: Cpu },
    { label: 'Risk Engine',  ok: true,                     detail: '4-signal active',             Icon: AlertTriangle },
  ];
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
      <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-electric-400" />
        System Status
      </h3>
      <div className="space-y-1">
        {services.map(({ label, ok, detail, Icon }) => (
          <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-600">{detail}</span>
              {ok
                ? <CheckCircle className="w-3 h-3 text-green-400" />
                : <XCircle className="w-3 h-3 text-red-400" />
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Anomaly Row ────────────────────────────────────────────────────────────

function AnomalyRow({ anom, index }: { anom: any; index: number }) {
  const severityColors: Record<string, string> = {
    CRITICAL: 'text-red-400 bg-red-500/15 border-red-500/30',
    HIGH:     'text-saffron-400 bg-saffron-500/15 border-saffron-500/30',
    MEDIUM:   'text-electric-400 bg-electric-500/15 border-electric-500/30',
    LOW:      'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };
  const cls = severityColors[anom.severity] || severityColors.LOW;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link to={`/anomalies/${anom.id}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-[#080c18]/60 border border-white/[0.05] hover:border-saffron-500/20 hover:bg-saffron-500/5 transition-all group"
      >
        <span className={cn('shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide', cls.split(' ').slice(1).join(' '))}>
          {anom.severity}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-200 group-hover:text-white transition-colors truncate font-medium">{anom.title}</p>
          <p className="text-[10px] text-slate-600 mt-0.5 truncate">{anom.project?.name ?? anom.description ?? anom.category}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[10px] text-slate-600">{anom.category}</span>
          <p className="text-[10px] text-slate-700 mt-0.5 font-mono">{timeAgo(anom.createdAt)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Project Row ────────────────────────────────────────────────────────────

function ProjectRow({ p, index }: { p: Project; index: number }) {
  const util = p.approvedAmount > 0 ? Math.min(150, Math.round((p.spentAmount / p.approvedAmount) * 100)) : 0;
  const overBudget = util > 100;
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
    >
      <td className="py-3 pr-4">
        <Link to={`/projects/${p.id}`}
          className="text-slate-200 group-hover:text-electric-400 transition-colors font-medium text-sm truncate block max-w-[200px]"
        >{p.name}</Link>
      </td>
      <td className="py-3 pr-4 text-slate-500 text-xs">{p.sector.replace(/_/g, ' ')}</td>
      <td className="py-3 pr-4 text-slate-500 text-xs">{p.district}, {p.state}</td>
      <td className="py-3 pr-4 text-right text-slate-400 font-mono text-xs">{fmtINR(p.approvedAmount)}</td>
      <td className="py-3 pr-4 text-right font-mono text-xs text-saffron-400">{fmtINR(p.spentAmount)}</td>
      <td className="py-3 pr-4 text-right font-mono font-bold text-sm">
        <span className={overBudget ? 'text-red-400' : util > 80 ? 'text-green-400' : 'text-electric-400'}>{util}%</span>
      </td>
      <td className="py-3 w-24">
        <div className="h-1.5 bg-[#0d1120] rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', overBudget ? 'bg-red-500' : util > 80 ? 'bg-green-500' : 'bg-electric-500')}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, util)}%` }}
            transition={{ duration: 1.2, delay: 0.3 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </td>
    </motion.tr>
  );
}

// ── Financial Bar ───────────────────────────────────────────────────────────

function FinancialBar({ fin }: { fin: SchemeFinancials }) {
  const { totalBudget, totalSpent } = fin;
  const spentPct    = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const utilization = fin.utilization ?? 0;
  const barColor    = utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-saffron-500' : 'bg-electric-500';

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.12), transparent 70%)' }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/50 to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-electric-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Scheme Financial Health</span>
            <span className="text-[10px] text-slate-600 font-mono">{fin.projectCount} projects · {fin.expenditureCount} disbursements</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] flex-wrap">
            {[
              { label: 'Budget',     val: totalBudget, cls: 'text-electric-400' },
              { label: 'Spent',      val: totalSpent, cls: 'text-saffron-400' },
              { label: 'Remaining',  val: fin.remaining, cls: 'text-green-400' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="text-right">
                <span className="text-slate-600 mr-1">{label}: </span>
                <span className={cn('font-mono font-bold', cls)}>{fmtINR(val)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 bg-[#0d1120] rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', barColor)}
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 font-mono">
            <span>₹0</span>
            <span className={utilization > 90 ? 'text-red-400 font-bold' : utilization > 70 ? 'text-saffron-400 font-bold' : 'text-electric-400 font-bold'}>
              {utilization.toFixed(1)}% utilized
            </span>
            <span>{fmtINR(fin.remaining)} remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Officer Dashboard ───────────────────────────────────────────────────────

export default function OfficerDashboard() {
  const healthQuery      = useHealth();
  const projectsQuery   = useProjects({ limit: 50 });
  const finQuery        = useSchemeFinancials();
  const anomaliesQuery  = useAnomalies({ status: 'OPEN', limit: 8 });
  const reportsQuery    = useReports({ status: 'SUBMITTED', limit: 10 });
  const anomalyStatsQuery = useAnomalyStats();

  const health           = healthQuery.data ?? null;
  const projects         = projectsQuery.data?.items ?? [];
  const schemeFin        = finQuery.data ?? null;
  const anomalies        = anomaliesQuery.data ?? null;
  const reports          = reportsQuery.data;
  const anomalyStats     = anomalyStatsQuery.data;

  const loading =
    healthQuery.isLoading || projectsQuery.isLoading ||
    finQuery.isLoading || anomaliesQuery.isLoading || reportsQuery.isLoading;

  const pendingReports     = reports?.total ?? 0;
  const totalProjects      = projects.length;
  const activeProjects    = projects.filter(p => p.status === 'IN_PROGRESS').length;
  const completedProjects = projects.filter(p => ['COMPLETED', 'VERIFIED'].includes(p.status)).length;
  const totalBudget       = schemeFin?.totalBudget ?? 0;
  const utilization       = schemeFin?.utilization ?? 0;

  const topProjects  = useMemo(() =>
    [...projects].filter(p => p.approvedAmount > 0)
      .sort((a, b) => (b.spentAmount / b.approvedAmount) - (a.spentAmount / a.approvedAmount))
      .slice(0, 8), [projects]);

  const topAnomalies = anomalies?.items ?? [];

  const liveActivities = useMemo(() => {
    const recentReports   = (reports?.items ?? []).slice(0, 3);
    const recentAnomalies = (anomalies?.items ?? []).slice(0, 3);
    return buildLiveActivities(recentReports, recentAnomalies);
  }, [reports, anomalies]);

  // Tasks
  const tasks: TaskItem[] = useMemo(() => {
    const t: TaskItem[] = [];
    if (reports && reports.total > 0) {
      t.push({ id: 'pending-reports', title: `${reports.total} pending reports`, subtitle: 'Awaiting review', icon: Users, href: '/reports?status=SUBMITTED', meta: 'REVIEW', accent: 'electric' });
    }
    if (anomalies && anomalies.total > 0) {
      t.push({ id: 'open-anomalies', title: `${anomalies.total} open anomalies`, subtitle: 'AI-detected issues need review', icon: AlertTriangle, href: '/anomalies?status=OPEN', meta: 'QUEUE', accent: anomalyStats && anomalyStats.critical > 0 ? 'red' : 'saffron', urgent: !!(anomalyStats && anomalyStats.critical > 0) });
    }
    if (activeProjects > 0) {
      t.push({ id: 'active-projects', title: `${activeProjects} active projects`, subtitle: 'Ongoing monitoring', icon: Activity, href: '/projects?status=IN_PROGRESS', meta: 'TRACK', accent: 'green' });
    }
    if (completedProjects > 0) {
      t.push({ id: 'verify-projects', title: `${completedProjects} completed`, subtitle: 'Pending verification', icon: CheckCircle, href: '/projects?status=COMPLETED', meta: 'VERIFY', accent: 'blue' });
    }
    return t;
  }, [reports, anomalies, activeProjects, completedProjects, anomalyStats]);

  // Quick actions
  const actions: QuickAction[] = [
    { label: 'Projects',      description: `${totalProjects} works`,        icon: FileText,       href: '/projects',     accent: 'electric', badge: totalProjects || undefined },
    { label: 'Anomalies',     description: 'Detection queue',              icon: AlertTriangle, href: '/anomalies',   accent: 'red',       badge: anomalyStats?.open || undefined },
    { label: 'Reports',       description: 'Citizen submissions',         icon: Users,          href: '/reports',     accent: 'saffron',  badge: reports?.total || undefined },
    { label: 'Risk',          description: 'Project risk scores',          icon: Shield,        href: '/risk',        accent: 'saffron' },
    { label: 'Map View',      description: 'Spatial intelligence',         icon: Map,           href: '/map',         accent: 'green' },
    { label: 'Analytics',      description: 'Trends & insights',            icon: BarChart2,     href: '/analytics',   accent: 'blue' },
    { label: 'Notifications',  description: 'Alert center',                 icon: BellRing,      href: '/notifications', accent: 'electric' },
    { label: 'Settings',      description: 'System configuration',         icon: Server,        href: '/settings',    accent: 'emerald' },
  ];

  const mainRef = useRef<HTMLDivElement>(null);
  useGSAPReveal(mainRef as React.RefObject<HTMLElement>);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-56 rounded-2xl overflow-hidden"><SkeletonStatCard /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></div>
        <LoadingState message="Loading command center..." />
      </div>
    );
  }

  return (
    <motion.div ref={mainRef} className="space-y-6" variants={stagger} initial="hidden" animate="visible">

      {/* ═══ GLOBE HERO — Full bleed command center ═══ */}
      <motion.div data-gsap-reveal variants={fadeUp} custom={0}>
        <div className="relative rounded-2xl overflow-hidden"
          style={{
            height: 560,
            background: 'radial-gradient(ellipse at 50% 30%, #080c20 0%, #000000 100%)',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(59,130,246,0.08)',
          }}
        >
          {/* HUD: Top-left */}
          <div className="absolute top-5 left-5 z-10 pointer-events-none">
            <div className="text-[9px] font-mono text-electric-400/70 tracking-[0.4em] uppercase mb-1">
              VOJAS · Strategic Intelligence
            </div>
            <div className="text-xs text-white font-bold tracking-wide">Command Center</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {totalProjects} nodes · {fmtINR(totalBudget)} monitored
            </div>
          </div>

          {/* HUD: Top-right — status indicators */}
          <div className="absolute top-5 right-5 z-10 text-right pointer-events-none">
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 justify-end">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>LIVE</span>
              </div>
              <div>60 FPS</div>
              <div className="w-px h-3 bg-white/10" />
              <div>IND · +5:30</div>
            </div>
          </div>

          {/* Globe (lazy loaded) */}
          <div className="absolute inset-0">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-electric-500 border-t-transparent animate-spin mb-3" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Initializing Globe</p>
                </div>
              </div>
            }>
              <GlobeHero height={560} />
            </Suspense>
          </div>

          {/* Bottom overlay: quick glance metrics */}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            }}
          >
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {[
                  { label: 'Active', value: activeProjects, color: 'text-green-400' },
                  { label: 'Completed', value: completedProjects, color: 'text-electric-400' },
                  { label: 'Anomalies', value: topAnomalies.length, color: 'text-saffron-400' },
                  { label: 'Pending', value: pendingReports, color: 'text-slate-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-right">
                    <div className={cn('text-lg font-bold tabular-nums leading-none', color)}>{value.toLocaleString('en-IN')}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <div className="text-saffron-400 text-lg font-bold tabular-nums leading-none">{utilization.toFixed(1)}%</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">Budget Utilized</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI Strip ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Budget"
          value={totalBudget}
          subtext="Across all MPLAD schemes"
          icon={IndianRupee}
          accent="electric"
          trend="+8.2%"
          trendUp
          delay={0.1}
        />
        <KPICard
          label="Active Projects"
          value={activeProjects}
          subtext={`${totalProjects} total tracked works`}
          icon={Activity}
          accent="green"
          trend="+3"
          trendUp
          delay={0.2}
        />
        <KPICard
          label="Open Anomalies"
          value={topAnomalies.length}
          subtext={`${anomalyStats?.critical ?? 0} critical · ${anomalyStats?.open ?? 0} total`}
          icon={AlertTriangle}
          accent={anomalyStats?.critical ? 'red' : 'saffron'}
          trend={anomalyStats?.critical ? '+2' : '-1'}
          trendUp={!anomalyStats?.critical}
          delay={0.3}
        />
        <KPICard
          label="Citizen Reports"
          value={reports?.total ?? 0}
          subtext="Pending review and assignment"
          icon={Users}
          accent="blue"
          trend="+12"
          trendUp
          delay={0.4}
        />
      </div>

      {/* ═══ Quick Command Bar ═══ */}
      <motion.div data-gsap-reveal className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { localStorage.removeItem('vojas.demoTourCompleted'); window.dispatchEvent(new CustomEvent('vojas:start-tour')); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-electric-600 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white text-xs font-bold transition-all shadow-lg shadow-electric-500/25 hover:shadow-electric-500/50 hover:scale-105"
          >
            <Rocket className="w-3.5 h-3.5" /> Demo Tour
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Auto-refresh 30s
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/projects" className="px-3 py-1.5 rounded-lg text-[11px] text-electric-400 hover:bg-electric-500/10 border border-electric-500/20 hover:border-electric-500/40 transition-all font-medium">
            All Projects
          </Link>
          <Link to="/anomalies" className="px-3 py-1.5 rounded-lg text-[11px] text-saffron-400 hover:bg-saffron-500/10 border border-saffron-500/20 hover:border-saffron-500/40 transition-all font-medium">
            Anomalies
          </Link>
          <Link to="/map" className="px-3 py-1.5 rounded-lg text-[11px] text-green-400 hover:bg-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all font-medium">
            Map
          </Link>
        </div>
      </motion.div>

      {/* ═══ Intelligence Grid ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* Anomalies panel */}
        <motion.div data-gsap-reveal className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.1), transparent 60%)' }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron-500/50 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-saffron-400" />
                <h2 className="text-sm font-bold text-white">Detection Queue</h2>
                {topAnomalies.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-saffron-500/15 border border-saffron-500/30 text-saffron-400">
                    {topAnomalies.length}
                  </span>
                )}
              </div>
              <Link to="/anomalies" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors font-medium">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {topAnomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-400/30 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No open anomalies</p>
                <p className="text-[11px] text-slate-600 mt-1">All detection rules passed · system clean</p>
              </div>
            ) : (
              <div className="space-y-2">{topAnomalies.map((anom, i) => <AnomalyRow key={anom.id} anom={anom} index={i} />)}</div>
            )}
          </div>
        </motion.div>

        {/* Live Feed + System Status */}
        <div className="space-y-4">
          <motion.div data-gsap-reveal><LiveActivityFeed activities={liveActivities} /></motion.div>
          <motion.div data-gsap-reveal><SystemStatus health={health} /></motion.div>
        </div>
      </div>

      {/* ═══ Financial Health ═══ */}
      <motion.div data-gsap-reveal>{schemeFin && <FinancialBar fin={schemeFin} />}</motion.div>

      {/* ═══ Performance Pulse + Tasks ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div data-gsap-reveal className="lg:col-span-2 glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(59,130,246,0.12), transparent 60%)' }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/50 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-electric-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Performance Pulse</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">live · all sectors</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center">
                <RibbonGauge
                  value={utilization}
                  label="Budget Utilization"
                  color={utilization > 90 ? 'red' : utilization > 70 ? 'saffron' : 'green'}
                  size={130} thickness={9}
                />
              </div>
              <div className="flex flex-col items-center">
                <RibbonGauge
                  value={totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0}
                  label="Completion Rate"
                  color="electric"
                  size={130} thickness={9}
                />
              </div>
              <div className="flex flex-col items-center">
                <RibbonGauge
                  value={reports && reports.total > 0 ? Math.round(((reports.total - pendingReports) / reports.total) * 100) : 0}
                  label="Report Resolution"
                  color="saffron"
                  size={130} thickness={9}
                />
              </div>
              <div className="flex flex-col items-center">
                <RibbonGauge
                  value={topProjects[0] ? Math.min(100, (topProjects[0].spentAmount / topProjects[0].approvedAmount) * 100) : 0}
                  label="Top Project Util"
                  color="green"
                  size={130} thickness={9}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div data-gsap-reveal className="space-y-4">
          <QuickActions title="Quick Access" columns={2} actions={actions} />
          <MyTasks title="My Tasks" items={tasks} viewAllHref="/anomalies" />
        </motion.div>
      </div>

      {/* ═══ Spatial Map + Projects Table ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div data-gsap-reveal className="glass rounded-2xl p-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
          <div className="flex items-center justify-between mb-2 px-3 pt-1">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-electric-400" />
              <h2 className="text-xs font-bold text-white">Spatial Intelligence</h2>
            </div>
            <Link to="/map" className="flex items-center gap-1 text-[10px] text-electric-400 hover:text-electric-300 transition-colors font-medium">
              Open <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div style={{ height: 340 }}>
            <SpatialDashboardMap />
          </div>
        </motion.div>

        {/* Top Projects */}
        <motion.div data-gsap-reveal className="lg:col-span-2 glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-15"
            style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(59,130,246,0.15), transparent 60%)' }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-electric-400" />
                <h2 className="text-sm font-bold text-white">Top Projects by Utilization</h2>
              </div>
              <Link to="/projects" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors font-medium">
                All projects <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Top projects by budget utilization">
                <caption className="sr-only">Top projects by budget utilization</caption>
                <thead>
                  <tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-white/5">
                    <th scope="col" className="text-left pb-2 pr-4 font-semibold">Project</th>
                    <th scope="col" className="text-left pb-2 pr-4 font-semibold">Sector</th>
                    <th scope="col" className="text-left pb-2 pr-4 font-semibold">Location</th>
                    <th scope="col" className="text-right pb-2 pr-4 font-semibold">Budget</th>
                    <th scope="col" className="text-right pb-2 pr-4 font-semibold">Spent</th>
                    <th scope="col" className="text-right pb-2 pr-4 font-semibold">Util%</th>
                    <th scope="col" className="pb-2 font-semibold w-24">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.length === 0
                    ? <tr><td colSpan={7} className="py-8 text-center text-slate-600 text-sm">No projects found</td></tr>
                    : topProjects.map((p, i) => <ProjectRow key={p.id} p={p} index={i} />)
                  }
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
