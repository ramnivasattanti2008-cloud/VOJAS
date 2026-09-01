import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bell,
  X,
  AlertTriangle,
  Shield,
  FileText,
  CheckCheck,
  Trash2,
  Inbox,
} from "lucide-react";
import { notificationApi, type NotificationItem, type NotificationType } from "@/services/notification-api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  ANOMALY_DETECTED: AlertTriangle,
  ANOMALY_ACKNOWLEDGED: Shield,
  ANOMALY_RESOLVED: Shield,
  ANOMALY_ESCALATED: AlertTriangle,
  REPORT_SUBMITTED: FileText,
  REPORT_ASSIGNED: FileText,
  RISK_THRESHOLD: AlertTriangle,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  ANOMALY_DETECTED: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  ANOMALY_ACKNOWLEDGED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  ANOMALY_RESOLVED: "text-green-400 bg-green-500/10 border-green-500/20",
  ANOMALY_ESCALATED: "text-red-400 bg-red-500/10 border-red-500/20",
  REPORT_SUBMITTED: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  REPORT_ASSIGNED: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  RISK_THRESHOLD: "text-saffron-400 bg-saffron-500/10 border-saffron-500/20",
};

const RESOURCE_PATH: Record<string, (id: string) => string> = {
  Anomaly: (id) => `/anomalies/${id}`,
  Report: (id) => `/reports/${id}`,
  Project: (id) => `/projects/${id}`,
};

// ── Component ────────────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await notificationApi.list({ limit: 20 });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // Lightweight unread-count polling (60s)
  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const { count } = await notificationApi.unreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // ignore — we'll retry on next tick
      }
    }
    void poll();
    const t = setInterval(poll, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  // Re-fetch full list when dropdown opens
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        const res = await notificationApi.markRead([n.id]);
        setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)));
        setUnreadCount(res.unreadCount);
      } catch {
        // best-effort
      }
    }

    if (n.resource && n.resourceId) {
      const route = RESOURCE_PATH[n.resource]?.(n.resourceId);
      if (route) {
        setOpen(false);
        navigate(route);
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all as read");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationApi.remove(id);
      const deleted = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-saffron-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-navy-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-center-title"
        >
          {/* Live region for status updates */}
          <div role="status" aria-live="polite" className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h2 id="notification-center-title" className="text-sm font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-electric-400 bg-electric-500/10 px-1.5 py-0.5 rounded">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[10px] text-slate-400 hover:text-white px-1.5 py-1 rounded hover:bg-white/5 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="w-3 h-3" aria-hidden="true" />
                  Mark all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-white/5 transition-colors"
                title="Close"
                aria-label="Close notifications"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[20rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-xs">Loading…</div>
            ) : error && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-red-400 text-xs">{error}</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-500">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                <p className="text-xs">You're all caught up</p>
                <p className="text-[10px] text-slate-600 mt-0.5">No notifications yet</p>
              </div>
            ) : (
              <ul role="list" aria-label="Notification items" className="divide-y divide-white/5">
                {items.map((n) => {
                  const Icon = (TYPE_ICONS[n.type] ?? Bell) as React.ComponentType<{ className?: string }>;
                  const color = TYPE_COLORS[n.type] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        aria-label={`${n.title} — ${n.isRead ? "read" : "unread"}`}
                        className={`w-full text-left flex gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group ${
                          n.isRead ? "" : "bg-electric-500/[0.03]"
                        }`}
                      >
                        <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${color}`}>
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={`text-xs leading-snug flex-1 min-w-0 ${n.isRead ? "text-slate-400" : "text-slate-200 font-medium"}`}>
                              {n.title}
                            </p>
                            {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-electric-400 shrink-0 mt-1" aria-label="Unread" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, n.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all shrink-0"
                          title="Delete"
                          aria-label={`Delete notification: ${n.title}`}
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer — link to full page */}
          <div className="px-4 py-2.5 border-t border-white/5 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] text-electric-400 hover:text-electric-300 font-medium transition-colors"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
