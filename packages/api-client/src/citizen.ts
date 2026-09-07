import type { ApiClient } from './client';
import type { PaginatedResponse } from './types';

// ── Citizen-specific types ──────────────────────────────────────────────────────

export interface CitizenProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export interface CitizenReportSummary {
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  escalatedReports: number;
}

export interface CitizenWatchlistItem {
  id: string;
  projectId: string;
  projectName: string;
  projectSector: string;
  projectStatus: string;
  followedAt: string;
  lastChecked?: string;
  updateCount: number;
  hasAnomalies: boolean;
}

export interface NearbyProject {
  id: string;
  name: string;
  sector: string;
  status: string;
  state: string;
  district: string;
  distanceKm?: number;
  progressPercent?: number;
  approvedAmount?: number;
  spentAmount?: number;
  lastUpdated?: string;
}

export interface CitizenNotification {
  id: string;
  type: 'REPORT_UPDATE' | 'PROJECT_UPDATE' | 'ANOMALY_ALERT' | 'SYSTEM';
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CitizenSettings {
  notificationsEnabled: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  proximityAlertRadius: number; // in km
  preferredLanguage: string;
}

// ── API Functions ───────────────────────────────────────────────────────────────

export function createCitizenApi(client: ApiClient) {
  return {
    // Get citizen profile
    getProfile() {
      return client.get<CitizenProfile>('/citizen/profile');
    },

    // Update citizen profile
    updateProfile(payload: Partial<CitizenProfile>) {
      return client.patch<CitizenProfile>('/citizen/profile', payload);
    },

    // Get citizen settings
    getSettings() {
      return client.get<CitizenSettings>('/citizen/settings');
    },

    // Update citizen settings
    updateSettings(payload: Partial<CitizenSettings>) {
      return client.patch<CitizenSettings>('/citizen/settings', payload);
    },

    // Get report summary for citizen
    getReportSummary() {
      return client.get<CitizenReportSummary>('/citizen/reports/summary');
    },

    // Get watchlist
    getWatchlist() {
      return client.get<CitizenWatchlistItem[]>('/citizen/watchlist');
    },

    // Add to watchlist
    addToWatchlist(projectId: string) {
      return client.post<CitizenWatchlistItem>('/citizen/watchlist', { projectId });
    },

    // Remove from watchlist
    removeFromWatchlist(projectId: string) {
      return client.delete<{ success: boolean }>(`/citizen/watchlist/${projectId}`);
    },

    // Get nearby projects
    getNearbyProjects(params: { latitude: number; longitude: number; radiusKm?: number; limit?: number }) {
      return client.get<NearbyProject[]>('/citizen/nearby', params);
    },

    // Get citizen notifications
    getNotifications(params?: { limit?: number; unreadOnly?: boolean }) {
      return client.get<PaginatedResponse<CitizenNotification>>('/citizen/notifications', params as Record<string, any>);
    },

    // Mark notification as read
    markNotificationRead(id: string) {
      return client.post<CitizenNotification>(`/citizen/notifications/${id}/read`);
    },

    // Mark all notifications as read
    markAllNotificationsRead() {
      return client.post<{ success: boolean }>('/citizen/notifications/read-all');
    },

    // Get unverified claims
    getUnverifiedClaims() {
      return client.get<PaginatedResponse<{
        id: string;
        type: string;
        description: string;
        projectId?: string;
        projectName?: string;
        reportedAt: string;
      }>>('/citizen/claims', { status: 'UNVERIFIED' });
    },
  };
}

export type CitizenApi = ReturnType<typeof createCitizenApi>;
