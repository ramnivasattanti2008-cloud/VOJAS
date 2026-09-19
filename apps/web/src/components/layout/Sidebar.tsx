'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import {
    Activity,
    AlertTriangle,
    BarChart3, Bell,
    Briefcase,
    ChevronRight,
    Cog, Cpu,
    CreditCard,
    Database,
    DollarSign,
    FileArchive,
    FileBadge,
    FileCheck2,
    FileSearch,
    FileText,
    Flag,
    FolderOpenDot,
    HardHat,
    Home,
    Layers,
    LayoutDashboard,
    ListChecks,
    Lock,
    Map,
    MapPin,
    MessageSquare,
    Play,
    Satellite,
    ScanSearch,
    Settings,
    Shield,
    ShieldAlert,
    Signal,
    Sparkles,
    Star,
    Target,
    Users,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  labelKey?: string;
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

// M14: Admin sub-navigation items
const adminSubItems: NavItem[] = [
  { labelKey: 'nav.systemControlCenter', label: 'System Control Center', href: '/admin', icon: Activity },
  { labelKey: 'nav.users', label: 'Users', href: '/admin/users', icon: Users },
  { labelKey: 'nav.roles', label: 'Roles', href: '/admin/roles', icon: Lock },
  { labelKey: 'nav.dataSources', label: 'Data Sources', href: '/admin/data-sources', icon: Database },
  { labelKey: 'nav.rules', label: 'Rules', href: '/admin/rules', icon: Cog },
  { labelKey: 'nav.aiControl', label: 'AI Control', href: '/admin/ai', icon: Cpu },
  { labelKey: 'nav.satellites', label: 'Satellites', href: '/admin/satellites', icon: Satellite },
  { labelKey: 'nav.jobs', label: 'Jobs', href: '/admin/jobs', icon: Play },
  { labelKey: 'nav.health', label: 'Health', href: '/admin/health', icon: Activity },
  { labelKey: 'nav.auditLogs', label: 'Audit Logs', href: '/admin/audit', icon: FileSearch },
  { labelKey: 'nav.security', label: 'Security', href: '/admin/security', icon: Shield },
];

// M14: MP Command Center sub-navigation items
const mpSubItems: NavItem[] = [
  { labelKey: 'nav.myConstituency', label: 'My Constituency', href: '/mp', icon: Home },
  { labelKey: 'nav.projects', label: 'Projects', href: '/mp/projects', icon: FolderOpenDot },
  { labelKey: 'nav.map', label: 'Map', href: '/mp/map', icon: MapPin },
  { labelKey: 'nav.finance', label: 'Finance', href: '/mp/finance', icon: DollarSign },
  { labelKey: 'nav.reports', label: 'Reports', href: '/mp/reports', icon: FileText },
  { labelKey: 'nav.demand', label: 'Demand', href: '/mp/demand', icon: Target },
  { labelKey: 'nav.intel', label: 'Intel', href: '/mp/intel', icon: BarChart3 },
  { labelKey: 'nav.signals', label: 'Signals', href: '/mp/signals', icon: Signal },
];

