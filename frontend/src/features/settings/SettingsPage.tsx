import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Users,
  AlertTriangle,
  Activity,
  BarChart3,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { adminApi, type AdminUser, type SystemStats, type AnomalyRule, type AuditLog } from "@/services/admin-api";
import { LoadingState, ErrorState } from "@/components/ui";

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "rules" | "audit";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview",         icon: BarChart3 },
  { key: "users",   label: "Users",            icon: Users },
  { key: "rules",   label: "Anomaly Rules",    icon: AlertTriangle },
  { key: "audit",   label: "Audit Log",        icon: Activity },
];

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { color: string }> = {
  ADMIN:    { color: "bg-red-500/15 text-red-400 border-red-500/30" },
  OFFICER:  { color: "bg-electric-500/15 text-electric-400 border-electric-500/30" },
  ANALYST:  { color: "bg-saffron-500/15 text-saffron-400 border-saffron-500/30" },
  REVIEWER: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  VIEWER:   { color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.VIEWER;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.color}`}>
      {role}
    </span>
  );
}

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEV_CONFIG: Record<string, { color: string }> = {
  LOW:      { color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  MEDIUM:   { color: "bg-saffron-500/15 text-saffron-400 border-saffron-500/30" },
  HIGH:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  CRITICAL: { color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEV_CONFIG[severity] ?? SEV_CONFIG.LOW;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.color}`}>
      {severity}
    </span>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ stats, loading, error, retry }: {
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Users"    value={stats.userCount}      icon={Users}         accent="bg-electric-500/20 text-electric-400" />
        <StatTile label="Projects"       value={stats.projectCount}   icon={BarChart3}     accent="bg-saffron-500/20 text-saffron-400" />
        <StatTile label="Reports"        value={stats.reportCount}    icon={Activity}      accent="bg-blue-500/20 text-blue-400" />
        <StatTile label="Open Anomalies" value={stats.openAnomalies} icon={AlertTriangle} accent="bg-red-500/20 text-red-400" />
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
        <h3 className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Recorded Expenditure</h3>
        <p className="text-3xl font-bold text-white mt-2">
          ₹{(stats.totalExpenditure / 1_000_000).toFixed(2)}L
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {new Intl.NumberFormat("en-IN").format(stats.totalExpenditure)} across all projects
        </p>
      </div>

      <div className="bg-navy-800/50 border border-electric-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-electric-400" />
          <span className="text-sm font-semibold text-electric-400">System Healthy</span>
        </div>
        <p className="text-xs text-slate-400">
          VOJAS v1.0.0 — All services operational. SQLite database in use.
        </p>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VIEWER" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit role
  const [editRole, setEditRole] = useState<string>("VIEWER");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listUsers();
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const data = await adminApi.createUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role as any,
      });
      setUsers((prev) => [data.user, ...prev]);
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "VIEWER" });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateRole = async (id: string) => {
    setEditSubmitting(true);
    try {
      const data = await adminApi.updateUser(id, { role: editRole as any });
      setUsers((prev) => prev.map((u) => u.id === id ? data.user : u));
      setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadUsers} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">User Management</h2>
          <p className="text-xs text-slate-500">{users.length} registered users</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-electric-500 hover:bg-electric-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-navy-800/50 border border-electric-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Create New User</h3>
            <button onClick={() => { setShowCreate(false); setFormError(null); }}
              className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form aria-label="Create new user" onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="create-user-name" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input id="create-user-name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required minLength={2} maxLength={100}
                className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                placeholder="Dr. Priya Sharma" />
            </div>
            <div>
              <label htmlFor="create-user-email" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input type="email" id="create-user-email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required
                className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                placeholder="officer@vojas.gov" />
            </div>
            <div>
              <label htmlFor="create-user-password" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Password <span className="text-red-400">*</span>
              </label>
              <input type="password" id="create-user-password" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required minLength={10}
                className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 transition-colors"
                placeholder="Min 10 chars, uppercase+lowercase+number" />
            </div>
            <div>
              <label htmlFor="create-user-role" className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Role</label>
              <select id="create-user-role" value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors">
                {["ADMIN","OFFICER","ANALYST","REVIEWER","VIEWER"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {formError && (
              <div className="md:col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                {formError}
              </div>
            )}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting}
                className="px-4 py-2 rounded-lg bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2">
                {formSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-navy-900/50 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <caption className="sr-only">Registered users — name, email, role, creation date, and actions</caption>
          <thead>
            <tr className="border-b border-white/5">
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">User</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Role</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Created</th>
              <th scope="col" className="px-4 py-3 text-right text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-electric-500/20 border border-electric-500/30 flex items-center justify-center text-electric-400 text-xs font-bold shrink-0">
                      {user.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-200 font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <label htmlFor={`role-select-${user.id}`} className="sr-only">Edit role for {user.name}</label>
                      <select id={`role-select-${user.id}`} value={editRole} onChange={(e) => setEditRole(e.target.value)}
                        className="bg-navy-800 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-electric-500/50">
                        {["ADMIN","OFFICER","ANALYST","REVIEWER","VIEWER"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button onClick={() => handleUpdateRole(user.id)} disabled={editSubmitting}
                        className="text-green-400 hover:text-green-300 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <RoleBadge role={user.role} />
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditingId(user.id); setEditRole(user.role); }}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                      title="Edit role"
                      aria-label={`Edit role for ${user.name}`}>
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button onClick={() => handleDelete(user.id)} disabled={deletingId === user.id}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete user"
                      aria-label={`Delete ${user.name}`}>
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Anomaly Rules Tab ─────────────────────────────────────────────────────────

function RulesTab() {
  const [rules, setRules] = useState<AnomalyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listRules();
      setRules(data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const toggleRule = async (id: string, enabled: boolean) => {
    setToggling((prev) => { const n = new Set(prev); n.add(id); return n; });
    try {
      const data = await adminApi.updateRule(id, { enabled });
      setRules((prev) => prev.map((r) => r.id === id ? data.rule : r));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to toggle rule");
    } finally {
      setToggling((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadRules} />;

  const categories = [...new Set(rules.map((r) => r.category))];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">Anomaly Detection Rules</h2>
        <p className="text-xs text-slate-500">
          {rules.length} rules configured — toggle enabled/disabled per rule
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">{cat}</h3>
          <div className="space-y-2">
            {rules.filter((r) => r.category === cat).map((rule) => (
              <div key={rule.id}
                className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                  rule.enabled ? "bg-white/[0.03] border-white/5" : "bg-navy-900/30 border-white/5 opacity-60"
                }`}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    rule.enabled ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-500"
                  }`}>
                    {rule.enabled
                      ? <CheckCircle className="w-3.5 h-3.5" />
                      : <XCircle className="w-3.5 h-3.5" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{rule.name}</span>
                      <SeverityBadge severity={rule.severity} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-slate-500 border border-white/5 font-mono">
                        {rule.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Priority: {rule.priority} · Triggered {rule.matchCount} time{rule.matchCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleRule(rule.id, !rule.enabled)}
                  disabled={toggling.has(rule.id)}
                  role="switch"
                  aria-checked={rule.enabled}
                  aria-label={`${rule.enabled ? "Disable" : "Enable"} rule ${rule.name}`}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-electric-500/50 ${
                    rule.enabled
                      ? "bg-electric-500 border-electric-500"
                      : "bg-navy-800 border-white/10"
                  } ${toggling.has(rule.id) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    rule.enabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listAuditLogs(p, 25);
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(1); }, [loadLogs]);

  const ACTION_COLORS: Record<string, string> = {
    LOGIN: "text-green-400", LOGOUT: "text-slate-400", REGISTER: "text-blue-400",
    CREATE_USER: "text-electric-400", UPDATE_USER: "text-saffron-400", DELETE_USER: "text-red-400",
    PROJECT_CREATE: "text-electric-400", PROJECT_UPDATE: "text-saffron-400", PROJECT_DELETE: "text-red-400",
    REPORT_SUBMIT: "text-blue-400", REPORT_STATUS_CHANGE: "text-saffron-400",
    ANOMALY_SCAN: "text-purple-400", ANOMALY_ACKNOWLEDGE: "text-saffron-400",
    ANOMALY_RESOLVE: "text-green-400", UPDATE_ANOMALY_RULE: "text-electric-400",
  };

  if (loading && logs.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => loadLogs(page)} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Audit Log</h2>
          <p className="text-xs text-slate-500">{total.toLocaleString("en-IN")} total events</p>
        </div>
        <button onClick={() => loadLogs(page)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-navy-900/50 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <caption className="sr-only">Audit log — action, user, resource, and timestamp</caption>
          <thead>
            <tr className="border-b border-white/5">
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Action</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">User</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Resource</th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Time</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <Fragment key={log.id}>
                <tr
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  aria-expanded={expandedId === log.id}
                >
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-medium ${ACTION_COLORS[log.action] ?? "text-slate-400"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {log.user?.name ?? <span className="text-slate-600 italic">System</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">{log.resource}</span>
                    <span className="text-[10px] text-slate-600 ml-1.5 font-mono">{log.resourceId.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {log.details && <span className="text-xs">···</span>}
                  </td>
                </tr>
                {expandedId === log.id && log.details && (
                  <tr className="bg-navy-800/50 border-b border-white/5">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap break-all">
                        {(() => {
                          try { return JSON.stringify(JSON.parse(log.details!), null, 2); }
                          catch { return log.details; }
                        })()}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {total.toLocaleString("en-IN")} events
          </p>
          <div className="flex gap-2">
            <button onClick={() => loadLogs(page - 1)} disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-400 text-xs transition-colors">
              Previous
            </button>
            <button onClick={() => loadLogs(page + 1)} disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-400 text-xs transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Import Fragment for audit log expandable rows
import { Fragment } from "react";

// ── Main Settings Page ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await adminApi.stats();
      setStats(data);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-electric-400" />
          Settings & Administration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          System configuration, user management, and anomaly rule tuning — ADMIN only
        </p>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex items-center gap-1 mb-6 bg-navy-900/60 border border-white/5 rounded-xl p-1 overflow-x-auto"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            id={`settings-tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls={`settings-panel-${key}`}
            tabIndex={activeTab === key ? 0 : -1}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              activeTab === key
                ? "bg-electric-500/15 text-electric-400 border border-electric-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div id="settings-panel-overview" role="tabpanel" aria-labelledby="settings-tab-overview">
          <OverviewTab stats={stats} loading={statsLoading} error={statsError} retry={loadStats} />
        </div>
      )}
      {activeTab === "users" && (
        <div id="settings-panel-users" role="tabpanel" aria-labelledby="settings-tab-users">
          <UsersTab />
        </div>
      )}
      {activeTab === "rules" && (
        <div id="settings-panel-rules" role="tabpanel" aria-labelledby="settings-tab-rules">
          <RulesTab />
        </div>
      )}
      {activeTab === "audit" && (
        <div id="settings-panel-audit" role="tabpanel" aria-labelledby="settings-tab-audit">
          <AuditTab />
        </div>
      )}
    </div>
  );
}
