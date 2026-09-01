/**
 * Satellite Imagery API — VOJAS
 */

import { api } from "./api";
import type { SatelliteCapture, SatelliteAssessment, TimelinePoint } from "@/types/satellite-types";

const SATELLITE_BASE = "/satellite";

interface CapturesResponse {
  captures: SatelliteCapture[];
  total: number;
}

interface TimelineResponse {
  timeline: TimelinePoint[];
  total: number;
}

interface AnalyzeResponse {
  assessment: SatelliteAssessment;
}

export const satelliteApi = {
  /** GET /satellite/:projectId/captures */
  getCaptures(projectId: string, params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const query = qs.toString() ? `?${qs}` : "";
    return api.get<CapturesResponse>(`${SATELLITE_BASE}/${projectId}/captures${query}`);
  },

  /** GET /satellite/:projectId/captures/latest */
  getLatestCapture(projectId: string) {
    return api.get<{ capture: SatelliteCapture }>(`${SATELLITE_BASE}/${projectId}/captures/latest`);
  },

  /** GET /satellite/:projectId/timeline */
  getTimeline(projectId: string) {
    return api.get<TimelineResponse>(`${SATELLITE_BASE}/${projectId}/timeline`);
  },

  /** GET /satellite/captures/:captureId */
  getCapture(captureId: string) {
    return api.get<{ capture: SatelliteCapture }>(`${SATELLITE_BASE}/captures/${captureId}`);
  },

  /** POST /satellite/:projectId/analyze */
  analyze(projectId: string, body?: { from?: string; to?: string }) {
    return api.post<AnalyzeResponse>(`${SATELLITE_BASE}/${projectId}/analyze`, body ?? {});
  },
};
