/**
 * Layout — VOJAS 2.0 light theme.
 * Clean IBM Carbon-inspired sidebar + header layout.
 * No glassmorphism, no dark theme, no glow effects.
 */

import { useState, useRef, useEffect, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Gavel,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { notificationApi } from "@/services/notification-api";
import type { UserRole } from "@/types";
import PageTransition from "./PageTransition";
import NotificationCenter from "./NotificationCenter";
import { LogoMark } from "../brand/Logo";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

// ── Route metadata ─────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "nav.dashboard",    path: "/",                  icon: LayoutDashboard  },
  { label: "nav.projects",     path: "/projects",          icon: FileText        },
  { label: "nav.map",         path: "/map",               icon: Map             },
  { label: "nav.risk",        path: "/risk",              icon: ShieldAlert     },
  { label: "nav.anomalies",    path: "/anomalies",         icon: AlertTriangle   },
  { label: "nav.lawEnforcement", path: "/law-enforcement", icon: Gavel, roles: ["ADMIN", "OFFICER"] },
  { label: "nav.mps",          path: "/mps",               icon: Users           },
  { label: "nav.vendors",      path: "/vendors",           icon: Building2       },
  { label: "nav.reports",      path: "/reports",           icon: FileText        },
  { label: "nav.notifications", path: "/notifications",    icon: BellRing        },
  { label: "nav.citizens",     path: "/citizens",         icon: Users           },
  { label: "nav.assets",       path: "/assets",            icon: Hammer          },
  { label: "nav.requests",     path: "/development-requests", icon: FileText     },
  { label: "nav.inspections",  path: "/inspections",       icon: ClipboardCheck  },
  { label: "nav.cases",        path: "/cases",             icon: Scale           },
  { label: "nav.priority",    path: "/priority",          icon: TrendingUp      },
  { label: "nav.contractor",   path: "/contractor",        icon: Briefcase, roles: ["CONTRACTOR", "ADMIN"] },
  { label: "nav.whistleblower", path: "/whistleblower/queue", icon: Shield, roles: ["ADMIN", "REVIEWER", "OFFICER"] },
  { label: "nav.dataSources",   path: "/admin/data-sources", icon: Database, roles: ["ADMIN"] },
  { label: "nav.guidelines",   path: "/admin/guidelines",  icon: Scale, roles: ["ADMIN"] },
  { label: "nav.dataQuality",  path: "/admin/data-quality", icon: Activity, roles: ["ADMIN", "ANALYST"] },
  { label: "nav.analytics",    path: "/analytics",         icon: BarChart3, roles: ["ADMIN", "ANALYST"] },
  { label: "nav.settings",     path: "/settings",          icon: Settings, roles: ["ADMIN"] },
];

function getNavItems(role?: string): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role as UserRole);
  });
}

function isActiveNav(path: string, location: { pathname: string }): boolean {
  if (path === "/") return location.pathname === "/";
  return location.pathname.startsWith(path);
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [{ label: "Home", path: "/" }];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, path: acc });
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-[11px] text-gray-500">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <Chevron className="w-3 h-3 text-gray-400" />}
            {isLast ? (
              <span className="text-gray-700 font-medium">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hover:text-gray-900 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Nav link ─────────────────────────────────────────────────────────────────

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
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const active = isActiveNav(item.path, { pathname });
  const Icon = item.icon as ComponentType<{ className?: string }>;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`
        flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150 group relative rounded-md
        ${mobile ? "w-full" : ""}
        ${
          active
            ? "bg-blue-50 text-blue-700 border border-blue-200 font-medium"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }
      `}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
      {!collapsed && <span>{t(item.label)}</span>}
      {!collapsed && (badge ?? 0) > 0 && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white min-w-[18px] text-center">
          {badge! > 99 ? "99+" : badge}
        </span>
      )}
      {/* Tooltip on collapsed desktop */}
      {collapsed && !mobile && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md">
          {t(item.label)}
        </div>
      )}
    </Link>
  );
}

// ── Role colors (light theme) ─────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN:   { bg: "bg-red-50",    text: "text-red-700"    },
  OFFICER: { bg: "bg-blue-50",   text: "text-blue-700"   },
  ANALYST: { bg: "bg-orange-50", text: "text-orange-700" },
  REVIEWER:{ bg: "bg-sky-50",    text: "text-sky-700"    },
  VIEWER:  { bg: "bg-gray-100", text: "text-gray-700"   },
  MP:      { bg: "bg-orange-50", text: "text-orange-700" },
  CONTRACTOR:{ bg: "bg-violet-50", text: "text-violet-700" },
};

const AVATAR_BG: Record<string, string> = {
  ADMIN:   "bg-red-100",
  OFFICER: "bg-blue-100",
  ANALYST: "bg-orange-100",
  REVIEWER:"bg-sky-100",
  VIEWER:  "bg-gray-200",
  MP:      "bg-orange-100",
  CONTRACTOR:"bg-violet-100",
};

// ── User menu ───────────────────────────────────────────────────────────────

function UserMenu({ user, logout }: { user: any; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const userRef = useRef<HTMLDivElement>(null);

  const roleStyle = ROLE_COLORS[user?.role ?? "VIEWER"] ?? ROLE_COLORS.VIEWER;
  const avatarBg = AVATAR_BG[user?.role ?? "VIEWER"] ?? AVATAR_BG.VIEWER;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <NotificationCenter />
      <div ref={userRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg hover:bg-gray-100 transition-colors px-2 py-1.5"
          aria-label={`User menu — ${user?.name ?? "User"} (${user?.role ?? "VIEWER"})`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <div
            className={`w-7 h-7 rounded-full ${avatarBg} border border-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-700`}
          >
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-medium text-gray-900 leading-none max-w-[100px] truncate">
              {user?.name ?? "Guest"}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${roleStyle.bg} ${roleStyle.text}`}>
              {user?.role ?? "VIEWER"}
            </span>
          </div>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
            role="menu"
            aria-label="User menu"
          >
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-500">{user?.email}</p>
              <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                {user?.role}
              </span>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              {t("nav.profile")}
            </Link>
            <button
              onClick={logout}
              role="menuitem"
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("auth.signOut")}
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

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    function handleResize() { if (window.innerWidth >= 768) setMobileOpen(false); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = collapsed ? "w-[64px]" : "w-[224px]";

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-gray-900/40 z-30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            flex flex-col bg-white border-r border-gray-200
            transition-all duration-200 ease-in-out shrink-0
            fixed md:relative inset-y-0 left-0 z-40
            ${sidebarWidth}
            ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-200 shrink-0">
            <LogoMark size="sm" className="w-7 h-7 shrink-0" />
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-gray-900 tracking-wide">VOJAS</h1>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-medium">Intelligence</p>
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
          <div className="border-t border-gray-200 px-2 py-3 shrink-0 hidden md:block">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-full h-8 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-5 shrink-0 gap-3 z-20">

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
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
              onClick={() =>
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
              }
              className="hidden sm:flex items-center gap-2 w-56 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all group"
              title="Open command palette (⌘K)"
              aria-label="Open command palette"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="hidden md:flex items-center px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[9px] font-mono text-gray-500 group-hover:text-gray-700 transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Right cluster */}
            <div className="flex items-center gap-1 shrink-0">
              <LanguageSelector variant="dropdown" showSelected={false} />
              {user && <UserMenu user={user} logout={logout} />}
            </div>
          </header>

          {/* Page content */}
          <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-5 bg-gray-50">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </>
  );
}
