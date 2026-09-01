import { useState, useRef, useEffect, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight as Chevron,
  BellRing,
  Building2,
  TrendingUp,
  ClipboardCheck,
  Hammer,
  Briefcase,
  Shield,
  Database,
  Scale,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { notificationApi } from "@/services/notification-api";
import type { UserRole } from "@/types";
import PageTransition from "./PageTransition";
import NotificationCenter from "./NotificationCenter";
import { DemoTour } from "../DemoTour";
import { LogoMark } from "../brand/Logo";

// ── Route metadata ─────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    path: "/",              icon: LayoutDashboard },
  { label: "Projects",     path: "/projects",      icon: FileText        },
  { label: "Map View",     path: "/map",           icon: Map             },
  { label: "Risk",         path: "/risk",          icon: ShieldAlert     },
  { label: "Anomalies",    path: "/anomalies",     icon: AlertTriangle   },
  { label: "MPs",          path: "/mps",           icon: Users           },
  { label: "Vendors",      path: "/vendors",       icon: Building2       },
  { label: "Reports",      path: "/reports",       icon: FileText        },
  { label: "Alerts",       path: "/notifications", icon: BellRing        },
  { label: "Citizens",     path: "/citizens",      icon: Users           },
  { label: "Assets",       path: "/assets",        icon: Hammer          },
  { label: "Requests",     path: "/development-requests", icon: FileText   },
  { label: "Inspections",  path: "/inspections",   icon: ClipboardCheck  },
  { label: "Cases",        path: "/cases",         icon: Scale           },
  { label: "Priority",     path: "/priority",      icon: TrendingUp      },
  { label: "Contractor",   path: "/contractor",    icon: Briefcase, roles: ["CONTRACTOR", "ADMIN"] },
  { label: "Whistleblower", path: "/whistleblower/queue", icon: Shield, roles: ["ADMIN", "REVIEWER", "OFFICER"] },
  { label: "Data Sources", path: "/admin/data-sources", icon: Database, roles: ["ADMIN"] },
  { label: "Guidelines",   path: "/admin/guidelines", icon: Scale, roles: ["ADMIN"] },
  { label: "Data Quality", path: "/admin/data-quality", icon: Activity, roles: ["ADMIN", "ANALYST"] },
  { label: "Analytics",    path: "/analytics",     icon: BarChart3, roles: ["ADMIN", "ANALYST"] },
  { label: "Settings",     path: "/settings",      icon: Settings, roles: ["ADMIN"]            },
];

function getNavItems(role?: string): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role as UserRole);
  });
}

// ── Active nav helper ─────────────────────────────────────────────────────────

