/**
 * Satellite Imagery React Query hooks — VOJAS
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { satelliteApi } from "@/services/satellite-api";
import { qk } from "./query-keys";

// ── Query options ──────────────────────────────────────────────────────────────

export function useSatelliteCaptures(
  projectId: string | undefined,
  options?: { from?: string; to?: string }
) {
  return useQuery({
    queryKey: qk.satelliteCaptures(projectId ?? "", options),
    queryFn: () => satelliteApi.getCaptures(projectId!, options),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 min — satellite data doesn't change frequently
  });
}

export function useLatestCapture(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.satelliteLatestCapture(projectId ?? ""),
    queryFn: () => satelliteApi.getLatestCapture(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSatelliteTimeline(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.satelliteTimeline(projectId ?? ""),
    queryFn: () => satelliteApi.getTimeline(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSatelliteCapture(captureId: string | undefined) {
  return useQuery({
    queryKey: qk.satelliteCapture(captureId ?? ""),
    queryFn: () => satelliteApi.getCapture(captureId!),
    enabled: !!captureId,
    staleTime: 10 * 60 * 1000,
  });
}

// ── AI Analysis ────────────────────────────────────────────────────────────────

export function useSatelliteAnalysis(
  projectId: string | undefined,
  options?: { from?: string; to?: string }
) {
  return useMutation({
    mutationKey: qk.satelliteAnalysis(projectId ?? "", options),
    mutationFn: () => satelliteApi.analyze(projectId!, options),
  });
}
