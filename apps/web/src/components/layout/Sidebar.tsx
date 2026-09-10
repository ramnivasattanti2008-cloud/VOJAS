'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpenDot, AlertTriangle, FileText, Settings,
  ShieldAlert, ListChecks, ScanSearch, Map, BarChart3, Bell,
  Users, Briefcase, FileArchive, Layers, Shield, type LucideIcon,
  Flag, FileCheck2, CreditCard, MessageSquare, HardHat,
  Home, FileBadge, MapPin, Star, ShieldCheck, Sparkles,
  Activity, Database, Cog, Cpu, Satellite, Play, Lock, FileSearch,
  ChevronRight, DollarSign, Target, Signal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

// M14: Admin sub-navigation items
const adminSubItems: NavItem[] = [
  { label: 'System Control Center', href: '/admin', icon: Activity },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Roles', href: '/admin/roles', icon: Lock },
  { label: 'Data Sources', href: '/admin/data-sources', icon: Database },
  { label: 'Rules', href: '/admin/rules', icon: Cog },
  { label: 'AI Control', href: '/admin/ai', icon: Cpu },
  { label: 'Satellites', href: '/admin/satellites', icon: Satellite },
  { label: 'Jobs', href: '/admin/jobs', icon: Play },
  { label: 'Health', href: '/admin/health', icon: Activity },
  { label: 'Audit Logs', href: '/admin/audit', icon: FileSearch },
  { label: 'Security', href: '/admin/security', icon: Shield },
];

// M14: MP Command Center sub-navigation items
const mpSubItems: NavItem[] = [
  { label: 'My Constituency', href: '/mp', icon: Home },
  { label: 'Projects', href: '/mp/projects', icon: FolderOpenDot },
  { label: 'Map', href: '/mp/map', icon: MapPin },
  { label: 'Finance', href: '/mp/finance', icon: DollarSign },
  { label: 'Reports', href: '/mp/reports', icon: FileText },
  { label: 'Demand', href: '/mp/demand', icon: Target },
  { label: 'Intel', href: '/mp/intel', icon: BarChart3 },
  { label: 'Signals', href: '/mp/signals', icon: Signal },
];

const adminItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpenDot },
  { label: 'Map View', href: '/map-view', icon: Map },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Sectors', href: '/sectors', icon: Layers },
  { label: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Intelligence', href: '/intelligence', icon: ShieldAlert },
  { label: 'Alerts', href: '/alerts', icon: ListChecks },
  { label: 'Verification', href: '/verification', icon: ScanSearch },
  { label: 'MPs', href: '/mps', icon: Users },
  { label: 'Vendors', href: '/vendors', icon: Briefcase },
  { label: 'Documents', href: '/documents', icon: FileArchive },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Officer', href: '/officer', icon: Shield },
  { label: 'Admin', href: '/admin', icon: Shield, children: adminSubItems },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const contractorItems: NavItem[] = [
  { label: 'My Projects', href: '/contractor', icon: HardHat },
  { label: 'Milestones', href: '/contractor/milestones', icon: Flag },
  { label: 'Documents', href: '/contractor/documents', icon: FileCheck2 },
  { label: 'Payments', href: '/contractor/payments', icon: CreditCard },
  { label: 'Issues', href: '/contractor/issues', icon: AlertTriangle },
  { label: 'Responses', href: '/contractor/responses', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const citizenItems: NavItem[] = [
  { label: 'Citizen Home', href: '/citizen', icon: Home },
  { label: 'My Reports', href: '/citizen/reports', icon: FileBadge },
  { label: 'Nearby Projects', href: '/citizen/projects', icon: MapPin },
  { label: 'Watchlist', href: '/citizen/watchlist', icon: Star },
  { label: 'Accountability', href: '/verification', icon: ShieldCheck },
  { label: 'AI Assistant', href: '#', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// M14: MP Command Center items
const mpItems: NavItem[] = [
  { label: 'My Constituency', href: '/mp', icon: Home },
  { label: 'Projects', href: '/mp/projects', icon: FolderOpenDot },
  { label: 'Map', href: '/mp/map', icon: MapPin },
  { label: 'Finance', href: '/mp/finance', icon: DollarSign },
  { label: 'Reports', href: '/mp/reports', icon: FileText },
  { label: 'Demand', href: '/mp/demand', icon: Target },
  { label: 'Intel', href: '/mp/intel', icon: BarChart3 },
  { label: 'Signals', href: '/mp/signals', icon: Signal },
];

// M14: Officer Command Center items
const officerItems: NavItem[] = [
  { label: 'Verification Command', href: '/officer', icon: ShieldAlert },
  { label: 'Verification Queue', href: '/officer/verification', icon: ScanSearch },
  { label: 'Case Workspace', href: '/officer/cases', icon: FileText },
  { label: 'Investigations', href: '/officer/investigations', icon: FileSearch },
  { label: 'Evidence Center', href: '/officer/evidence', icon: FileArchive },
  { label: 'Field Mode', href: '/officer/field', icon: MapPin },
  { label: 'Map', href: '/officer/map', icon: Map },
  { label: 'Responses', href: '/officer/responses', icon: MessageSquare },
  { label: 'All Projects', href: '/projects', icon: FolderOpenDot },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isContractor, isCitizen, isMP, isOfficer } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['/admin']));

  // Determine which items to show based on role
  let items: NavItem[];
  let roleLabel: string | null = null;

  if (isOfficer) {
    items = officerItems;
    roleLabel = 'Officer';
  } else if (isMP) {
    items = mpItems;
    roleLabel = 'MP';
  } else if (isContractor) {
    items = contractorItems;
    roleLabel = 'Contractor';
  } else if (isCitizen) {
    items = citizenItems;
    roleLabel = 'Citizen';
  } else {
    items = adminItems;
    roleLabel = null;
  }

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/' && pathname?.startsWith(item.href));
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.href);
    const Icon = item.icon;

    return (
      <div key={item.href}>
        <Link
          href={hasChildren ? '#' : item.href}
          onClick={hasChildren ? (e) => { e.preventDefault(); toggleExpanded(item.href); } : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-vojas-50 text-vojas-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            depth > 0 && 'ml-6 text-xs'
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon className={cn('h-4 w-4 shrink-0', depth > 0 && 'h-3.5 w-3.5')} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {hasChildren && (
            <ChevronRight className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              isExpanded && 'rotate-90'
            )} />
          )}
        </Link>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className="w-60 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0"
      role="complementary"
      aria-label="Sidebar"
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-vojas-600 text-white font-bold flex items-center justify-center">
          V
        </div>
        <span className="font-semibold text-slate-900">VOJAS</span>
        {roleLabel && (
          <span className={cn(
            'ml-auto text-xs px-2 py-0.5 rounded-full font-medium',
            isOfficer ? 'bg-red-100 text-red-700' :
            isMP ? 'bg-vojas-100 text-vojas-700' :
            isContractor ? 'bg-amber-100 text-amber-700' :
            isCitizen ? 'bg-green-100 text-green-700' : ''
          )}>
            {roleLabel}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => renderNavItem(item))}
      </nav>

      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        v2.0.0
      </div>
    </aside>
  );
}
