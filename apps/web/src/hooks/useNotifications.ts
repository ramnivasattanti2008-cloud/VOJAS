'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createNotificationApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';

const notificationApi = createNotificationApi(apiClient);

export function useNotifications(params?: { isRead?: boolean; type?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.list(params as Record<string, string | number | boolean | undefined>),
  });
}

export function useNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => notificationApi.count(),
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
