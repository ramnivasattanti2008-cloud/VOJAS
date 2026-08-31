import { describe, it, expect, vi, beforeEach } from "vitest";
import { anomalyApi } from "@/services/anomaly-api";

// Mock the api module
vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/services/api";

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("anomalyApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("builds a query string with default pagination", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await anomalyApi.list({});

      expect(mockedApi.get).toHaveBeenCalledOnce();
      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/anomalies?");
      expect(url).toContain("page=1");
      expect(url).toContain("limit=20");
    });

    it("includes status filter when provided", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await anomalyApi.list({ status: "OPEN" });

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("status=OPEN");
    });

    it("includes severity filter when provided", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await anomalyApi.list({ severity: "HIGH" });

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("severity=HIGH");
    });

    it("includes projectId filter when provided", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await anomalyApi.list({ projectId: "proj-123" });

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("projectId=proj-123");
    });
  });

  describe("stats", () => {
    it("returns the stats data from the response", async () => {
      const mockStats = { total: 10, open: 5, critical: 2, high: 3, medium: 4, low: 1, byCategory: [] };
      mockedApi.get.mockResolvedValue({ data: mockStats });

      const result = await anomalyApi.stats();

      expect(result).toEqual(mockStats);
    });
  });

  describe("acknowledge", () => {
    it("posts to the acknowledge endpoint", async () => {
      const mockAnomaly = { id: "anom-1", title: "Test Anomaly", status: "ACKNOWLEDGED" } as any;
      mockedApi.post.mockResolvedValue({ data: { anomaly: mockAnomaly } });

      const result = await anomalyApi.acknowledge("anom-1");

      expect(mockedApi.post).toHaveBeenCalledWith("/anomalies/anom-1/acknowledge", {});
      expect(result).toEqual(mockAnomaly);
    });
  });

  describe("resolve", () => {
    it("posts resolution to the resolve endpoint", async () => {
      const mockAnomaly = { id: "anom-1", status: "RESOLVED" } as any;
      mockedApi.post.mockResolvedValue({ data: { anomaly: mockAnomaly } });

      const result = await anomalyApi.resolve("anom-1", "Fixed by inspection");

      expect(mockedApi.post).toHaveBeenCalledWith("/anomalies/anom-1/resolve", { resolution: "Fixed by inspection" });
      expect(result).toEqual(mockAnomaly);
    });
  });

  describe("scan", () => {
    it("posts to the scan endpoint and returns the result", async () => {
      const mockResult = { newAnomalies: 3, totalAnomalies: 10, ruleCounts: { "cost-outlier": 2 } };
      mockedApi.post.mockResolvedValue({ data: mockResult });

      const result = await anomalyApi.scan();

      expect(mockedApi.post).toHaveBeenCalledWith("/anomalies/scan", {});
      expect(result).toEqual(mockResult);
    });
  });

  describe("listRules", () => {
    it("returns rules from the API", async () => {
      const mockRules = [{ id: "rule-1", name: "Cost Outlier", enabled: true }] as any;
      mockedApi.get.mockResolvedValue({ data: { rules: mockRules } });

      const result = await anomalyApi.listRules();

      expect(mockedApi.get).toHaveBeenCalledWith("/anomalies/rules");
      expect(result).toEqual(mockRules);
    });
  });

  describe("updateRule", () => {
    it("puts enabled state to the correct endpoint", async () => {
      const mockRule = { id: "rule-1", enabled: false } as any;
      mockedApi.put.mockResolvedValue({ data: { rule: mockRule } });

      const result = await anomalyApi.updateRule("rule-1", false);

      expect(mockedApi.put).toHaveBeenCalledWith("/anomalies/rules/rule-1", { enabled: false });
      expect(result).toEqual(mockRule);
    });
  });
});
