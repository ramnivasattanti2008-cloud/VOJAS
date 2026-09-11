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
    <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04]" aria-label="Main Navigation">
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
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 select-none active:scale-[0.97]',
              isActive
                ? 'text-[#007AFF] bg-white shadow-ios-sm font-bold'
                : 'text-[#3C3C43]/80 hover:text-[#007AFF] hover:bg-white/60'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]')} />
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
    <div className="md:hidden flex items-center gap-1 px-4 py-2 ios-material-thick border-t border-black/[0.05] overflow-x-auto text-xs font-medium text-[#3C3C43] no-scrollbar">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'min-h-[36px] inline-flex items-center px-3 py-1 rounded-full shrink-0 transition-all text-xs font-semibold select-none active:scale-95',
              isActive ? 'bg-[#007AFF] text-white shadow-ios-sm' : 'hover:bg-black/5 text-[#3C3C43]'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

