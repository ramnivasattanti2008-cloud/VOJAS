'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpenDot, AlertTriangle, FileText, Settings,
  ShieldAlert, ListChecks, ScanSearch, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpenDot },
  { label: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Intelligence', href: '/intelligence', icon: ShieldAlert },
  { label: 'Alerts', href: '/alerts', icon: ListChecks },
  { label: 'Verification', href: '/verification', icon: ScanSearch },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0"
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-vojas-600 text-white font-bold flex items-center justify-center">
          V
        </div>
        <span className="font-semibold text-slate-900">VOJAS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-vojas-50 text-vojas-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        v2.0.0
      </div>
    </aside>
  );
}