const adminItems: NavItem[] = [
  { labelKey: 'nav.dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.projects', label: 'Projects', href: '/projects', icon: FolderOpenDot },
  { labelKey: 'nav.map', label: 'Map View', href: '/map-view', icon: Map },
  { labelKey: 'nav.analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { labelKey: 'nav.assets', label: 'Sectors', href: '/sectors', icon: Layers },
  { labelKey: 'nav.anomalies', label: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
  { labelKey: 'nav.reports', label: 'Reports', href: '/reports', icon: FileText },
  { labelKey: 'nav.risk', label: 'Intelligence', href: '/intelligence', icon: ShieldAlert },
  { labelKey: 'nav.notifications', label: 'Alerts', href: '/alerts', icon: ListChecks },
  { labelKey: 'nav.inspections', label: 'Verification', href: '/verification', icon: ScanSearch },
  { labelKey: 'nav.mps', label: 'MPs', href: '/mps', icon: Users },
  { labelKey: 'nav.vendors', label: 'Vendors', href: '/vendors', icon: Briefcase },
  { labelKey: 'nav.documents', label: 'Documents', href: '/documents', icon: FileArchive },
  { labelKey: 'nav.notifications', label: 'Notifications', href: '/notifications', icon: Bell },
  { labelKey: 'nav.officer', label: 'Officer', href: '/officer', icon: Shield },
  { labelKey: 'nav.admin', label: 'Admin', href: '/admin', icon: Shield, children: adminSubItems },
  { labelKey: 'nav.settings', label: 'Settings', href: '/settings', icon: Settings },
];

const contractorItems: NavItem[] = [
  { labelKey: 'nav.contractorProjects', label: 'My Projects', href: '/contractor', icon: HardHat },
  { labelKey: 'nav.milestones', label: 'Milestones', href: '/contractor/milestones', icon: Flag },
  { labelKey: 'nav.documents', label: 'Documents', href: '/contractor/documents', icon: FileCheck2 },
  { labelKey: 'nav.payments', label: 'Payments', href: '/contractor/payments', icon: CreditCard },
  { labelKey: 'nav.issues', label: 'Issues', href: '/contractor/issues', icon: AlertTriangle },
  { labelKey: 'nav.responses', label: 'Responses', href: '/contractor/responses', icon: MessageSquare },
  { labelKey: 'nav.settings', label: 'Settings', href: '/settings', icon: Settings },
];

const citizenItems: NavItem[] = [
  { labelKey: 'nav.citizenHome', label: 'Citizen Home', href: '/citizen', icon: Home },
  { labelKey: 'nav.myReports', label: 'My Reports', href: '/citizen/reports', icon: FileBadge },
  { labelKey: 'nav.nearbyProjects', label: 'Nearby Projects', href: '/citizen/projects', icon: MapPin },
  { labelKey: 'nav.watchlist', label: 'Watchlist', href: '/citizen/watchlist', icon: Star },
  { labelKey: 'nav.aiAssistant', label: 'AI Assistant', href: '#', icon: Sparkles },
  { labelKey: 'nav.settings', label: 'Settings', href: '/settings', icon: Settings },
];

// M14: MP Command Center items
const mpItems: NavItem[] = [
  { labelKey: 'nav.myConstituency', label: 'My Constituency', href: '/mp', icon: Home },
  { labelKey: 'nav.projects', label: 'Projects', href: '/mp/projects', icon: FolderOpenDot },
  { labelKey: 'nav.map', label: 'Map', href: '/mp/map', icon: MapPin },
  { labelKey: 'nav.finance', label: 'Finance', href: '/mp/finance', icon: DollarSign },
  { labelKey: 'nav.reports', label: 'Reports', href: '/mp/reports', icon: FileText },
  { labelKey: 'nav.demand', label: 'Demand', href: '/mp/demand', icon: Target },
  { labelKey: 'nav.intel', label: 'Intel', href: '/mp/intel', icon: BarChart3 },
  { labelKey: 'nav.signals', label: 'Signals', href: '/mp/signals', icon: Signal },
];

// M14: Officer Command Center items
const officerItems: NavItem[] = [
  { labelKey: 'nav.verificationCommand', label: 'Verification Command', href: '/officer', icon: ShieldAlert },
  { labelKey: 'nav.verificationQueue', label: 'Verification Queue', href: '/officer/verification', icon: ScanSearch },
  { labelKey: 'nav.investigations', label: 'Investigations', href: '/officer/investigations', icon: FileSearch },
  { labelKey: 'nav.evidenceCenter', label: 'Evidence Center', href: '/officer/evidence', icon: FileArchive },
  { labelKey: 'nav.fieldMode', label: 'Field Mode', href: '/officer/field', icon: MapPin },
  { labelKey: 'nav.map', label: 'Map', href: '/officer/map', icon: Map },
  { labelKey: 'nav.responses', label: 'Responses', href: '/officer/responses', icon: MessageSquare },
  { labelKey: 'nav.allProjects', label: 'All Projects', href: '/projects', icon: FolderOpenDot },
  { labelKey: 'nav.settings', label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { isContractor, isCitizen, isMP, isOfficer } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['/admin']));

  // Determine which items to show based on role
  let items: NavItem[];
  let roleLabel: string | null = null;

  if (isOfficer) {
    items = officerItems;
    roleLabel = t('nav.officer', 'Officer');
  } else if (isMP) {
    items = mpItems;
    roleLabel = t('nav.mp', 'MP');
  } else if (isContractor) {
    items = contractorItems;
    roleLabel = t('nav.contractor', 'Contractor');
  } else if (isCitizen) {
    items = citizenItems;
    roleLabel = t('nav.citizen', 'Citizen');
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
    const label = item.labelKey ? t(item.labelKey, item.label) : item.label;

    return (
      <div key={item.href}>
        <Link
          href={hasChildren ? '#' : item.href}
          onClick={hasChildren ? (e) => { e.preventDefault(); toggleExpanded(item.href); } : undefined}
          className={cn(
            'flex items-center gap-3 px-3 h-10 rounded-[10px] text-[14px] font-medium tracking-[-0.01em] transition-colors',
            isActive
              ? 'bg-[#007AFF]/[0.12] text-[#007AFF] font-semibold'
              : 'text-[#48484A] hover:bg-black/[0.04] hover:text-[#1C1C1E]',
            depth > 0 && 'ml-6 h-8 text-[13px]'
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon className={cn('h-[18px] w-[18px] shrink-0', depth > 0 && 'h-4 w-4')} aria-hidden="true" />
          <span className="flex-1">{label}</span>
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
      className="w-60 bg-[#F9F9FB] border-r border-black/[0.06] h-screen flex flex-col sticky top-0"
      role="complementary"
      aria-label="Sidebar"
    >
      {/* Logo */}
      <div className="px-4 h-16 ios-hairline-b flex items-center gap-2 shrink-0">
        <Logo size={30} wordmarkClassName="!text-[16px]" />
        {roleLabel && (
          <span className={cn(
            'ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold tracking-[-0.01em]',
            isOfficer ? 'bg-[#FF3B30]/10 text-[#D70015]' :
            isMP ? 'bg-[#5856D6]/10 text-[#5856D6]' :
            isContractor ? 'bg-[#FF9500]/10 text-[#C96B00]' :
            isCitizen ? 'bg-[#34C759]/10 text-[#248A3D]' : ''
          )}>
            {roleLabel}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => renderNavItem(item))}
      </nav>

      <div className="px-4 h-10 ios-hairline-t flex items-center text-[11px] text-[#8E8E93] font-medium tracking-[-0.01em] shrink-0">
        VOJAS 2.0
      </div>
    </aside>
  );
}
