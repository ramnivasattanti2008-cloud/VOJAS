import { api } from "./api";

export type NotificationType =
  | "ANOMALY_DETECTED"
  | "ANOMALY_ACKNOWLEDGED"
  | "ANOMALY_RESOLVED"
  | "ANOMALY_ESCALATED"
  | "REPORT_SUBMITTED"
  | "REPORT_ASSIGNED"
  | "RISK_THRESHOLD";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resource: string | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const notificationApi = {
  /** List notifications for the current user (paginated) */
  list(opts?: { unreadOnly?: boolean; page?: number; limit?: number }): Promise<NotificationsListResponse> {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set("unreadOnly", "true");
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return api.get<NotificationsListResponse>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  /** Lightweight unread count */
  unreadCount(): Promise<{ count: number }> {
    return api.get<{ count: number }>("/notifications/unread-count");
  },

  /** Mark a batch of notification ids as read */
  markRead(ids: string[]): Promise<{ markedCount: number; unreadCount: number }> {
    return api.patch<{ markedCount: number; unreadCount: number }>("/notifications/read", { ids });
  },

  /** Mark all of the current user's notifications as read */
  markAllRead(): Promise<{ markedCount: number }> {
    return api.post<{ markedCount: number }>("/notifications/read-all", {});
  },

  /** Delete a single notification */
  remove(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/notifications/${id}`);
  },
};
