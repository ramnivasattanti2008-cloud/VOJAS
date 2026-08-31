import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCheck, Filter, ExternalLink, AlertTriangle, FileText, ShieldAlert, TrendingUp } from "lucide-react";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/useNotifications";
import type { NotificationItem, NotificationType } from "@/services/notification-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

const TYPE_META: Record<NotificationType, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof AlertTriangle;
}> = {
  ANOMALY_DETECTED:    { label: "Anomaly",         color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30",  icon: AlertTriangle },
  ANOMALY_ACKNOWLEDGED: { label: "Acknowledged",   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",    icon: CheckCheck },
  ANOMALY_RESOLVED:    { label: "Resolved",        color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/30", icon: CheckCheck },
  ANOMALY_ESCALATED:   { label: "Escalated",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",     icon: ShieldAlert },
  REPORT_SUBMITTED:    { label: "New report",      color: "text-electric-400",bg:"bg-electric-500/10",border:"border-electric-500/30",icon: FileText },
  REPORT_ASSIGNED:     { label: "Report assigned", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30",  icon: FileText },
  RISK_THRESHOLD:      { label: "Risk threshold",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30",  icon: TrendingUp },
};

/** Map a notification resource/resourceId to a clickable route */
function resourceToPath(type: NotificationType, resourceId: string | null): string | null {
  if (!resourceId) return null;
  if (type.startsWith("ANOMALY_"))  return `/anomalies/${resourceId}`;
  if (type.startsWith("REPORT_"))   return `/reports/${resourceId}`;
  if (type === "RISK_THRESHOLD")    return `/risk`;
  return null;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [showRead, setShowRead] = useState(true);
  const [filterType, setFilterType] = useState<NotificationType | "">("");

  // React Query
  const notificationsQuery = useNotifications({ limit: 100 });
  const unreadCountQuery = useUnreadNotificationCount();
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();

  const items: NotificationItem[] = notificationsQuery.data?.items ?? [];
  const unreadCount = unreadCountQuery.data?.count ?? notificationsQuery.data?.unreadCount ?? 0;
  const loading = notificationsQuery.isLoading;
  const error = notificationsQuery.error?.message ?? null;

  const handleMarkRead = async (ids: string[]) => {
    try {
      await markReadMutation.mutateAsync(ids);
    } catch {/* silent */}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch {/* silent */}
  };

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.isRead) await handleMarkRead([n.id]);
    const path = resourceToPath(n.type, n.resourceId);
    if (path) navigate(path);
  };

  const visible = useMemo(() => {
    let list = items;
    if (!showRead) list = list.filter((n) => !n.isRead);
    if (filterType) list = list.filter((n) => n.type === filterType);
    return list;
  }, [items, showRead, filterType]);

  const typeChips = useMemo(() => {
    const counts: Partial<Record<NotificationType, number>> = {};
    for (const n of items) counts[n.type] = (counts[n.type] ?? 0) + 1;
    return counts;
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-electric-400" />
            Alerts & Notifications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread · Anomaly, report, and risk-threshold events`
              : "All caught up — no unread alerts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-electric-500/10 border border-electric-500/30 text-electric-400 hover:bg-electric-500/20 transition-colors"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-3 flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Notification filters">
        <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <button
          onClick={() => setShowRead((v) => !v)}
          aria-pressed={!showRead}
          className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
            showRead
              ? "bg-white/5 border-white/10 text-slate-300"
              : "bg-electric-500/15 border-electric-500/30 text-electric-400"
          }`}
        >
          {showRead ? "Show: all" : "Show: unread only"}
        </button>
        <button
          onClick={() => setFilterType("")}
          aria-pressed={!filterType}
          className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
            !filterType
              ? "bg-electric-500/15 border-electric-500/30 text-electric-400"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
          }`}
        >
          All types ({items.length})
        </button>
        {(Object.keys(TYPE_META) as NotificationType[]).map((t) => {
          const c = typeChips[t] ?? 0;
          if (c === 0) return null;
          const meta = TYPE_META[t];
          const isActive = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(isActive ? "" : t)}
              aria-pressed={isActive}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 ${
                isActive
                  ? `${meta.bg} ${meta.border} ${meta.color}`
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
              }`}
            >
              {meta.label}
              <span className="text-[10px] opacity-70">{c}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="glass rounded-xl p-8">
          <LoadingState message="Loading alerts..." />
        </div>
      ) : error ? (
        <div className="glass rounded-xl p-8">
          <ErrorState message={error} onRetry={() => notificationsQuery.refetch()} />
        </div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-xl p-8">
          <EmptyState
            icon={<BellOff className="w-6 h-6" />}
            title={showRead || filterType ? "No matching alerts" : "No alerts yet"}
            description={
              showRead || filterType
                ? "Adjust your filter to see more."
                : "When anomalies, reports, or risk thresholds fire, you'll see them here."
            }
          />
        </div>
      ) : (
        <ul role="list" aria-label="Notification items" className="space-y-2">
          {visible.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.ANOMALY_DETECTED;
            const Icon = meta.icon;
            const path = resourceToPath(n.type, n.resourceId);
            return (
              <li key={n.id}>
                <button
                  onClick={() => handleItemClick(n)}
                  aria-label={`${n.title} — ${n.isRead ? "read" : "unread"}${path ? ", opens related resource" : ""}`}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                    n.isRead
                      ? "bg-navy-800/30 border-white/5 hover:border-white/15 hover:bg-navy-800/50"
                      : "bg-navy-800/70 border-electric-500/30 hover:border-electric-500/50"
                  }`}
                >
                  <div className={`shrink-0 w-9 h-9 rounded-lg ${meta.bg} ${meta.border} border flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-semibold uppercase tracking-wider ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-slate-600" aria-hidden="true">·</span>
                      <span className="text-[10px] text-slate-500">
                        {timeAgo(new Date(n.createdAt))}
                      </span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-electric-400 ml-1 shrink-0" aria-label="Unread" />
                      )}
                    </div>
                    <p className={`text-sm ${n.isRead ? "text-slate-300" : "text-white font-medium"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {path && (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-1" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
