import type { ApiClient } from './client';
import type { Notification, NotificationCount, PaginatedResponse } from './types';

export function createNotificationApi(client: ApiClient) {
  return {
    list(params?: { isRead?: boolean; type?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Notification> & { unreadCount: number }>(
        '/api/v1/notifications',
        params as Record<string, string | number | boolean | undefined>
      );
    },
    count() {
      return client.get<NotificationCount>('/api/v1/notifications/count');
    },
    markRead(notificationIds: string[]) {
      return client.post<{ updated: number }>('/api/v1/notifications/mark-read', { notificationIds });
    },
    markAllRead() {
      return client.post<{ updated: number }>('/api/v1/notifications/mark-all-read');
    },
    delete(id: string) {
      return client.delete<void>(`/api/v1/notifications/${id}`);
    },
  };
}
