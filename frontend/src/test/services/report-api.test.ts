import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api before importing reportApi
vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postForm: vi.fn(),
  },
}));

import { reportApi } from "@/services/report-api";
import { api } from "@/services/api";

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  postForm: ReturnType<typeof vi.fn>;
};

// buildQuery is not exported — test the public surface (submit + list)
describe("reportApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submit", () => {
    it("posts to /reports/submit with the payload", async () => {
      const payload = {
        title: "Pothole on Main Road",
        description: "Deep pothole near bus stop",
        category: "INFRASTRUCTURE",
      };
      const mockResult = { report: { id: "r-1", ...payload }, message: "Report submitted" };
      mockedApi.post.mockResolvedValue(mockResult);

      const result = await reportApi.submit(payload);

      expect(mockedApi.post).toHaveBeenCalledWith("/reports/submit", payload);
      expect(result.report.id).toBe("r-1");
    });

    it("accepts optional reporter fields", async () => {
      mockedApi.post.mockResolvedValue({ report: { id: "r-2" }, message: "" });
      const payload = {
        title: "Water supply issue",
        description: "No water for 3 days",
        category: "WATER",
        reporterName: "Ramesh Kumar",
        reporterPhone: "9876543210",
        isAnonymous: false,
      };

      await reportApi.submit(payload);

      const calledPayload = mockedApi.post.mock.calls[0][1];
      expect(calledPayload).toMatchObject({
        reporterName: "Ramesh Kumar",
        reporterPhone: "9876543210",
        isAnonymous: false,
      });
    });
  });

  describe("list", () => {
    it("calls /reports with default empty params", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await reportApi.list();

      expect(mockedApi.get).toHaveBeenCalledWith("/reports");
    });

    it("includes filters when provided", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await reportApi.list({ status: "OPEN", category: "INFRASTRUCTURE", severity: "HIGH" });

      const url = mockedApi.get.mock.calls[0][0] as string;
      expect(url).toContain("status=OPEN");
      expect(url).toContain("category=INFRASTRUCTURE");
      expect(url).toContain("severity=HIGH");
    });

    it("skips undefined/null/empty filter values", async () => {
      mockedApi.get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await reportApi.list({ status: "", category: undefined, page: 1 });

      const url = mockedApi.get.mock.calls[0][0] as string;
      // Only page should appear; status and category are skipped because they are empty/undefined
      expect(url).toBe("/reports?page=1");
    });
  });

  describe("stats", () => {
    it("returns stats from /reports/stats", async () => {
      const mockStats = { total: 12, open: 7, resolved: 5, avgResolutionDays: 3.2 };
      mockedApi.get.mockResolvedValue({ stats: mockStats });

      const result = await reportApi.stats();

      expect(mockedApi.get).toHaveBeenCalledWith("/reports/stats");
      expect(result).toEqual({ stats: mockStats });
    });
  });

  describe("get", () => {
    it("calls the per-report endpoint", async () => {
      const mockReport = { id: "r-5", title: "Street light broken" };
      mockedApi.get.mockResolvedValue({ report: mockReport });

      const result = await reportApi.get("r-5");

      expect(mockedApi.get).toHaveBeenCalledWith("/reports/r-5");
      expect(result).toEqual({ report: mockReport });
    });
  });

  describe("transition", () => {
    it("posts the new status and optional notes", async () => {
      const mockReport = { id: "r-5", status: "RESOLVED" };
      mockedApi.post.mockResolvedValue({ report: mockReport });

      await reportApi.transition("r-5", { toStatus: "RESOLVED", resolution: "Fixed by municipal team" });

      expect(mockedApi.post).toHaveBeenCalledWith("/reports/r-5/transition", {
        toStatus: "RESOLVED",
        resolution: "Fixed by municipal team",
      });
    });
  });

  describe("assign", () => {
    it("posts the assignment to the correct endpoint", async () => {
      const mockReport = { id: "r-5", assignedToId: "user-42" };
      mockedApi.post.mockResolvedValue({ report: mockReport });

      await reportApi.assign("r-5", "user-42");

      expect(mockedApi.post).toHaveBeenCalledWith("/reports/r-5/assign", { assignedToId: "user-42" });
    });
  });

  describe("remove", () => {
    it("deletes from the correct endpoint", async () => {
      mockedApi.delete.mockResolvedValue({ message: "Report deleted" });

      await reportApi.remove("r-5");

      expect(mockedApi.delete).toHaveBeenCalledWith("/reports/r-5");
    });
  });

  describe("uploadAttachment", () => {
    it("posts FormData with the file to the correct endpoint", async () => {
      const mockFile = new File(["fake pdf content"], "invoice.pdf", { type: "application/pdf" });
      const mockResult = { attachment: { id: "att-1", filename: "invoice.pdf" } };
      mockedApi.postForm.mockResolvedValue(mockResult);

      const result = await reportApi.uploadAttachment("r-5", mockFile);

      expect(mockedApi.postForm).toHaveBeenCalled();
      const [endpoint, formData] = mockedApi.postForm.mock.calls[0];
      expect(endpoint).toBe("/reports/r-5/attachments");
      expect(formData.get("file")).toBe(mockFile);
      expect(result).toEqual(mockResult);
    });
  });
});
