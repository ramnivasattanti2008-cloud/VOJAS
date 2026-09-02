import { describe, it, expect, vi, beforeEach } from "vitest";
import { riskApi } from "@/services/risk-api";

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import { api } from "@/services/api";

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

describe("riskApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("stats", () => {
    it("calls /risk/stats and returns the data", async () => {
      const mockStats = {
        totalProjects: 8,
        distribution: { LOW: 3, MEDIUM: 3, HIGH: 1, CRITICAL: 1 },
        avgScore: 42,
      };
      // api.get() already unwraps the response envelope, so mock returns the inner data directly
      mockedApi.get.mockResolvedValue(mockStats);

      const result = await riskApi.stats();

      expect(mockedApi.get).toHaveBeenCalledWith("/risk/stats");
      expect(result).toEqual(mockStats);
    });
  });

  describe("list", () => {
    it("uses default pagination when no options given", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });

      await riskApi.list({});

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("page=1");
      expect(url).toContain("limit=50");
    });

    it("includes riskLevel filter when provided", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });

      await riskApi.list({ riskLevel: "HIGH" });

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("riskLevel=HIGH");
    });

    it("includes sortBy and sortOrder when provided", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });

      await riskApi.list({ sortBy: "overallScore", sortOrder: "desc" });

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("sortBy=overallScore");
      expect(url).toContain("sortOrder=desc");
    });
  });

  describe("get", () => {
    it("calls the per-project risk endpoint", async () => {
      const mockRisk = { id: "risk-1", projectId: "proj-1", overallScore: 75 } as any;
      // api.get() already unwraps the response envelope
      mockedApi.get.mockResolvedValue({ risk: mockRisk });

      const result = await riskApi.get("proj-1");

      expect(mockedApi.get).toHaveBeenCalledWith("/risk/proj-1");
      expect(result).toEqual(mockRisk);
    });
  });

  describe("recalculateAll", () => {
    it("posts to the recalculate endpoint and returns projects", async () => {
      const mockProjects = [{ id: "proj-1", overallScore: 80 }] as any;
      // api.post() already unwraps the response envelope
      mockedApi.post.mockResolvedValue({
        message: "Recalculated 8 projects",
        count: 8,
        projects: mockProjects,
      });

      const result = await riskApi.recalculateAll();

      expect(mockedApi.post).toHaveBeenCalledWith("/risk/recalculate", {});
      expect(result.count).toBe(8);
      expect(result.projects).toEqual(mockProjects);
    });
  });

  describe("recalculateOne", () => {
    it("posts to the per-project recalculate endpoint", async () => {
      const mockRisk = { id: "risk-1", projectId: "proj-1", overallScore: 55 } as any;
      mockedApi.post.mockResolvedValue({ risk: mockRisk });

      const result = await riskApi.recalculateOne("proj-1");

      expect(mockedApi.post).toHaveBeenCalledWith("/risk/proj-1/recalculate", {});
      expect(result).toEqual(mockRisk);
    });
  });
});
