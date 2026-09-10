'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, BellOff, Filter } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useNotifications,
  useNotificationCount,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { formatDateTime } from '@/lib/utils';

const TYPE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ANOMALY_DETECTED: 'danger',
  ANOMALY_ESCALATED: 'danger',
  REPORT_SUBMITTED: 'warning',
  REPORT_ASSIGNED: 'info',
  RISK_FINDING_NEW: 'warning',
  RISK_FINDING_ESCALATED: 'danger',
  DOCUMENT_UPLOADED: 'info',
  DOCUMENT_VERIFIED: 'success',
  PROJECT_CREATED: 'info',
  PROJECT_UPDATED: 'neutral',
};

const TYPE_ICON: Record<string, string> = {
  ANOMALY_DETECTED: '⚠️',
  ANOMALY_ESCALATED: '🚨',
  REPORT_SUBMITTED: '📝',
  REPORT_ASSIGNED: '📌',
  RISK_FINDING_NEW: '⚠️',
  RISK_FINDING_ESCALATED: '🚨',
  DOCUMENT_UPLOADED: '📄',
  DOCUMENT_VERIFIED: '✓',
  PROJECT_CREATED: '🆕',
  PROJECT_UPDATED: '🔄',
};

function getNotificationHref(resource?: string, resourceId?: string): string | null {
  if (!resource || !resourceId) return null;
  if (resource === 'anomaly') return '/anomalies';
  if (resource === 'report') return '/reports';
  if (resource === 'project') return `/projects/${resourceId}`;
  return null;
}

export function NotificationsClient() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading, error } = useNotifications({
    isRead: filter === 'unread' ? false : undefined,
    limit: 100,
  });
  const { data: count } = useNotificationCount();
  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const unreadCount = count?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading…' : `${notifications.length} notifications · ${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          leftIcon={<Filter className="h-3.5 w-3.5" />}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter === 'unread' ? 'primary' : 'secondary'}
          onClick={() => setFilter('unread')}
          leftIcon={<Bell className="h-3.5 w-3.5" />}
        >
          Unread ({unreadCount})
        </Button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load notifications'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <BellOff className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'unread' ? "You're all caught up!" : 'No notifications yet'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const href = getNotificationHref(n.resource, n.resourceId);
            const cardClass = `block transition-colors ${!n.isRead ? 'border-l-4 border-l-vojas-500' : ''}`;
            const inner = (
              <CardBody className="flex items-start gap-3">
                <div className="text-2xl shrink-0 mt-0.5">
                  {TYPE_ICON[n.type] ?? '🔔'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'} text-slate-900`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        TYPE_VARIANT[n.type] === 'danger' ? 'bg-red-50 text-red-700 border-red-200' :
                        TYPE_VARIANT[n.type] === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        TYPE_VARIANT[n.type] === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                        TYPE_VARIANT[n.type] === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead.mutate([n.id]);
                        }}
                        className="text-xs text-vojas-600 hover:text-vojas-700 font-medium"
                        aria-label="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </CardBody>
            );
            return href ? (
              <Link key={n.id} href={href} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <Card key={n.id} className={cardClass}>
                {inner}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
