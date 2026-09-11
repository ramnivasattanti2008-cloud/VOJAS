import type { ApiClient } from './client.js';
import type { Notification, NotificationCount, PaginatedResponse } from './types.js';

export function createNotificationApi(client: ApiClient) {
  return {
    list(params?: { isRead?: boolean; type?: string; page?: number; limit?: number }) {
      return client.get<PaginatedResponse<Notification> & { unreadCount: number }>(
        '/notifications',
        params as Record<string, string | number | boolean | undefined>
      );
    },
    count() {
      return client.get<NotificationCount>('/notifications/count');
    },
    markRead(notificationIds: string[]) {
      return client.post<{ updated: number }>('/notifications/mark-read', { notificationIds });
    },
    markAllRead() {
      return client.post<{ updated: number }>('/notifications/mark-all-read');
    },
    delete(id: string) {
      return client.delete<void>(`/notifications/${id}`);
    },
  };
}
