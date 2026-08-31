import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { qk } from "./query-keys";
import type { MapOverview, Location, ProjectStatus } from "@/types";

export interface MapFilters {
  status?: ProjectStatus | "";
  state?: string;
}

export const mapApi = {
  overview: (filters: MapFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.state) params.set("state", filters.state);
    return api.get<MapOverview>(`/locations/map/overview?${params.toString()}`);
  },
  projectLocations: (projectId: string) =>
    api.get<{ locations: Location[]; total: number }>(`/locations/project/${projectId}`),
};

export function useMapOverview(filters: MapFilters = {}) {
  return useQuery({
    queryKey: qk.mapOverview(filters),
    queryFn: () => mapApi.overview(filters),
    staleTime: 30_000,
  });
}

export function useProjectLocations(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.projectLocations(projectId ?? ""),
    queryFn: () => mapApi.projectLocations(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}
