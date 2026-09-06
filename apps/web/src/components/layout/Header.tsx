'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, LogOut, User as UserIcon, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="px-6 py-3 flex items-center justify-end gap-3">
        {/* Notification bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            onKeyDown={handleMenuKeyDown}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-vojas-100 text-vojas-700 flex items-center justify-center text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
            </div>
            <span className="hidden sm:inline">{user?.email}</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {open && (
            <div
              id={menuId}
              role="menu"
              className={cn(
                'absolute right-0 mt-2 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-20'
              )}
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                {user?.role && (
                  <p className="text-xs text-vojas-600 mt-0.5">{user.role}</p>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                aria-label="Sign out"
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
