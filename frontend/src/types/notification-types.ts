// ── Notification Types ─────────────────────────────────────────────────────────

export type NotificationType =
  | "ANOMALY_DETECTED"
  | "ANOMALY_ACKNOWLEDGED"
  | "ANOMALY_RESOLVED"
  | "ANOMALY_ESCALATED"
  | "REPORT_SUBMITTED"
  | "REPORT_ASSIGNED"
  | "RISK_THRESHOLD";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resource?: string | null;
  resourceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  pages: number;
}
