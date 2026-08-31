import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi, type NotificationsListResponse } from "@/services/notification-api";
import { qk } from "./query-keys";

export function useNotifications(opts: { unreadOnly?: boolean; page?: number; limit?: number } = {}) {
  return useQuery<NotificationsListResponse>({
    queryKey: qk.notifications(opts),
    queryFn: () => notificationApi.list(opts),
    staleTime: 15_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: qk.notificationsUnreadCount(),
    queryFn: () => notificationApi.unreadCount(),
    staleTime: 15_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<{ markedCount: number; unreadCount: number }, Error, string[]>({
    mutationFn: (ids) => notificationApi.markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<{ markedCount: number }, Error, void>({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => notificationApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
