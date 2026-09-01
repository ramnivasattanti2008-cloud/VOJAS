/**
 * Extended analytics hooks — MP, Vendor, Longitudinal, Geocoding.
 * Mirrors the backend services/mpaAnalyticsService.ts and geocodingService.ts.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { qk } from "./query-keys";

// ─── Helpers ────────────────────────────────────────────────────────────────

export const TERM_LABELS: Record<LokSabhaTerm, string> = {
  FIFTEENTH: "15th Lok Sabha (2009–2014)",
  SIXTEENTH: "16th Lok Sabha (2014–2019)",
  SEVENTEENTH: "17th Lok Sabha (2019–2024)",
  EIGHTEENTH: "18th Lok Sabha (2024–2029)",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type LokSabhaTerm = "FIFTEENTH" | "SIXTEENTH" | "SEVENTEENTH" | "EIGHTEENTH";

export interface MPOwnerOverview {
  totalMPs: number;
  byHouse: Record<string, number>;
  byTerm: Record<string, number>;
  topStates: { state: string; count: number }[];
  avgProjectsPerMP: number;
}

export interface MPTermTrend {
  term: LokSabhaTerm;
  totalProjects: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationPct: number;
  avgPerProject: number;
  anomalyCount: number;
}

export interface MonthlyTrend {
  month: string;
  recommended: number;
  completed: number;
  spent: number;
}

export interface MPTrendsData {
  byTerm: MPTermTrend[];
  monthly: MonthlyTrend[];
}

export interface VendorOverview {
  totalVendors: number;
  totalPaid: number;
  avgPaidPerVendor: number;
  crossStateRisk: number;
  crossConstituencyRisk: number;
  byPaymentStatus: Record<string, number>;
  topStates: { state: string; totalPaid: number; count: number }[];
}

export interface VendorBenchmark {
  vendorId: string;
  vendorName: string;
  totalPaid: number;
  projectCount: number;
  constituencyCount: number;
  uniqueDistricts: number;
  uniqueStates: number;
  crossConstituencyRisk: boolean;
  crossStateRisk: boolean;
  percentile: number;
}

export interface LongitudinalTerm {
  term: LokSabhaTerm;
  totalProjects: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationPct: number;
}

export interface LongitudinalStateTerm {
  state: string;
  term: LokSabhaTerm;
  projectCount: number;
  totalSanctioned: number;
  totalSpent: number;
  utilizationPct: number;
}

export interface LongitudinalData {
  byTerm: LongitudinalTerm[];
  byStateTerm: LongitudinalStateTerm[];
  topStatesByTerm: Record<LokSabhaTerm, { state: string; totalSanctioned: number }[]>;
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  source: "LGD" | "STATE_CENTROID" | "NOT_FOUND";
  canonicalName?: string;
  lgdCode?: string;
  confidence: number;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export const analyticsApi = {
  mpOverview: () => api.get<MPOwnerOverview>("/analytics/mp-summary"),
  mpTrends: (id: string) => api.get<MPTrendsData>(`/analytics/mp/${id}/trends`),
  vendorOverview: () => api.get<VendorOverview>("/analytics/vendor-summary"),
  vendorTop: (limit = 50) => api.get<VendorBenchmark[]>(`/analytics/vendor-top?limit=${limit}`),
  longitudinal: () => api.get<LongitudinalData>("/analytics/longitudinal"),
  geocode: (state: string, district: string) =>
    api.get<GeocodedLocation | null>(`/geocoding/lookup?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`),
  geocodeBackfill: (dryRun?: boolean) =>
    api.post<{ scanned: number; hit: number; fallback: number; miss: number }>("/geocoding/backfill", { dryRun }),
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useMPOverview() {
  return useQuery({
    queryKey: qk.mpOverview(),
    queryFn: () => analyticsApi.mpOverview(),
    staleTime: 5 * 60_000,
  });
}

export function useMPTrends(id: string | undefined) {
  return useQuery({
    queryKey: qk.mpTrends(id ?? ""),
    queryFn: () => analyticsApi.mpTrends(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useVendorOverview() {
  return useQuery({
    queryKey: qk.vendorOverview(),
    queryFn: () => analyticsApi.vendorOverview(),
    staleTime: 5 * 60_000,
  });
}

export function useVendorTop(limit = 50) {
  return useQuery({
    queryKey: qk.vendorTop(limit),
    queryFn: () => analyticsApi.vendorTop(limit),
    staleTime: 5 * 60_000,
  });
}

export function useLongitudinal() {
  return useQuery({
    queryKey: qk.longitudinal(),
    queryFn: () => analyticsApi.longitudinal(),
    staleTime: 10 * 60_000,
  });
}
