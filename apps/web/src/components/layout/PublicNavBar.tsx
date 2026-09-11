'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { BarChart3, FileText, MapPin, Satellite, Search, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function PublicNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const links = [
    {
      href: '/explore',
      label: t('nav.projects', 'Explore Projects'),
      icon: Search,
      exact: true,
    },
    {
      href: '/explore/map',
      label: t('nav.map', 'Project Map'),
      icon: MapPin,
    },
    {
      href: '/budget',
      label: t('nav.financial', 'Budget Tracker'),
      icon: Wallet,
    },
    {
      href: '/insights',
      label: t('nav.analytics', 'Sector Analytics'),
      icon: BarChart3,
    },
    {
      href: '/satellites',
      label: t('nav.satellite', 'Satellite Engine'),
      icon: Satellite,
    },
    {
      href: '/report',
      label: t('nav.reports', 'Report Discrepancy'),
      icon: FileText,
    },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all',
              isActive
                ? 'text-blue-600 bg-blue-50/80'
                : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-blue-600' : 'text-slate-500')} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function PublicMobileNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const links = [
    { href: '/explore', label: t('nav.projects', 'Explore') },
    { href: '/explore/map', label: t('nav.map', 'Map') },
    { href: '/budget', label: t('nav.financial', 'Budget') },
    { href: '/insights', label: t('nav.analytics', 'Analytics') },
    { href: '/satellites', label: t('nav.satellite', 'Satellite') },
    { href: '/report', label: t('nav.reports', 'Report') },
  ];

  return (
    <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-slate-100/80 border-t border-slate-200 overflow-x-auto text-xs font-medium text-slate-600 no-scrollbar">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-2.5 py-1 rounded-md shrink-0 transition-colors',
              isActive ? 'bg-white text-blue-600 font-semibold shadow-2xs' : 'hover:bg-white'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

