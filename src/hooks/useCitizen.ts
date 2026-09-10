'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCitizenApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import type {
  CitizenProfile,
  CitizenSettings,
  CitizenReportSummary,
  CitizenWatchlistItem,
  NearbyProject,
  CitizenNotification,
} from '@vojas/api-client';

const citizenApi = createCitizenApi(apiClient);

// Profile hooks
export function useCitizenProfile() {
  return useQuery({
    queryKey: ['citizen', 'profile'],
    queryFn: () => citizenApi.getProfile(),
  });
}

export function useUpdateCitizenProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CitizenProfile>) => citizenApi.updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen', 'profile'] });
    },
  });
}

// Settings hooks
export function useCitizenSettings() {
  return useQuery({
    queryKey: ['citizen', 'settings'],
    queryFn: () => citizenApi.getSettings(),
  });
}

export function useUpdateCitizenSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CitizenSettings>) => citizenApi.updateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen', 'settings'] });
    },
  });
}

// Report summary hook
export function useCitizenReportSummary() {
  return useQuery({
    queryKey: ['citizen', 'report-summary'],
    queryFn: () => citizenApi.getReportSummary(),
  });
}

// Watchlist hooks
export function useCitizenWatchlist() {
  return useQuery({
    queryKey: ['citizen', 'watchlist'],
    queryFn: () => citizenApi.getWatchlist(),
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => citizenApi.addToWatchlist(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen', 'watchlist'] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => citizenApi.removeFromWatchlist(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen', 'watchlist'] });
    },
  });
}

// Nearby projects hook
export function useNearbyProjects(params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['citizen', 'nearby', params],
    queryFn: () => citizenApi.getNearbyProjects(params),
    enabled: params.latitude !== 0 && params.longitude !== 0,
  });
}

// Notifications hooks
export function useCitizenNotifications(params?: { limit?: number; unreadOnly?: boolean }) {
  return useQuery({
    queryKey: ['citizen', 'notifications', params],
    queryFn: () => citizenApi.getNotifications(params),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => citizenApi.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen', 'notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => citizenApi.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen', 'notifications'] });
    },
  });
}

// Unverified claims hook
export function useUnverifiedClaims() {
  return useQuery({
    queryKey: ['citizen', 'claims'],
    queryFn: () => citizenApi.getUnverifiedClaims(),
  });
}
