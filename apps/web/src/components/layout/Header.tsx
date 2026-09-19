'use client';

import { AICopilotDrawer } from '@/components/ai-agent/AICopilotDrawer';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationCount } from '@/hooks/useNotifications';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Bell, ChevronDown, LogOut, Sparkles, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function Header() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = 'user-menu-dropdown';
  const { data: notifCount } = useNotificationCount();
  const unread = notifCount?.unreadCount ?? 0;

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Keyboard navigation for menu
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const onLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <header className="ios-material-thick ios-hairline-b sticky top-0 z-10">
      <div className="px-6 h-16 flex items-center justify-end gap-2">
        {/* AI Copilot Trigger */}
        <button
          type="button"
          onClick={() => setCopilotOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-[#5856D6]/10 text-[#5856D6] hover:bg-[#5856D6]/[0.16] text-[13px] font-semibold tracking-[-0.01em] transition-all active:scale-[0.97] cursor-pointer"
          aria-label={t('common.aiCopilot', 'AI Copilot')}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.aiCopilot', 'AI Copilot')}</span>
        </button>

        {/* Language selector */}
        <LanguageSelector variant="compact" />

        {/* Notification bell */}
        <Link
          href="/notifications"
          className="relative h-9 w-9 flex items-center justify-center rounded-[10px] hover:bg-black/[0.04] transition-colors text-[#48484A]"
          aria-label={`${t('common.notifications', 'Notifications')}${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="h-[19px] w-[19px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[17px] h-[17px] bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none ring-2 ring-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            onKeyDown={handleMenuKeyDown}
            className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full hover:bg-black/[0.04] text-[13px] font-medium text-[#1C1C1E] transition-colors"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-[12px] font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? <UserIcon className="h-3.5 w-3.5" />}
            </div>
            <span className="hidden sm:inline">{user?.email}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#8E8E93]" aria-hidden="true" />
          </button>

          {open && (
            <div
              id={menuId}
              role="menu"
              className={cn(
                'absolute right-0 mt-2 w-52 bg-white rounded-[14px] border border-black/[0.06] shadow-ios-floating py-1.5 z-20',
                'animate-[ios-sheet-in_0.16s_cubic-bezier(0.32,0.72,0,1)]'
              )}
            >
              <div className="px-3.5 py-2.5 ios-hairline-b">
                <p className="text-[13px] font-semibold text-[#1C1C1E] truncate">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-[12px] text-[#8E8E93] truncate">{user?.email}</p>
                {user?.role && (
                  <p className="text-[11px] text-[#007AFF] font-medium mt-0.5">{user.role}</p>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                aria-label={t('common.signOut', 'Sign out')}
                className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/[0.06] flex items-center gap-2 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t('common.signOut', 'Sign out')}
              </button>
            </div>
          )}
        </div>
      </div>

      <AICopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </header>
  );
}