function isActiveNav(path: string, location: { pathname: string }): boolean {
  if (path === "/") return location.pathname === "/";
  return location.pathname.startsWith(path);
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [
    { label: "Home", path: "/" },
  ];

  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = seg
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    crumbs.push({ label, path: acc });
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-[11px] text-slate-600">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <Chevron className="w-3 h-3 text-slate-700" />}
            {isLast ? (
              <span className="text-slate-400 font-medium">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hover:text-slate-300 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Sub-component: single nav link ───────────────────────────────────────────

function NavLink({
  item,
  collapsed,
  mobile,
  onClick,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  mobile: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  const { pathname } = useLocation();
  const active = isActiveNav(item.path, { pathname });
  const Icon = item.icon as ComponentType<{ className?: string }>;
  const iconClass: string = `w-4.5 h-4.5 shrink-0 ${
    active ? "text-electric-400" : "text-slate-500 group-hover:text-slate-300"
  }`;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group relative
        ${mobile ? "w-full" : ""}
        ${active
          ? "bg-electric-500/15 text-electric-400 border border-electric-500/20"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }
      ` as string}
    >
      <Icon
        className={iconClass}
      />
      {!collapsed && <span className="font-medium">{item.label}</span>}
      {!collapsed && (badge ?? 0) > 0 && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-electric-500 text-white min-w-[18px] text-center">
          {badge! > 99 ? "99+" : badge}
        </span>
      )}
      {!collapsed && !badge && active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-electric-400" />
      )}
      {/* Tooltip on collapsed desktop */}
      {collapsed && !mobile && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-navy-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 shadow-xl">
          {item.label}
        </div>
      )}
    </Link>
  );
}

// ── User dropdown ─────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:   { bg: "bg-red-500/15",      text: "text-red-400",      border: "border-red-500/30" },
  OFFICER: { bg: "bg-electric-500/15", text: "text-electric-400",  border: "border-electric-500/30" },
  ANALYST: { bg: "bg-saffron-500/15", text: "text-saffron-400",   border: "border-saffron-500/30" },
  REVIEWER:{ bg: "bg-blue-500/15",     text: "text-blue-400",      border: "border-blue-500/30" },
  VIEWER:  { bg: "bg-emerald-500/15", text: "text-emerald-400",   border: "border-emerald-500/30" },
  MP:      { bg: "bg-saffron-500/15", text: "text-saffron-400",   border: "border-saffron-500/30" },
};

const AVATAR_BG: Record<string, string> = {
  ADMIN:   "bg-red-500/20",
  OFFICER: "bg-electric-500/20",
  ANALYST: "bg-saffron-500/20",
  REVIEWER:"bg-blue-500/20",
  VIEWER:  "bg-emerald-500/20",
  MP:      "bg-saffron-500/20",
};

// ── User dropdown ─────────────────────────────────────────────────────────────

function UserMenu({ user, logout }: { user: any; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const roleStyle = ROLE_COLORS[user?.role] ?? ROLE_COLORS.VIEWER;
  const avatarBg = AVATAR_BG[user?.role] ?? AVATAR_BG.VIEWER;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-1">
      {/* Notifications — handled by the dedicated NotificationCenter */}
      <NotificationCenter />

      {/* User avatar + name */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-lg hover:bg-white/5 transition-colors px-2 py-1.5"
          aria-label={`User menu — ${user?.name ?? "User"} (${user?.role ?? "VIEWER"})`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <div className={`w-7 h-7 rounded-full ${avatarBg} border border-white/10 flex items-center justify-center text-[11px] font-bold text-white`}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-semibold text-slate-200 leading-none max-w-[100px] truncate">
              {user?.name ?? "Guest"}
            </span>
            <span className={`text-[9px] font-semibold px-1 py-0.5 rounded mt-0.5 ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} border`}>
              {user?.role ?? "VIEWER"}
            </span>
          </div>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 w-52 bg-navy-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            role="menu"
            aria-label="User menu"
          >
            <div className="px-3 py-2.5 border-b border-white/5">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
              <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} border`}>
                {user?.role}
              </span>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <span>Profile & Preferences</span>
            </Link>
            <button
              onClick={logout}
              role="menuitem"
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────────

export default function Layout({ children, user }: { children: React.ReactNode; user?: any }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  const navItems = getNavItems(user?.role);

  // Poll unread notification count every 30s
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const { count } = await notificationApi.unreadCount();
        setUnreadCount(count);
      } catch {/* silent */}
    };
    void fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, [user]);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close mobile on resize to desktop
  useEffect(() => {
    function handleResize() { if (window.innerWidth >= 768) setMobileOpen(false); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[240px]";

  return (
    <>
      {/* Skip to main content link — first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-electric-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

    <div className="flex h-screen overflow-hidden bg-white dark:bg-navy-950 text-slate-800 dark:text-slate-200 light:bg-white light:text-navy-900">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        flex flex-col bg-white dark:bg-navy-900 border-r border-navy-200 dark:border-white/5
        transition-all duration-300 ease-in-out shrink-0
        fixed md:relative inset-y-0 left-0 z-40
        ${sidebarWidth}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-navy-200 dark:border-white/5 shrink-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-lg bg-electric-500/20 blur-md" />
            <div className="relative">
              <LogoMark size="sm" className="w-8 h-8" />
            </div>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-navy-900 dark:text-white tracking-[0.2em]">VOJAS</h1>
              <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase font-medium">Intelligence</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              collapsed={collapsed}
              mobile
              badge={item.path === "/notifications" ? unreadCount : undefined}
            />
          ))}
        </nav>

        {/* Collapse button — desktop */}
        <div className="border-t border-navy-200 dark:border-white/5 px-2 py-3 shrink-0 hidden md:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-navy-200 dark:border-white/5
          bg-white dark:bg-navy-900/60 backdrop-blur-xl
          flex items-center justify-between px-4 md:px-6 shrink-0 gap-3 z-20">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Breadcrumb */}
          <Breadcrumb pathname={location.pathname} />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Command palette trigger */}
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="hidden sm:flex items-center gap-2 w-56 px-3 py-1.5 bg-navy-800/60 border border-white/10 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:border-white/20 transition-all group"
            title="Open command palette (⌘K)"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
              ⌘K
            </kbd>
          </button>

          {/* Right cluster */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User + notifications */}
            {user && <UserMenu user={user} logout={logout} />}
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-5">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Demo Tour — auto-shows on first login */}
      <DemoTour autoShow />
    </div>
    </>
  );
}
